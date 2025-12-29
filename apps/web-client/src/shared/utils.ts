/**
 * Dtermine if prop is have in object
 *
 * @param obj The object to be checked
 * @param prop The prop to be checked
 */
export const hasOwnProperty = (obj: any, prop: PropertyKey): boolean => {
    return Object.prototype.hasOwnProperty.call(obj, prop)
}

/**
 * toString helper
 *
 * @param value
 */
export const toString = (value: any): string => Object.prototype.toString.call(value)

/**
 * Get real type of given value like Object, Number, Date or custom objects
 *
 * @param value The any value for get type
 */
export const getType = (value: any) => {
    return value === null ? 'Null' : value === undefined ? 'Undefined' : toString(value).slice(8, -1)
}

/**
 * Determine if given value is empty
 *
 * @param value The value for checking
 */
export const isEmpty = (value: any): boolean => {
    if (value == null) {
        return true
    }

    const type = getType(value)
    if (type === 'Array' || type === 'String' || hasOwnProperty(value, 'length')) {
        return value.length === 0
    }

    if (type === 'Map' || type === 'Set') {
        return value.size === 0
    }

    if (type === 'Object') {
        for (let key in value) {
            if (hasOwnProperty(value, key)) {
                return false
            }
        }
        return true
    }

    return !value
}

/**
 * Determine if given value is Nil (null|undefined)
 *
 * @param value - The value for test
 */
export const isNil = (value: any) => {
    return value === null || value === undefined
}

export type QuantumClassess = string | Record<string, any> | string[] | object[]

/**
 * Classes helper for write better classnames
 *
 * @param args - The classnames list
 * @return collection of classmames
 */
export const classes = (...args: QuantumClassess[]): string[] => {
    const store: string[] = []

    for (let i = 0, total = args.length; i < total; i++) {
        if (!args[i]) continue
        const current = args[i]

        if (typeof current === 'string') {
            store.push(current)
        } else if (Array.isArray(current)) {
            if (current.length) {
                const inner = classes.apply(null, current)
                if (inner) {
                    store.push(inner)
                }
            }
        } else if (typeof current === 'object') {
            if (current.toString !== Object.prototype.toString) {
                store.push(current.toString())
                continue
            }

            for (let key in current) {
                if (hasOwnProperty(current, key) && current[key]) {
                    store.push(key)
                }
            }
        }
    }

    return store
}

/**
 * Return joined classnames
 *
 * @param args - The classnames list
 * @returns joined classnames
 */
export const classnames = (...args: QuantumClassess[]): string => {
    return classes(...args).join(' ')
}

const internalUniqueId = () => {
    let count = 0
    return function (limit?: number, prefix?: string) {
        const hash = count++ + Math.floor((1 + Math.random()) * 0x10000).toString(16)
        const joined = `${prefix ? prefix + '-' : ''}${hash}`

        return limit ? joined.slice(0, limit) : joined
    }
}

/**
 * Generate unique key based in Date.now() and random number
 *
 * @param prefix The prefix for unique key
 * @returns Unique key
 */
export const generateId = internalUniqueId()

export const slugify = (str: string): string => {
    return str
        .replace(/^\s+|\s+$/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+|-+/g, '-')
}

export const promisify = <T = any>(handler: any): Promise<T> => {
    if (handler instanceof Promise) {
        return handler
    }

    if (typeof handler === 'function') {
        try {
            const result = handler()
            return result instanceof Promise ? result : Promise.resolve(result)
        } catch (error) {
            return Promise.reject(error)
        }
    }

    return Promise.resolve<T>(handler)
}

