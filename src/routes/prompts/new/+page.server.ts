import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'New Prompt',
			description: 'Create a new prompt for your collection'
		}
	};
};
