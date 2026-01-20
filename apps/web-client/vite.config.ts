import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
	plugins: [react() as any],
	server: {
		port: 5000,
		strictPort: true,
		https: {
			key: fs.readFileSync(path.join(__dirname, '../../certs/localhost-key.pem')),
			cert: fs.readFileSync(path.join(__dirname, '../../certs/localhost.pem')),
		},
	},
	define: {
		__ENV__: JSON.stringify(process.env.NODE_ENV === 'development'),
		__DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
		global: 'globalThis',
	},
	resolve: {
		alias: {
			'@': '/src',
			'@shared': '/src/shared',
			'~/': '/src/assets',
		},
	},
});
