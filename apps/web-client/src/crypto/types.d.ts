export interface EncryptedFileMessage {
    name: string
    buffer: Blob
    mimeType: string
    size: number
    hash?: string
}

export interface DecryptedFile {
    file: File | Blob
    metadata: {
        name: string
        mimeType: string
        size: number
        timestamp: number
        senderId: string
    }
}

interface MessagePayload {
    content: string
    timestamp: number
    senderId: string
}

export interface Store {
    setup(): Promise<void>
    put(id: string, data: any): Promise<void>
    get<T = any>(id: string): Promise<T | null>
    delete(id: string): Promise<void>
    has(id: string): Promise<boolean>
    list(prefix?: string): Promise<string[]>
}

export type StoredKey =
    | {
          type: 'identity'
          publicJwk: JsonWebKey
          wrappedPrivateKey: string // stored as base64url
          iv: string // stored as base64url
      }
    | {
          type: 'shared'
          jwk: JsonWebKey
      }
    | {
          type: 'wrapping'
          jwk: JsonWebKey
      }
