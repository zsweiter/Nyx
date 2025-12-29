import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react() as any, mkcert()],
	server: {
		port: 5000,
		strictPort: true,
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
