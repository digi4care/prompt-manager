import type { ParamMatcher } from '@sveltejs/kit';

const VALID_TYPES = ['executor', 'judge', 'improve', 'council'];

export const match: ParamMatcher = (param) => {
	return VALID_TYPES.includes(param);
};
