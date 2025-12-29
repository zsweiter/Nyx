import * as jose from 'jose';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { HttpException } from './../exceptions';

const rootDir = path.resolve(__dirname, '../../');

const privateKeyPath = path.join(rootDir, 'ec-private.pem');
const publicKeyPath = path.join(rootDir, 'ec-public.pem');

let privateKey: jose.CryptoKey | null = null;
let publicKey: jose.CryptoKey | null = null;

export const eddsaAuth = {
    async init() {
        try {
            const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
            const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');

            privateKey = await jose.importPKCS8(privateKeyPem, 'EdDSA');
            publicKey = await jose.importSPKI(publicKeyPem, 'EdDSA');

            return true;
        } catch (error) {
            console.error('Error loading Ed25519 keys:', error);
            throw new Error('Failed to initialize EdDSA authentication');
        }
    },

    async sign(payload: Record<string, unknown>, options: Record<string, any> = {}) {
        if (!privateKey) await this.init();

        try {
            const tokenPayload = {
                sub: String(payload.id),
                email: payload.email,
                role: payload.role,
                ...options.additionalClaims,
            };

            const expiresIn = options.expiresIn || '5h';
            const expirationMs = typeof expiresIn === 'string' ? ms(expiresIn) : expiresIn;
            const expirationTime = Math.floor((Date.now() + expirationMs) / 1000);

            const jwt = await new jose.SignJWT(tokenPayload)
                .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
                .setIssuedAt()
                .setExpirationTime(expirationTime)
                .setIssuer(config.JWT_ISSUER)
                .setAudience(config.JWT_AUDIENCE)
                .sign(privateKey as jose.CryptoKey);

            return {
                access_token: jwt,
                token_type: 'Bearer',
                expires_at: expirationTime * 1000,
                expires_in: expirationMs / 1000,
            };
        } catch (error) {
            console.error('Error signing Ed25519 token:', error);
            throw new HttpException('Failed to generate authentication token', 500);
        }
    },

    async verify(token: string, options: Record<string, unknown> = {}) {
        if (!publicKey) await this.init();

        try {
            const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey as jose.CryptoKey, {
                issuer: config.JWT_ISSUER,
                audience: config.JWT_AUDIENCE,
                ...options,
            });

            return {
                header: protectedHeader,
                data: payload,
            };
        } catch (error) {
            if (error instanceof jose.errors.JWTExpired) {
                throw new HttpException('Token expired', 401);
            }
            if (error instanceof jose.errors.JWTInvalid) {
                throw new HttpException('Invalid token', 401);
            }

            console.error('Error verifying Ed25519 token:', error);
            throw new HttpException('Authentication failed', 401);
        }
    },
};

function ms(duration: string) {
    const match = /^(\d+)([smhdwMY])$/.exec(duration);
    if (!match) return 0;
    const [, value, unit] = match;
    const timeUnits = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        M: 30 * 24 * 60 * 60 * 1000,
        Y: 365 * 24 * 60 * 60 * 1000,
    };
    return parseInt(value) * (timeUnits as any)[unit];
}
