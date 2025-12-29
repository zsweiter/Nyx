export const generateFileURL = (filename?: string) => {
    if (!filename) return null;
    if (filename.substring(0, 4) === 'http') return filename;
    
    return 'https://localhost:3030/static/' + filename;
};

export const generateBlobURL = (filename?: string) => {
    return !filename ? null : 'https://localhost:3030/blobs/' + filename;
};

export const without = <T extends object = object>(obj: T, keys: Array<keyof T>) => {
    const copy = structuredClone(obj);
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
        // @ts-ignore
        delete copy[k];
    });

    return copy;
};

const INVALID_JSON_STRING = /^\s*["[{]|^\s*-?\d[\d.]{0,14}\s*$/;
const SUSPECT_PROTO =
    /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const SUSPECT_CONSTRUCTOR =
    /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;

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
        const seen = new WeakSet();

        const replacer = (_: any, value: any) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            } else if (typeof value === 'function') {
                return value.toString();
            } else if (typeof value === 'symbol') {
                return value.toString();
            }

            return value;
        };

        try {
            return JSON.stringify(data, replacer);
        } catch (error: any) {
            console.error(`Error al serializar el objeto: ${error.message}`);
            return _default;
        }
    },

    /**
     * Parse json with sanitity content
     *
     * @param value - string represent json or other type
     * @param strict - indicates validation is strict
     */
    parse: <F = any>(value: string, strict: boolean = false): F => {
        if (typeof value !== 'string') return value as F;

        const val = value.toLowerCase().trim();
        if (val === 'true') return true as F;
        if (val === 'false') return false as F;
        if (val === 'null') return null as F;
        if (val === 'nan') return Number.NaN as F;
        if (val === 'infinity') return Number.POSITIVE_INFINITY as F;
        if (val === 'undefined') return undefined as F;

        if (!INVALID_JSON_STRING.test(value)) {
            if (strict) {
                throw new SyntaxError('Invalid JSON');
            }
            return value as F;
        }

        try {
            if (SUSPECT_PROTO.test(value) || SUSPECT_CONSTRUCTOR.test(value)) {
                return JSON.parse(value, (key: any, value: any) => {
                    if (key === '__proto__') {
                        return;
                    }
                    if (key === 'constructor' && value && typeof value === 'object' && 'prototype' in value) {
                        return;
                    }
                    return value;
                });
            }
            return JSON.parse(value) as F;
        } catch (error) {
            if (strict) {
                throw error;
            }
            return value as F;
        }
    },
};
