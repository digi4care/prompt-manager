import { deLocalizeUrl } from '$lib/paraglide/runtime.js';
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = (request) => {
	return deLocalizeUrl(request.url).pathname;
};
