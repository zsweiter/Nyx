/**
 * Utils type
 */
declare type Flatten<T, D extends number = 1> = T extends any[]
    ? D extends 0
        ? T
        : T extends (infer U)[]
        ? Flatten<U, D extends 1 ? 0 : D>[]
        : T
    : T

declare type Ref<F = any> = {
    current: F | null
}

declare type ButtonEventMap = {
    onClick?: (event: MouseEvent) => any
    onMouseEnter?: (event: MouseEvent) => void
    onMouseLeave?: (event: MouseEvent) => void
    onFocus?: (event: FocusEvent) => void
    onBlur?: (event: FocusEvent) => void
}

// Type definitions for form-data
declare type FormDataType =
    | Record<string | number, any>
    | Array<Record<string | number, any>>
    | Array<number | string>
    | FormData

declare type EventHandler = (this: HTMLElement, event: Event, element: HTMLElement) => void

declare interface HTMLElementEventTarget extends HTMLElement {
    events: {
        [key: string]: EventHandler | ((event: Event) => void)
    }
}

/**
 * Cache storage interface
 */
declare interface CacheStorage {
    /**
     * Set given key with value into cache
     *
     * @param key - The human cache key
     * @param value - The value for stored
     * @param ttl - The time to live in seconds
     */
    set(key: string, value: any, ttl?: number | CacheOptions = {}): void

    /**
     * Get given key from cache
     *
     * @param key - The human cache key
     */
    get(key: string): any

    /**
     * Get given key from cache or fetch it using the provided fetcher function
     *
     * @param key - The human cache key
     * @param fetcher - The function to fetch data if not found in cache
     */
    getOrFetch(key: string, fetcher: CacheFetcher): Promise<any>

    /**
     * Determine given key as found in cache
     *
     * @param key - The human cache key
     */
    has(key: string): boolean

    /**
     * Remove given key from cache
     *
     * @param key - The human cache key
     */
    delete(key: string): void

    /**
     * Clear all cache
     */
    clear(): void
}

declare type CacheFetcher<F = any> = () => F | Promise<F>

declare type CacheBucket = {
    exp: number
    v: any
}

declare type CacheOptions = {
    exp?: number
    autoexpire?: boolean
    encoded?: boolean
}

declare type CacheEvents = Record<'set' | 'delete' | 'clear' | 'expire' | 'update' | 'renovate', Function[]>

declare interface CacheStorageOptions {
    name: string
    storage?: Storage
    expiry?: number
    autoexpiration?: boolean
}

// Events
declare type EventEmitterFunc<P> = (payload: P) => void

declare type EventEmitterMap<T extends Record<any, any>> = Record<keyof T, Record<string, EventEmitterFunc<T[keyof T]>>>

declare type SingleOrArray<T> = T | T[]

// HTML
declare type ElementProps = {
    class?: string
    children?: ElementChild | ElementChild[]
    html?: string
    ref?: Ref<HTMLElement | SVGElement | null>
    style?: Partial<CSSStyleDeclaration & { [key: string]: string | number }>
    transition?: string
} & { [key: string]: any }

declare type ElementChild = string | HTMLElement | SVGElement | Text

declare type ElementTag<K extends keyof HTMLElementTagNameMap | `svg:${keyof SVGElementTagNameMap}`> =
    K extends keyof HTMLElementTagNameMap
        ? HTMLElementTagNameMap[K] & { transition?: TransitionElement }
        : K extends `svg:${infer Element}`
        ? Element extends keyof SVGElementTagNameMap
            ? SVGElementTagNameMap[Element]
            : never
        : never

declare interface TransitionElement {
    enter(start?: () => void, end?: () => void): void
    leave(start?: () => void, end?: () => void): void
}

declare interface AnimateOptions {
    name?: string
    mode?: 'out-in' | 'in-out'
}
