// import dotenv from 'dotenv';
import { loadEnvFile } from 'node:process';
loadEnvFile(`${process.cwd()}/.env`);

export const config = {
    APP_SECRET: process.env.APP_SECRET || '',

    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_SCHEMA: process.env.DB_SCHEMA,

    JWT_ISSUER: process.env.JWT_ISSUER || 'silent',
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'silent',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '5h',

    CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || ['http://localhost:5173', 'https://localhost:5173'],
};
