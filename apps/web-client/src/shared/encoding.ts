import { Arr, hasOwnProperty, isEmpty, isNil } from './utils'

export function base64ToArrayBuffer(base64: string) {
    const binaryString = atob(base64)

    const length = binaryString.length
    const bytes = new Uint8Array(length)

    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
    const binaryString = String.fromCharCode(...new Uint8Array(buffer))
    return btoa(binaryString)
}

// ============================================================================================================================
// ================================================== JSON UTILITIES ==========================================================
// ============================================================================================================================

const INVALID_JSON_STRING = /^\s*["[{]|^\s*-?\d[\d.]{0,14}\s*$/
const SUSPECT_PROTO =
    /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/
const SUSPECT_CONSTRUCTOR =
    /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/

/**
 * The package provide stringify and parse Json options with safe verification
 *
 * @namespace Json
 */
export const Json = {
    /**
     * Transform javascrit object to string JSON with circular reference prevention
     *
     * @param data - The data for stringify
     * @param _default - The default value if stringify have a error
     */
    stringify: <T = any>(data: T, _default: string | null = null): string | null => {
        const seen = new WeakSet()

        const replacer = (_: any, value: any) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]'
                }
                seen.add(value)
            } else if (typeof value === 'function') {
                return value.toString()
            } else if (typeof value === 'symbol') {
                return value.toString()
            }

            return value
        }

        try {
            return JSON.stringify(data, replacer)
        } catch (error: any) {
            console.error(`Error al serializar el objeto: ${error.message}`)
            return _default
        }
    },

    /**
     * Parse json with sanitity content
     *
     * @param value - string represent json or other type
     * @param strict - indicates validation is strict
     */
    parse: <F = any>(value: string, strict: boolean = false): F => {
        if (typeof value !== 'string') return value as F

        const val = value.toLowerCase().trim()
        if (val === 'true') return true as F
        if (val === 'false') return false as F
        if (val === 'null') return null as F
        if (val === 'nan') return Number.NaN as F
        if (val === 'infinity') return Number.POSITIVE_INFINITY as F
        if (val === 'undefined') return undefined as F

        if (!INVALID_JSON_STRING.test(value)) {
            if (strict) {
                throw new SyntaxError('Invalid JSON')
            }
            return value as F
        }

        try {
            if (SUSPECT_PROTO.test(value) || SUSPECT_CONSTRUCTOR.test(value)) {
                return JSON.parse(value, (key: any, value: any) => {
                    if (key === '__proto__') {
                        return
                    }
                    if (key === 'constructor' && value && typeof value === 'object' && 'prototype' in value) {
                        return
                    }
                    return value
                })
            }
            return JSON.parse(value) as F
        } catch (error) {
            if (strict) {
                throw error
            }
            return value as F
        }
    },
}

// ============================================================================================================================
// =============================================== FORM-DATA UTILITIES ========================================================
// ============================================================================================================================

declare type FormDataType =
    | Record<string | number, any>
    | Array<Record<string | number, any>>
    | Array<number | string>
    | FormData

const recursiveMultipart = (data: any, key?: string | number, fd = new FormData(), seen = new WeakSet<any>()) => {
    if (seen.has(data)) return fd
    const type = typeof data

    if (type === 'object' && data !== null) {
        seen.add(data)
        if (Array.isArray(data)) {
            data.forEach((value, index) => {
                recursiveMultipart(value, `${key}[${index}]`, fd, seen)
            })
        } else {
            for (const prop in data) {
                if (hasOwnProperty(data, prop)) {
                    const value = data[prop]
                    recursiveMultipart(value, key ? `${key}[${prop}]` : prop, fd, seen)
                }
            }
        }
    } else {
        if (type === 'boolean') {
            fd.append(String(key || 0), data ? '1' : '0')
        } else {
            fd.append(String(key || 0), data.toString())
        }
    }

    return fd
}

/**
 * The FormData serializer and unserializer from complex JavaScript datatypes
 *
 * @namespace formData
 */
export const formData = {
    /**
     * Serialize given data into a FormData object.
     *
     * @param data The literal JavaScript object to serialize.
     */
    serialize: (data: FormDataType): FormData => {
        if (data instanceof FormData) {
            return data
        }

        if (isNil(data) || isEmpty(data)) {
            return new FormData()
        }

        return recursiveMultipart(data)
    },

    /**
     * Deserialize a FormData object into a JavaScript object.
     *
     * @param data The FormData object to deserialize.
     */
    unserialize: (data: FormData): Record<string | number, any> => {
        let result = {}
        for (const [key, value] of data) {
            const keys = key.split('.')
            let currentObj: Record<string, any> = result

            for (let i = 0; i < keys.length - 1; i++) {
                const currentKey = keys[i]
                currentObj[currentKey] = currentObj[currentKey] || {}
                currentObj = currentObj[currentKey]
            }

            const lastKey = keys[keys.length - 1]
            if (lastKey.endsWith('[]')) {
                const arrayKey = lastKey.slice(0, -2)
                currentObj[arrayKey] = currentObj[arrayKey] || []
                currentObj[arrayKey].push(value)
            } else {
                currentObj[lastKey] = value
            }
        }

        return result
    },
}

