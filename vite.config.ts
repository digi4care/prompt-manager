import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		port: 45678,
		strictPort: true,
		host: '127.0.0.1'
	},
	preview: {
		port: 44678,
		strictPort: true,
		host: '127.0.0.1'
	},
	resolve: {
		alias: {
			ws: fileURLToPath(new URL('./tests/ws-shim.ts', import.meta.url))
		}
	},
	test: {
		server: {
			deps: {
				inline: ['ws', '@libsql/client']
			}
		}
	}
});
