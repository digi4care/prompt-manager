import { json } from '@sveltejs/kit';
import { checkOpencodeHealth } from '$lib/server/services/opencode.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await checkOpencodeHealth();
	return json(result, { status: result.healthy ? 200 : 503 });
};
