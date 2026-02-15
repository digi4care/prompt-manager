import { createOpencodeClient } from '@opencode-ai/sdk';
import { OPENCODE_BASE_URL } from '$lib/server/config/opencode';

export function getOpencodeClient(baseUrl: string = OPENCODE_BASE_URL) {
	return createOpencodeClient({ baseUrl });
}
