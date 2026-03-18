import { z } from 'zod';
import type { SettingsBlock } from '../types';
import { numberValidators } from '../validators';

/**
 * Function Defaults settings block
 *
 * Default configurations for executor, judge, improve functions
 */
export const defaultsBlock: SettingsBlock = {
	id: 'defaults',
	label: 'Function Defaults',
	description: 'Default settings for AI functions',
	order: 5,
	visibleWhen: (values): boolean =>
		!!values['models.selected'] && String(values['models.selected']).length > 0,
	settings: [
		// Executor defaults
		{
			key: 'executor.modelId',
			type: 'string',
			label: 'Executor Model',
			description: 'Default model for task execution',
			defaultValue: '',
			schema: z.string(),
			requires: ['models.selected', 'policy.allowedModels'],
			order: 10,
			category: 'Executor'
		},
		{
			key: 'executor.temperature',
			type: 'number',
			label: 'Executor Temperature',
			description: 'Temperature for executor model',
			defaultValue: 0.7,
			schema: numberValidators.temperature,
			requires: ['executor.modelId'],
			visibleWhen: (values): boolean =>
				!!values['defaults.executor.modelId'] &&
				String(values['defaults.executor.modelId']).length > 0,
			order: 11,
			category: 'Executor'
		},

		// Judge defaults
		{
			key: 'judge.modelId',
			type: 'string',
			label: 'Judge Model',
			description: 'Default model for evaluation',
			defaultValue: '',
			schema: z.string(),
			requires: ['models.selected', 'policy.allowedModels'],
			order: 20,
			category: 'Judge'
		},
		{
			key: 'judge.temperature',
			type: 'number',
			label: 'Judge Temperature',
			description: 'Temperature for judge model (lower for consistency)',
			defaultValue: 0.3,
			schema: numberValidators.temperature,
			requires: ['judge.modelId'],
			visibleWhen: (values): boolean =>
				!!values['defaults.judge.modelId'] &&
				String(values['defaults.judge.modelId']).length > 0,
			order: 21,
			category: 'Judge'
		},

		// Improve defaults
		{
			key: 'improve.modelId',
			type: 'string',
			label: 'Improve Model',
			description: 'Default model for prompt improvement',
			defaultValue: '',
			schema: z.string(),
			requires: ['models.selected', 'policy.allowedModels'],
			order: 30,
			category: 'Improve'
		},
		{
			key: 'improve.temperature',
			type: 'number',
			label: 'Improve Temperature',
			description: 'Temperature for improve model',
			defaultValue: 0.5,
			schema: numberValidators.temperature,
			requires: ['improve.modelId'],
			visibleWhen: (values): boolean =>
				!!values['defaults.improve.modelId'] &&
				String(values['defaults.improve.modelId']).length > 0,
			order: 31,
			category: 'Improve'
		}
	]
};

export default defaultsBlock;
