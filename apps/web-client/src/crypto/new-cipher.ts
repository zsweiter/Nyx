import { Buffer, Json } from '@/shared/encoding'
import { Store, StoredKey } from '@/crypto/types'

export class IndexedDBStore implements Store {
    private db!: IDBDatabase
    private readonly version = 1

    public constructor(private readonly dbName: string = 'e2ee-store') {}

    public async setup(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version)

            request.onupgradeneeded = () => {
                const db = request.result
                if (!db.objectStoreNames.contains('keys')) {
                    db.createObjectStore('keys', { keyPath: 'id' })
                }
            }

            request.onsuccess = () => {
                this.db = request.result
                resolve()
            }

            request.onerror = () => reject(request.error)
        })
    }

    public async put(id: string, data: any): Promise<void> {
        const tx = this.db.transaction('keys', 'readwrite')
        const store = tx.objectStore('keys')
        store.put({ id, data })

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    }

    public async get<T = any>(id: string): Promise<T | null> {
        const tx = this.db.transaction('keys', 'readonly')
        const store = tx.objectStore('keys')
        const request = store.get(id)

        return new Promise(resolve => {
            request.onsuccess = () => resolve(request.result?.data ?? null)
            request.onerror = () => resolve(null)
        })
    }

    public async delete(id: string): Promise<void> {
        const tx = this.db.transaction('keys', 'readwrite')
        const store = tx.objectStore('keys')
        store.delete(id)

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    }

    public async has(id: string): Promise<boolean> {
        const data = await this.get(id)
        return data !== null
    }

    public async list(prefix?: string): Promise<string[]> {
        const tx = this.db.transaction('keys', 'readonly')
        const store = tx.objectStore('keys')
        const request = store.getAllKeys()

        return new Promise(resolve => {
            request.onsuccess = () => {
                const keys = request.result as string[]
                if (prefix) {
                    resolve(keys.filter(key => key.startsWith(prefix)))
                } else {
                    resolve(keys)
                }
            }
            request.onerror = () => resolve([])
        })
    }
}

export class Cipher {
    private identity!: CryptoKeyPair
    private wrappingKey!: CryptoKey
    private store: Store
    private initialized: boolean = false
    private keyCache: Map<string, CryptoKey> = new Map()
    private IV_LENGTH = 12

    private ENCRYPTION_ALGO = 'AES-GCM'

    private protocol = {
        /**
         * Packs [IV (12 bytes) + CIPHERTEXT] into a Uint8Array
         */
        pack: (iv: Uint8Array, ciphertext: ArrayBuffer): Uint8Array => {
            const packed = new Uint8Array(iv.length + ciphertext.byteLength)
            packed.set(iv, 0)
            packed.set(new Uint8Array(ciphertext), iv.length)
            return packed
        },

        /**
         * Unpacks [IV (12 bytes) + CIPHERTEXT] from a Uint8Array
         */
        unpack: (packed: Uint8Array | ArrayBuffer): { iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer } => {
            const buffer = packed instanceof Uint8Array ? packed : new Uint8Array(packed)
            if (packed.byteLength < this.IV_LENGTH) throw new Error('Invalid message length')

            const iv = buffer.slice(0, this.IV_LENGTH)
            const ciphertext = buffer.slice(this.IV_LENGTH)

            return { iv, ciphertext: ciphertext.buffer }
        },
    }

    constructor(store: Store) {
        this.store = store
    }

    public async init(password?: string): Promise<void> {
        if (this.initialized) return

        await this.store.setup()

        // Initialize with password or basic wrapping key
        if (password) {
            await this.initWithPassword(password)
        } else {
            await this.initBasic()
        }

        await this.loadOrCreateIdentity()
        this.initialized = true
    }

    /**
     * Initializes the cipher with a basic wrapping key
     */
    private async initBasic(): Promise<void> {
        const stored = await this.store.get<StoredKey>('wrapping-key')

        if (stored && stored.type === 'wrapping') {
            this.wrappingKey = await crypto.subtle.importKey(
                'jwk',
                stored.jwk,
                { name: 'AES-GCM', length: 256 },
                true,
                ['wrapKey', 'unwrapKey']
            )
        } else {
            this.wrappingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
                'wrapKey',
                'unwrapKey',
            ])

