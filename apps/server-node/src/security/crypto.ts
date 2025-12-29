import { eddsaAuth } from './eddsaAuth';
import { scrypt as _scrypt, timingSafeEqual, randomBytes, randomInt } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt);
const DEFAULT_N = 16384,
    DEFAULT_r = 8,
    DEFAULT_p = 1,
    DEFAULT_LEN = 64;

eddsaAuth.init().catch((err: any) => {
    console.error('Failed to initialize ECDSA authentication:', err);
    process.exit(1);
});

export const krypton = {
    /**
     * @param {string|Buffer} password
     */
    async make(password: string) {
        const salt = randomBytes(16);
        const hash = await scrypt(password, salt as any, DEFAULT_LEN);
        return [
            'scrypt',
            DEFAULT_N,
            DEFAULT_r,
            DEFAULT_p,
            salt.toString('base64'),
            Buffer.from(hash as any).toString('base64'),
        ].join('$');
    },
    /**
     * @param {string|Buffer} password
     * @param {string} stored
     */
    async compare(password: string, stored: string) {
        let validFormat = true;
        let N, r, p, salt, hash;

        try {
            const [algo, nStr, rStr, pStr, saltB64, hashB64] = (stored || '').split('$');
            if (algo !== 'scrypt') throw new Error('bad algo');

            N = parseInt(nStr, 10);
            r = parseInt(rStr, 10);
            p = parseInt(pStr, 10);
            if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) throw new Error('bad params');

            salt = Buffer.from(saltB64, 'base64');
            hash = Buffer.from(hashB64, 'base64');
            if (!salt.length || !hash.length) throw new Error('bad buffers');
        } catch {
            // Dummy params para igualar tiempo
            validFormat = false;
            N = DEFAULT_N;
            r = DEFAULT_r;
            p = DEFAULT_p;
            salt = randomBytes(16);
            hash = randomBytes(DEFAULT_LEN);
        }

        const derived = await scrypt(password, salt as any, hash.length);

        // Comparación constante SIEMPRE
        const equal = timingSafeEqual(derived as any, hash as any);

        return validFormat && equal;
    },
    /**
     * Generate unique ramdom numbers
     *
     * @param {number} [length=6] - The length of the random number to generate.
     * @return {Promise<number>}
     */
    async random(length: number = 6): Promise<number> {
        const min = Number('1' + '0'.repeat(length - 1));
        const max = Number('9'.repeat(length));

        return new Promise((resolve, reject) => {
            return randomInt(min, max, (err, data) => {
                return err ? reject(err) : resolve(data);
            });
        });
    },
    /**
     * Create ramdom bytes
     * @param {number} size
     * @return {Promise<Buffer>}
     */
    async randomBytes(size: number): Promise<Buffer> {
        return new Promise((res, rej) => {
            return randomBytes(size, (err, data) => (err ? rej(err) : res(data)));
        });
    },
};

export const jwtManager = {
    /**
     * @param {string|Buffer|object} payload
     * @param {object} options
     *
     * @returns {string|object}
     */
    async sign(payload: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<Record<string, any>> {
        return await eddsaAuth.sign(payload, options);
    },
    /**
     * @param {string} token
     * @param {object} options
     */
    verify: async (token: string, options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
        return await eddsaAuth.verify(token, options);
    },
    createSignedToken: async (user: Record<string, unknown> = {}, rbac: Record<string, unknown> = {}) => {
        const payload = structuredClone(user);
        delete payload.password;
        delete payload.password_hash;

        const tokenData = await eddsaAuth.sign(payload, { additionalClaims: { rbac } });
        return {
            ...tokenData,
            data: payload,
        };
    },
};