/**
 * The package for Base64 encoding and decoding.
 */
const BASE64_CHARS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
    'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
    'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a',
    'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
    't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1',
    '2', '3', '4', '5', '6', '7', '8', '9', '+',
    '/', '='
]; // prettier-ignore
const BASE64_CODES = Arr.flip(BASE64_CHARS)
const BASE64_REGEX = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/

const sanitizeBase64 = (s: string): string => s.replace(/[^A-Za-z0-9\+\/]/g, '')
const makeBase64UriSafe = (s: string): string => s.replace(/=/g, '').replace(/[+\/]/g, m0 => (m0 == '+' ? '-' : '_'))
const unwrapBase64Uri = (a: string): string => sanitizeBase64(a.replace(/[-_]/g, m0 => (m0 == '-' ? '+' : '/')))

/**
 * Base64 polyfill for the `btoa` function.
 *
 * @param {string} bin - The binary input string to encode.
 */
const btoaPolyfill = (bin: string): string => {
    let u32: number,
        c0: number,
        c1: number,
        c2: number,
        asc: string = ''
    const pad = bin.length % 3
    for (let i = 0; i < bin.length; ) {
        if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
            throw new TypeError('invalid character found')
        u32 = (c0 << 16) | (c1 << 8) | c2
        asc +=
            BASE64_CHARS[(u32 >> 18) & 63] +
            BASE64_CHARS[(u32 >> 12) & 63] +
            BASE64_CHARS[(u32 >> 6) & 63] +
            BASE64_CHARS[u32 & 63]
    }

    return pad ? asc.slice(0, pad - 3) + '==='.substring(pad) : asc
}

/**
 * Base64 polyfill for the `atob` function.
 *
 * @param {string} asc - The ASCII input string to decode.
 */
const atobPolyfill = (asc: string): string => {
    asc = asc.replace(/\s+/g, '')
    if (!BASE64_REGEX.test(asc)) throw new TypeError('malformed base64.')
    asc += '=='.slice(2 - (asc.length & 3))
    let u24: number,
        bin = '',
        r1: number,
        r2: number
    for (let i = 0; i < asc.length; ) {
        u24 =
            (BASE64_CODES[asc.charAt(i++)] << 18) |
            (BASE64_CODES[asc.charAt(i++)] << 12) |
            ((r1 = BASE64_CODES[asc.charAt(i++)]) << 6) |
            (r2 = BASE64_CODES[asc.charAt(i++)])
        bin +=
            r1 === 64
                ? String.fromCharCode((u24 >> 16) & 255)
                : r2 === 64
                ? String.fromCharCode((u24 >> 16) & 255, (u24 >> 8) & 255)
                : String.fromCharCode((u24 >> 16) & 255, (u24 >> 8) & 255, u24 & 255)
    }

    return bin
}

const _atob = typeof atob === 'function' ? (asc: string) => atob(sanitizeBase64(asc)) : atobPolyfill
const _btoa = typeof btoa === 'function' ? (bin: string) => btoa(bin) : btoaPolyfill

/**
 * Base64 utility functions for encoding and decoding.
 *
 * @namespace Base64
 */
export const Base64 = {
    /**
     * Encodes a string to Base64.
     *
     * @param {string} src - The input string to encode.
     * @param {boolean} [urlsafe=false] - Whether to make the output URL-safe.
     */
    encode: (src: string, urlsafe: boolean = false): string => {
        const source = _btoa(src)

        return urlsafe ? makeBase64UriSafe(source) : source
    },

    /**
     * Decodes a Base64-encoded string.
     *
     * @param {string} src - The Base64-encoded input string.
     */
    decode: (src: string): string => {
        return _atob(unwrapBase64Uri(src))
    },
}

// ============================================================================================================================
// ================================================== BUFFER CLASS ====================================================
// ============================================================================================================================

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const lookup = new Uint8Array(256)
for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i
}

function encodeBase64(bytes: Uint8Array): string {
    let i: number
    let len: number = bytes.length
    let base64: string = ''

    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2]
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)]
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)]
        base64 += chars[bytes[i + 2] & 63]
    }

    if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '='
    } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '=='
    }

    return base64
}