export const Arr = {
    /**
     * Checks if a given value is an array.
     *
     * @param {any} value - The value to check.
     */
    is: (value: any): boolean => {
        return getType(value) === 'Array'
    },

    /**
     * Wraps a value or an array of values into an array.
     *
     * @param {F | F[]} value - The value or array of values to wrap.
     */
    wrap: <F>(value: F | F[]): F[] => {
        return isNil(value) ? ([] as F[]) : ([].concat(value) as F[])
    },

    /**
     * Flattens an array up to a specified depth.
     *
     * @param {T} collect - The array to flatten.
     * @param {number} [depth=1] - The depth up to which the array should be flattened.
     */
    flatten: <T>(collect: T, depth?: number): Flatten<T, number extends typeof depth ? 1 : typeof depth> => {
        if (!Arr.is(collect)) {
            return [collect] as Flatten<T>
        }
        if (typeof Array.prototype.flat === 'function') {
            return (collect as any[]).flat(depth ?? 1) as Flatten<T, number extends typeof depth ? 1 : typeof depth>
        }

        return (collect as any[]).reduce((acc: any[], el: any) => {
            return acc.concat(depth !== undefined && Arr.is(el) ? Arr.flatten(el, depth - 1) : el)
        }, []) as Flatten<T, number extends typeof depth ? 1 : typeof depth>
    },

    /**
     * Flips an array or object, where the values become keys and the keys become values
     *
     * @param value - The array or object to flip.
     */
    flip: (value: Object | any[]) => {
        const flipped: Record<string, any> = {} as any
        const type = getType(value)
        if (type === 'Array') {
            for (let i = 0; i < (value as []).length; i++) {
                flipped[value[i]] = i
            }
        } else if (typeof value === 'object' && value !== null) {
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    flipped[value[key] as string] = key
                }
            }
        }

        return flipped
    },
    findLast: <T>(collect: T[], predicate: (item: T) => boolean): T | null => {
        // @ts-ignore
        if (typeof collect.findLast === 'function') {
            // @ts-ignore
            return collect.findLast(predicate)
        }

        let last = null
        collect.forEach(item => {
            if (predicate(item)) {
                last = item
            }
        })

        return last
    },
}

export const Obj = {
    pick: <T extends object>(obj: T, keys: (keyof T)[]) => {
        return keys.reduce((result, key) => {
            if (obj.hasOwnProperty(key)) {
                result[key] = obj[key]
            }
            return result
        }, {} as Partial<T>)
    },
    pickValues: <T extends object>(obj: T, keys: (keyof T)[]) => {
        return Object.values(Obj.pick(obj, keys)) as Array<T[keyof T]>
    },
    /**
     * Omit keys from value and return without key names
     *
     * @param obj The taregt value
     * @param keys
     */
    except: <T extends object>(obj: T, keys: (keyof T)[]) => {
        const result = { ...obj }

        for (const key of keys) {
            if (key in result) {
                delete result[key]
            }
        }

        return result
    },
}

export const timeout = (() => {
    /** @private */
    const MAX_INT = 2147483647
    const timeouts: Record<number, any> = {}
    let index = 1

    function set(callback: Function, ttl: number) {
        const id = index++
        ttl = Math.max(0, ttl)
        if (ttl > MAX_INT) {
            timeouts[id] = setTimeout(() => {
                set(callback, ttl - MAX_INT)
            }, MAX_INT)
        } else {
            timeouts[id] = setTimeout(() => {
                delete timeouts[id]
                callback()
            }, ttl)
        }

        return id
    }

    function clear(id: number) {
        if (timeouts[id]) {
            clearTimeout(timeouts[id])
            delete timeouts[id]
        }
    }

    return { set, clear }
})()

export const createRef = <R = any>(val: R = null as R): Ref<R> => ({
    current: val,
})

export const log = (type: 'info' | 'warning', label: string, callback?: () => void) => {
    const background =
        type === 'info'
            ? `background-color: rgba(102, 102, 102, 0.48); color: #2effc4;`
            : 'background-color: hsla(15, 80%, 50%, 0.7); color: #fff;'
    console.group(`%c${label}`, `${background} padding: 3px 5px; border-radius: 4px; font-weight: bold;`)
    callback && callback()
    console.groupEnd()
}
