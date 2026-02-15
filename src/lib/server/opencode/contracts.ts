export class OpencodeContractError extends Error {
	name = 'OpencodeContractError';
}

export type ImproveVariant = {
	version?: string;
	changes?: string;
	prompt: string;
};

export type ImproveAgentResponse = {
	improvements: ImproveVariant[];
};

export type JudgeCriteria = {
	clarity: number;
	specificity: number;
	structure: number;
	constraints: number;
};

export type JudgeAgentResponse = {
	score: number;
	criteria: JudgeCriteria;
	gaps: string[];
	recommendations: string[];
	summary?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function isNumber(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v);
}

function isString(v: unknown): v is string {
	return typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
	return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

export function parseImproveAgentResponse(payload: unknown): ImproveAgentResponse {
	if (!isRecord(payload)) {
		throw new OpencodeContractError('Improve agent response must be an object');
	}

	const improvements = payload.improvements;
	if (!Array.isArray(improvements)) {
		throw new OpencodeContractError('Improve agent response.improvements must be an array');
	}

	const parsed: ImproveVariant[] = improvements.map((item, idx) => {
		if (!isRecord(item)) {
			throw new OpencodeContractError(`Improve improvements[${idx}] must be an object`);
		}
		if (!isString(item.prompt)) {
			throw new OpencodeContractError(`Improve improvements[${idx}].prompt must be a string`);
		}
		const out: ImproveVariant = { prompt: item.prompt };
		if (item.version !== undefined) {
			if (!isString(item.version)) {
				throw new OpencodeContractError(`Improve improvements[${idx}].version must be a string`);
			}
			out.version = item.version;
		}
		if (item.changes !== undefined) {
			if (!isString(item.changes)) {
				throw new OpencodeContractError(`Improve improvements[${idx}].changes must be a string`);
			}
			out.changes = item.changes;
		}
		return out;
	});

	if (parsed.length === 0) {
		throw new OpencodeContractError('Improve agent must return at least one improvement');
	}

	return { improvements: parsed };
}

export function parseJudgeAgentResponse(payload: unknown): JudgeAgentResponse {
	if (!isRecord(payload)) {
		throw new OpencodeContractError('Judge agent response must be an object');
	}

	if (!isNumber(payload.score)) {
		throw new OpencodeContractError('Judge agent response.score must be a number');
	}
	if (!isRecord(payload.criteria)) {
		throw new OpencodeContractError('Judge agent response.criteria must be an object');
	}

	const criteria = payload.criteria;
	const required: Array<keyof JudgeCriteria> = [
		'clarity',
		'specificity',
		'structure',
		'constraints'
	];
	for (const k of required) {
		if (!isNumber(criteria[k])) {
			throw new OpencodeContractError(`Judge agent criteria.${k} must be a number`);
		}
	}

	if (!isStringArray(payload.gaps)) {
		throw new OpencodeContractError('Judge agent response.gaps must be a string[]');
	}
	if (!isStringArray(payload.recommendations)) {
		throw new OpencodeContractError('Judge agent response.recommendations must be a string[]');
	}
	if (payload.summary !== undefined && !isString(payload.summary)) {
		throw new OpencodeContractError('Judge agent response.summary must be a string');
	}

	return {
		score: payload.score,
		criteria: {
			clarity: criteria.clarity as number,
			specificity: criteria.specificity as number,
			structure: criteria.structure as number,
			constraints: criteria.constraints as number
		},
		gaps: payload.gaps as string[],
		recommendations: payload.recommendations as string[],
		summary: payload.summary as string | undefined
	};
}