function decodeBase64(base64: string): ArrayBuffer {
    let bufferLength: number = base64.length * 0.75
    let len: number = base64.length
    let i: number
    let p: number = 0
    let encoded1: number, encoded2: number, encoded3: number, encoded4: number

    if (base64[base64.length - 1] === '=') {
        bufferLength--
        if (base64[base64.length - 2] === '=') {
            bufferLength--
        }
    }

    const arraybuffer = new ArrayBuffer(bufferLength)
    const bytes = new Uint8Array(arraybuffer)

    for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)]
        encoded2 = lookup[base64.charCodeAt(i + 1)]
        encoded3 = lookup[base64.charCodeAt(i + 2)]
        encoded4 = lookup[base64.charCodeAt(i + 3)]

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
    }

    return arraybuffer
}

function base64ToBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBase64(base64url: string): string {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
        base64 += '='
    }
    return base64
}

export type BufferEncoding = 'utf8' | 'utf-8' | 'base64' | 'base64url' | 'hex' | 'latin1' | 'binary'

export class Buffer {
    public uint8Array: Uint8Array

    constructor(
        input: number | string | ArrayBuffer | Uint8Array | number[] | Buffer = 0,
        encoding: BufferEncoding = 'utf8'
    ) {
        if (input instanceof Buffer) {
            this.uint8Array = new Uint8Array(input.uint8Array)
        } else if (typeof input === 'number') {
            this.uint8Array = new Uint8Array(input)
        } else if (typeof input === 'string') {
            this.uint8Array = Buffer._fromString(input, encoding)
        } else if (input instanceof ArrayBuffer) {
            this.uint8Array = new Uint8Array(input)
        } else if (input instanceof Uint8Array) {
            this.uint8Array = new Uint8Array(input)
        } else if (Array.isArray(input)) {
            this.uint8Array = new Uint8Array(input)
        } else {
            this.uint8Array = new Uint8Array(input as any)
        }
    }

    private static _fromString(str: string, encoding: string): Uint8Array {
        switch (encoding) {
            case 'utf8':
            case 'utf-8':
                return new TextEncoder().encode(str)
            case 'base64':
                return new Uint8Array(decodeBase64(str))
            case 'base64url':
                return new Uint8Array(decodeBase64(base64UrlToBase64(str)))
            case 'hex':
                if (str.length % 2 !== 0) throw new Error('Invalid hex string')
                const len = str.length / 2
                const bytes = new Uint8Array(len)
                for (let i = 0; i < len; i++) {
                    const byteVal = parseInt(str.substring(i * 2, i * 2 + 2), 16)
                    if (Number.isNaN(byteVal)) throw new Error('Invalid hex character')
                    bytes[i] = byteVal
                }
                return bytes
            case 'latin1':
            case 'binary':
                const latinBytes = new Uint8Array(str.length)
                for (let i = 0; i < str.length; i++) {
                    latinBytes[i] = str.charCodeAt(i) & 0xff
                }
                return latinBytes
            default:
                throw new Error(`Unsupported encoding: ${encoding}`)
        }
    }

    static from(
        input: string | ArrayBuffer | Uint8Array | number[] | Buffer,
        encoding: BufferEncoding = 'utf8'
    ): Buffer {
        return new Buffer(input, encoding)
    }

    static alloc(size: number, fill: number | string | Buffer = 0, encoding: BufferEncoding = 'utf8'): Buffer {
        const buf = new Buffer(size)
        if (fill !== 0) {
            buf.fill(fill, 0, buf.length, encoding)
        }
        return buf
    }

    static allocUnsafe(size: number): Buffer {
        return new Buffer(size)
    }

    static concat(buffers: (Buffer | Uint8Array)[], totalLength?: number): Buffer {
        if (typeof totalLength === 'undefined') {
            totalLength = buffers.reduce((sum, b) => sum + (b instanceof Buffer ? b.length : b.length), 0)
        }

        const result = Buffer.allocUnsafe(totalLength)
        let offset = 0

        for (const buf of buffers) {
            const raw: Uint8Array = buf instanceof Buffer ? buf.uint8Array : buf
            result.uint8Array.set(raw, offset)
            offset += raw.length
        }
        return result
    }

    toString(encoding: BufferEncoding = 'utf8', start = 0, end = this.uint8Array.length): string {
        if (start < 0) start = 0
        if (end > this.uint8Array.length) end = this.uint8Array.length
        if (start >= end) return ''

        const slice = this.uint8Array.subarray(start, end)

        switch (encoding) {
            case 'utf8':
            case 'utf-8':
                return new TextDecoder('utf-8').decode(slice)
            case 'base64':
                return encodeBase64(slice)
            case 'base64url':
                return base64ToBase64Url(encodeBase64(slice))
            case 'hex':
                return Array.from(slice)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
            case 'latin1':
            case 'binary':
                let res = ''
                const chunk = 8192
                for (let i = 0; i < slice.length; i += chunk) {
                    res += String.fromCharCode.apply(null, slice.subarray(i, i + chunk) as unknown as number[])
                }
                return res
            default:
                throw new Error(`Unsupported encoding: ${encoding}`)
        }
    }