            await this.store.put('wrapping-key', {
                type: 'wrapping',
                jwk: await this.exportKey(this.wrappingKey),
            })
        }
    }

    private async initWithPassword(password: string): Promise<void> {
        const storedSalt = await this.store.get<{ salt: string }>('salt')
        let salt: Uint8Array

        if (storedSalt) {
            // Salt for password saved as base64url
            salt = Buffer.from(storedSalt.salt, 'base64url').uint8Array
        } else {
            salt = crypto.getRandomValues(new Uint8Array(32))
            await this.store.put('salt', {
                salt: Buffer.from(salt).toString('base64url'),
            })
        }

        this.wrappingKey = await this.deriveKeyFromPassword(password, salt)
    }

    private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const passwordKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
            'deriveKey',
        ])

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt as any,
                iterations: 600000,
                hash: 'SHA-256',
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['wrapKey', 'unwrapKey']
        )
    }

    private async loadOrCreateIdentity(): Promise<void> {
        const stored = await this.store.get<StoredKey>('identity')

        // Generate new identity if not found
        if (!stored || stored.type !== 'identity') {
            const pair = await this.generateKeyPair()
            const { encoded } = await this.wrapPrivateKey(pair.privateKey, this.wrappingKey)

            await this.store.put('identity', {
                type: 'identity',
                publicJwk: await this.exportKey(pair.publicKey),
                wrappedPrivateKey: encoded.key,
                iv: encoded.iv,
            })

            this.identity = pair

            return
        }

        try {
            const privateKey = await this.unwrapPrivateKey(this.wrappingKey, stored.wrappedPrivateKey, stored.iv)

            this.identity = {
                publicKey: await this.importPublicKey(stored.publicJwk),
                privateKey,
            }
        } catch (error) {
            console.error(error)
            throw new Error('Failed to unlock identity. Wrong password?')
        }
    }

    public async exportPublicKey(): Promise<string> {
        const publicJwk = await this.exportKey(this.identity.publicKey)
        return Buffer.from(Json.stringify(publicJwk)).toString('base64url')
    }

    public async exportFingerprint(): Promise<string> {
        const publicJwk = await this.exportKey(this.identity.publicKey)
        const keyData = new TextEncoder().encode(Json.stringify(publicJwk))
        const hash = await crypto.subtle.digest('SHA-256', keyData)
        const bytes = new Uint8Array(hash)

        return Array.from(bytes.slice(0, 16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
            .match(/.{1,4}/g)!
            .join(' ')
    }

    /**
     * Registers a peer's public key
     *
     * @param peerId The id of peer
     * @param publicKey The public key of peer (base64url)
     */
    public async registerPeerPublicKey(peerId: string, publicKey: string): Promise<void> {
        if (await this.store.has(peerId)) {
            return // Already registered
        }

        const publicJwk = Json.parse<JsonWebKey>(Buffer.from(publicKey, 'base64url').toString('utf-8'))
        const peerPublicKey = await this.importPublicKey(publicJwk)
        const sharedKey = await this.derivePeerKey(peerPublicKey)

        await this.store.put(peerId, {
            type: 'shared',
            jwk: await this.exportKey(sharedKey),
        })

        this.keyCache.set(peerId, sharedKey)
    }

    public async removePeer(peerId: string): Promise<void> {
        this.keyCache.delete(peerId)
        await this.store.delete(peerId)
    }

    public async hasPeer(peerId: string): Promise<boolean> {
        return this.store.has(peerId)
    }

    /**
     * Retrieves a peer's key from the store
     *
     * @param peerId
     */
    public async getPeerKey(peerId: string): Promise<CryptoKey> {
        const cached = this.keyCache.get(peerId)
        if (cached) return cached

        const stored = await this.store.get<StoredKey>(peerId)
        if (!stored || stored.type !== 'shared') {
            throw new Error(`Peer "${peerId}" not registered. Call registerPeer() first.`)
        }

        const key = await this.importPeerKey(stored.jwk)

        this.keyCache.set(peerId, key)
        return key
    }

    /**
     * Encrypts a text message for a specific peer
     *
     * @param plainText
     * @param peerId
     */
    public async encryptText(plainText: string, peerId: string): Promise<string> {
        const key = await this.getPeerKey(peerId)
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
        const ciphertext = await crypto.subtle.encrypt(
            { name: this.ENCRYPTION_ALGO, iv },
            key,
            new TextEncoder().encode(plainText)
        )

        return Buffer.from(this.protocol.pack(iv, ciphertext)).toString('base64url')
    }

    /**
     * Decrypts a text message from a specific peer
     *
     * @param encryptedBase64Url
     * @param peerId
     */
    public async decryptText(encryptedBase64Url: string, peerId: string): Promise<string> {
        const peerKey = await this.getPeerKey(peerId)

        const buffered = Buffer.from(encryptedBase64Url, 'base64url').arrayBuffer()

        const { iv, ciphertext } = this.protocol.unpack(buffered)
        const decrypted = await crypto.subtle.decrypt({ name: this.ENCRYPTION_ALGO, iv }, peerKey, ciphertext)

        return Buffer.from(decrypted).toString('utf-8')
    }

    /**
     * Encrypts a file for a specific peer
     *
     * @param file
     * @param peerId
     */
    public async encryptFile(file: File, meta: Record<string, any>, peerId: string): Promise<ArrayBuffer> {
        const peerKey = await this.getPeerKey(peerId)

        const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
        const fileBuffer = await file.arrayBuffer()

        const fullMeta = {
            name: file.name,
            mime: file.type || 'application/octet-stream',
            size: file.size,
            ...meta,
        }

        const metaBytes = new TextEncoder().encode(JSON.stringify(fullMeta))

        const metaLenBuffer = new ArrayBuffer(4)
        const metaLenView = new DataView(metaLenBuffer)
        metaLenView.setUint32(0, metaBytes.byteLength, false)

        const payload = this.concatBuffers(metaLenBuffer, metaBytes.buffer, fileBuffer)

        const ciphertext = await crypto.subtle.encrypt({ name: this.ENCRYPTION_ALGO, iv }, peerKey, payload)

        return this.concatBuffers(iv.buffer, ciphertext).buffer
    }

    /**
     * Decrypts a file from a specific peer
     *
     * @param message
     * @param peerId
     */
    public async decryptFile(bin: ArrayBuffer | Uint8Array, peerId: string): Promise<File> {
        const peerKey = await this.getPeerKey(peerId)

        const { iv, ciphertext } = this.protocol.unpack(bin)

        const decrypted = await crypto.subtle.decrypt({ name: this.ENCRYPTION_ALGO, iv }, peerKey, ciphertext)

        const view = new DataView(decrypted)
        const metaLen = view.getUint32(0, false)

        const metaStart = 4
        const metaEnd = metaStart + metaLen

        if (metaEnd > decrypted.byteLength) {
            throw new Error(`Invalid metadata length: ${metaLen}, buffer size: ${decrypted.byteLength}`)
        }

        const meta = JSON.parse(new TextDecoder().decode(decrypted.slice(metaStart, metaEnd)))

        const data = decrypted.slice(metaEnd)

        return new File([data], meta.name ?? 'file', { type: meta.mime ?? 'application/octet-stream' })
    }

    /**
     * Creates a backup of the identity key
     *
     * @param password
     */
    public async createBackup(password: string): Promise<string> {
        const salt = crypto.getRandomValues(new Uint8Array(32))
        const backupKey = await this.deriveKeyFromPassword(password, salt)

        const identity = await this.store.get<StoredKey>('identity')
        if (!identity || identity.type !== 'identity') {
            throw new Error('No identity found')
        }

        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encryptedBackup = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            backupKey,
            new TextEncoder().encode(
                Json.stringify({
                    wrappedPrivateKey: identity.wrappedPrivateKey,
                    wrappingIv: identity.iv,
                    publicKey: identity.publicJwk,
                })
            )
        )

        const recoveryPackage = {
            version: 1,
            salt: Buffer.from(salt).toString('base64url'),
            iv: Buffer.from(iv).toString('base64url'),
            data: Buffer.from(encryptedBackup).toString('base64url'),
            publicKey: await this.exportPublicKey(),
            createdAt: new Date().toISOString(),
        }

        // El backup completo se exporta como string base64url
        return Buffer.from(Json.stringify(recoveryPackage)).toString('base64url')
    }

    public async restoreBackup(backupCode: string, password: string): Promise<boolean> {
        try {
            const pkgStr = Buffer.from(backupCode, 'base64url').toString('utf-8')
            const pkg = Json.parse(pkgStr)

            const salt = Buffer.from(pkg.salt, 'base64url').uint8Array
            const backupKey = await this.deriveKeyFromPassword(password, salt)

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: Buffer.from(pkg.iv, 'base64url').Uint8Array() as any,
                },
                backupKey,
                Buffer.from(pkg.data, 'base64url').Uint8Array() as any
            )

            const identityData = Json.parse(new TextDecoder().decode(decrypted))

            await this.store.put('identity', {
                type: 'identity',
                publicJwk: identityData.publicKey,
                wrappedPrivateKey: identityData.wrappedPrivateKey,
                iv: identityData.wrappingIv,
            })

            await this.loadOrCreateIdentity()
            return true
        } catch (error) {
            console.error('Restore failed:', error)
            return false
        }
    }

    public isReady(): boolean {
        return this.initialized
    }

    public clearCache(): void {
        this.keyCache.clear()
    }

    private async derivePeerKey(peerPublicKey: CryptoKey): Promise<CryptoKey> {
        return crypto.subtle.deriveKey(
            { name: 'ECDH', public: peerPublicKey },
            this.identity.privateKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        )
    }

    private async importPeerKey(jwk: JsonWebKey) {
        return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
    }

    private exportKey(key: CryptoKey): Promise<JsonWebKey> {
        return crypto.subtle.exportKey('jwk', key)
    }

    private importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
        return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
    }

    private generateKeyPair(): Promise<CryptoKeyPair> {
        return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
    }

    private async wrapPrivateKey(privateKey: CryptoKey, wrappingKey: CryptoKey) {
        const wrapIv = crypto.getRandomValues(new Uint8Array(12))

        const wrappedPrivateKey = await crypto.subtle.wrapKey('jwk', privateKey, wrappingKey, {
            name: 'AES-GCM',
            iv: wrapIv,
            tagLength: 128,
        })

        return {
            key: wrappedPrivateKey,
            iv: wrapIv,
            encoded: {
                key: Buffer.from(wrappedPrivateKey).toString('base64'),
                iv: Buffer.from(wrapIv).toString('base64'),
            },
        }
    }

    private async unwrapPrivateKey(wrappingKey: CryptoKey, wrappedPrivateKey: string, iv: string) {
        const wrapIv = Buffer.from(iv, 'base64').arrayBuffer()

        const unwrappedPrivateKey = await crypto.subtle.unwrapKey(
            'jwk',
            Buffer.from(wrappedPrivateKey, 'base64').arrayBuffer(),
            wrappingKey,
            { name: 'AES-GCM', iv: wrapIv, tagLength: 128 },
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            ['deriveKey']
        )

        return unwrappedPrivateKey
    }

    // Utils
    private concatBuffers(...buffers: ArrayBuffer[]): Uint8Array<ArrayBuffer> {
        const total = buffers.reduce((s, b) => s + b.byteLength, 0)
        const out = new Uint8Array(total)
        let offset = 0

        for (const b of buffers) {
            out.set(new Uint8Array(b), offset)
            offset += b.byteLength
        }

        return out
    }
}

export const cipher = new Cipher(new IndexedDBStore())
