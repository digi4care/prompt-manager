import type { RequestHandler } from './$types';
import { getExpertiseFile, parseExpertiseFile } from '$lib/server/services/expertise.service';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

export const GET: RequestHandler = async ({ params }) => {
	const { domain } = params;

	try {
		const file = await getExpertiseFile(domain);
		if (!file) {
			apiFail('Expertise file not found', 404);
		}

		const expertiseData = parseExpertiseFile(file);

		return apiSuccess({
			domain: file.domain,
			version: file.version,
			updatedAt: file.updatedAt,
			yamlContent: file.yamlContent,
			parsedData: expertiseData
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch expertise file:', err);
		apiFail('Failed to fetch expertise file', 500);
	}
};
