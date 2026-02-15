import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExpertiseFile, parseExpertiseFile } from '$lib/server/services/expertise.service';

export const GET: RequestHandler = async ({ params }) => {
	const { domain } = params;

	if (!domain) {
		throw error(400, JSON.stringify({ message: 'Domain parameter is required', errors: null }));
	}

	try {
		const file = await getExpertiseFile(domain);
		if (!file) {
			throw error(404, JSON.stringify({ message: 'Expertise file not found', errors: null }));
		}

		const expertiseData = parseExpertiseFile(file);

		return json({
			data: {
				domain: file.domain,
				version: file.version,
				updatedAt: file.updatedAt,
				yamlContent: file.yamlContent,
				parsedData: expertiseData
			}
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch expertise file:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch expertise file', errors: null }));
	}
};
