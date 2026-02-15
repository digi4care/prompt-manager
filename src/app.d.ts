// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: any; // Better Auth session (legacy)
			auth?: any; // Better Auth session wrapper
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
