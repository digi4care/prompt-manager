import YAML from 'yaml';
import { z } from 'zod';

const expertiseSchema = z.object({
	domain: z.string(),
	patterns: z
		.array(
			z.object({
				name: z.string(),
				description: z.string(),
				examples: z.array(z.string()).optional(),
				success_rate: z.number().min(0).max(1).optional()
			})
		)
		.optional(),
	lessons: z
		.array(
			z.object({
				what_worked: z.string(),
				what_failed: z.string(),
				insight: z.string()
			})
		)
		.optional(),
	cross_references: z.array(z.string()).optional()
});

export type ExpertiseData = z.infer<typeof expertiseSchema>;

export function parseExpertiseYaml(yamlString: string): ExpertiseData {
	const parsed = YAML.parse(yamlString);
	return expertiseSchema.parse(parsed);
}

export function stringifyExpertiseYaml(data: ExpertiseData): string {
	return YAML.stringify(data);
}