    write(string: string, offset = 0, length?: number, encoding: BufferEncoding = 'utf8'): number {
        const sourceBuf = Buffer.from(string, encoding)
        const source = sourceBuf.uint8Array

        const remaining = this.uint8Array.length - offset

        if (length === undefined || length > source.length) {
            length = source.length
        }

        if (length > remaining) {
            length = remaining
        }

        if (length <= 0) return 0

        this.uint8Array.set(source.subarray(0, length), offset)
        return length
    }

    slice(start?: number, end?: number): Buffer {
        const newView = this.uint8Array.subarray(start, end)
        const buf = new Buffer(0)
        buf.uint8Array = newView
        return buf
    }

    subarray(start?: number, end?: number): Uint8Array {
        return this.uint8Array.subarray(start, end)
    }

    copy(target: Buffer | Uint8Array, targetStart = 0, start = 0, end = this.uint8Array.length): number {
        if (start < 0) start = 0
        if (end > this.uint8Array.length) end = this.uint8Array.length
        if (start >= end) return 0

        const targetLen = target instanceof Buffer ? target.length : target.length
        if (targetStart >= targetLen) return 0

        const source = this.uint8Array.subarray(start, end)
        const bytesToCopy = Math.min(source.length, targetLen - targetStart)

        if (target instanceof Buffer) {
            target.uint8Array.set(source.subarray(0, bytesToCopy), targetStart)
        } else {
            target.set(source.subarray(0, bytesToCopy), targetStart)
        }

        return bytesToCopy
    }

    fill(
        value: number | string | Buffer | Uint8Array,
        start = 0,
        end = this.uint8Array.length,
        encoding: BufferEncoding = 'utf8'
    ): this {
        if (start < 0) start = 0
        if (end > this.uint8Array.length) end = this.uint8Array.length
        if (start >= end) return this

        if (typeof value === 'string') {
            value = Buffer.from(value, encoding)
        }

        if (value instanceof Buffer || value instanceof Uint8Array) {
            const valBuffer = value instanceof Buffer ? value.uint8Array : value
            if (valBuffer.length === 0) return this

            const len = valBuffer.length
            for (let i = start; i < end; i++) {
                this.uint8Array[i] = valBuffer[(i - start) % len]
            }
        } else if (typeof value === 'number') {
            this.uint8Array.fill(value, start, end)
        }

        return this
    }

    equals(other: Buffer | Uint8Array): boolean {
        const otherArr = other instanceof Buffer ? other.uint8Array : other

        if (this.uint8Array.length !== otherArr.length) return false

        for (let i = 0; i < this.uint8Array.length; i++) {
            if (this.uint8Array[i] !== otherArr[i]) return false
        }
        return true
    }

    readUInt8(offset = 0): number {
        return this.uint8Array[offset]
    }
    readUInt16BE(offset = 0): number {
        return (this.uint8Array[offset] << 8) | this.uint8Array[offset + 1]
    }
    readUInt32BE(offset = 0): number {
        return (
            ((this.uint8Array[offset] << 24) |
                (this.uint8Array[offset + 1] << 16) |
                (this.uint8Array[offset + 2] << 8) |
                this.uint8Array[offset + 3]) >>>
            0
        )
    }
    writeUInt8(value: number, offset = 0): number {
        this.uint8Array[offset] = value
        return offset + 1
    }
    writeUInt16BE(value: number, offset = 0): number {
        this.uint8Array[offset] = value >>> 8
        this.uint8Array[offset + 1] = value
        return offset + 2
    }
    writeUInt32BE(value: number, offset = 0): number {
        this.uint8Array[offset] = value >>> 24
        this.uint8Array[offset + 1] = value >>> 16
        this.uint8Array[offset + 2] = value >>> 8
        this.uint8Array[offset + 3] = value
        return offset + 4
    }

    public get length(): number {
        return this.uint8Array.length
    }
    public get buffer(): ArrayBufferLike {
        return this.uint8Array.buffer
    }
    public get byteLength(): number {
        return this.uint8Array.byteLength
    }
    public arrayBuffer(): ArrayBuffer {
        return this.uint8Array.buffer as ArrayBuffer
    }
    public Uint8Array(): Uint8Array {
        return this.uint8Array
    }
    public get byteOffset(): number {
        return this.uint8Array.byteOffset
    }

    get(index: number): number | undefined {
        return this.uint8Array[index]
    }
    set(index: number, value: number): void {
        this.uint8Array[index] = value
    }

    toJSON(): { type: 'Buffer'; data: number[] } {
        return { type: 'Buffer', data: Array.from(this.uint8Array) }
    }
}
