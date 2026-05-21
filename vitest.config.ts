import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'path';

const config = defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'node_modules/**'],
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		globals: true,
		deps: {
			inline: [
				'ws',
				'@libsql/client',
				'@libsql/client/node',
				'@libsql/isomorphic-ws',
				'@libsql/isomorphic-ws/node',
				'@libsql/isomorphic-ws/node.mjs'
			]
		}
	},
	resolve: {
		alias: [
			{
				find: '$env/static/private',
				replacement: resolve(__dirname, './tests/stubs/env-private.ts')
			},
			{
				find: '$lib',
				replacement: resolve(__dirname, './src/lib')
			},
			{
				find: '@libsql/isomorphic-ws/node',
				replacement: resolve(__dirname, './tests/ws-interop.ts')
			},
			{
				find: '@libsql/isomorphic-ws/node.mjs',
				replacement: resolve(__dirname, './tests/ws-interop.ts')
			},
			{
				find: '@libsql/isomorphic-ws/node.js',
				replacement: resolve(__dirname, './tests/ws-interop.ts')
			},
			{
				find: '@libsql/isomorphic-ws',
				replacement: resolve(__dirname, './tests/ws-interop.ts')
			},
			{
				find: '@libsql/client',
				replacement: '@libsql/client/node'
			},
			{
				find: 'ws',
				replacement: resolve(__dirname, './tests/ws-interop.ts')
			}
		]
	},
	optimizeDeps: {
		include: ['ws', '@libsql/client', '@libsql/isomorphic-ws']
	},
	ssr: {
		noExternal: ['ws', '@libsql/client', '@libsql/isomorphic-ws']
	}
} as any);

export default config;
