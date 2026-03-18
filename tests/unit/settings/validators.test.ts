import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
	createTypeSchema,
	stringValidators,
	numberValidators,
	arrayValidators,
	booleanValidators,
	when,
	withDefault,
	optional,
	validators
} from '$lib/settings/validators';

describe('createTypeSchema', () => {
	it('should create string schema', () => {
		const schema = createTypeSchema('string');
		expect(schema.safeParse('test').success).toBe(true);
		expect(schema.safeParse(123).success).toBe(false);
	});

	it('should create number schema', () => {
		const schema = createTypeSchema('number');
		expect(schema.safeParse(42).success).toBe(true);
		expect(schema.safeParse('test').success).toBe(false);
	});

	it('should create boolean schema', () => {
		const schema = createTypeSchema('boolean');
		expect(schema.safeParse(true).success).toBe(true);
		expect(schema.safeParse('true').success).toBe(false);
	});

	it('should create enum schema', () => {
		const schema = createTypeSchema('enum', { enumValues: ['a', 'b', 'c'] });
		expect(schema.safeParse('a').success).toBe(true);
		expect(schema.safeParse('d').success).toBe(false);
	});

	it('should throw for enum without values', () => {
		expect(() => createTypeSchema('enum')).toThrow('Enum type requires enumValues option');
	});

	it('should create array schema', () => {
		const schema = createTypeSchema('array');
		expect(schema.safeParse([1, 2, 3]).success).toBe(true);
		expect(schema.safeParse('test').success).toBe(false);
	});

	it('should create object schema', () => {
		const schema = createTypeSchema('object');
		expect(schema.safeParse({ key: 'value' }).success).toBe(true);
		expect(schema.safeParse('test').success).toBe(false);
	});
});

describe('stringValidators', () => {
	it('should validate required string', () => {
		expect(stringValidators.required.safeParse('test').success).toBe(true);
		expect(stringValidators.required.safeParse('').success).toBe(false);
	});

	it('should validate optional string', () => {
		expect(stringValidators.optional.safeParse('test').success).toBe(true);
		expect(stringValidators.optional.safeParse('').success).toBe(true);
		expect(stringValidators.optional.safeParse(undefined).success).toBe(true);
	});

	it('should validate URL', () => {
		expect(stringValidators.url.safeParse('https://example.com').success).toBe(true);
		expect(stringValidators.url.safeParse('not a url').success).toBe(false);
	});

	it('should validate hostname', () => {
		expect(stringValidators.hostname.safeParse('example.com').success).toBe(true);
		expect(stringValidators.hostname.safeParse('127.0.0.1').success).toBe(true);
		expect(stringValidators.hostname.safeParse('').success).toBe(false);
	});

	it('should validate port', () => {
		expect(stringValidators.port.safeParse('8080').success).toBe(true);
		expect(stringValidators.port.safeParse('0').success).toBe(false);
		expect(stringValidators.port.safeParse('70000').success).toBe(false);
	});

	it('should validate API key', () => {
		expect(stringValidators.apiKey.safeParse('sk-12345678').success).toBe(true);
		expect(stringValidators.apiKey.safeParse('short').success).toBe(false);
	});
});

describe('numberValidators', () => {
	it('should validate temperature', () => {
		expect(numberValidators.temperature.safeParse(0.7).success).toBe(true);
		expect(numberValidators.temperature.safeParse(0).success).toBe(true);
		expect(numberValidators.temperature.safeParse(2).success).toBe(true);
		expect(numberValidators.temperature.safeParse(-0.1).success).toBe(false);
		expect(numberValidators.temperature.safeParse(2.1).success).toBe(false);
	});

	it('should validate port number', () => {
		expect(numberValidators.port.safeParse(8080).success).toBe(true);
		expect(numberValidators.port.safeParse(0).success).toBe(false);
		expect(numberValidators.port.safeParse(70000).success).toBe(false);
	});

	it('should validate positive integer', () => {
		expect(numberValidators.positiveInt.safeParse(42).success).toBe(true);
		expect(numberValidators.positiveInt.safeParse(0).success).toBe(false);
		expect(numberValidators.positiveInt.safeParse(-1).success).toBe(false);
	});

	it('should validate percentage', () => {
		expect(numberValidators.percentage.safeParse(50).success).toBe(true);
		expect(numberValidators.percentage.safeParse(0).success).toBe(true);
		expect(numberValidators.percentage.safeParse(100).success).toBe(true);
		expect(numberValidators.percentage.safeParse(101).success).toBe(false);
	});

	it('should validate probability', () => {
		expect(numberValidators.probability.safeParse(0.5).success).toBe(true);
		expect(numberValidators.probability.safeParse(0).success).toBe(true);
		expect(numberValidators.probability.safeParse(1).success).toBe(true);
		expect(numberValidators.probability.safeParse(1.1).success).toBe(false);
	});
});

describe('arrayValidators', () => {
	it('should validate non-empty array', () => {
		expect(arrayValidators.nonEmpty.safeParse([1]).success).toBe(true);
		expect(arrayValidators.nonEmpty.safeParse([]).success).toBe(false);
	});

	it('should validate string array', () => {
		expect(arrayValidators.strings.safeParse(['a', 'b']).success).toBe(true);
		expect(arrayValidators.strings.safeParse([1, 2]).success).toBe(false);
	});

	it('should validate unique strings', () => {
		expect(arrayValidators.uniqueStrings.safeParse(['a', 'b']).success).toBe(true);
		expect(arrayValidators.uniqueStrings.safeParse(['a', 'a']).success).toBe(false);
	});
});

describe('booleanValidators', () => {
	it('should validate any boolean', () => {
		expect(booleanValidators.any.safeParse(true).success).toBe(true);
		expect(booleanValidators.any.safeParse(false).success).toBe(true);
		expect(booleanValidators.any.safeParse('true').success).toBe(false);
	});

	it('should validate true literal', () => {
		expect(booleanValidators.true.safeParse(true).success).toBe(true);
		expect(booleanValidators.true.safeParse(false).success).toBe(false);
	});
});

describe('helper functions', () => {
	describe('when', () => {
		it('should apply conditional validation', () => {
			const schema = when((n: number) => n > 0, z.number());
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(-1).success).toBe(false);
		});
	});

	describe('withDefault', () => {
		it('should set default value', () => {
			const schema = withDefault(z.string(), 'default');
			expect(schema.parse(undefined)).toBe('default');
			expect(schema.parse('custom')).toBe('custom');
		});
	});

	describe('optional', () => {
		it('should make schema optional', () => {
			const schema = optional(z.string());
			expect(schema.safeParse('test').success).toBe(true);
			expect(schema.safeParse(undefined).success).toBe(true);
		});
	});
});

describe('validators collection', () => {
	it('should export all validators', () => {
		expect(validators.string).toBeDefined();
		expect(validators.number).toBeDefined();
		expect(validators.array).toBeDefined();
		expect(validators.boolean).toBeDefined();
		expect(validators.connection).toBeDefined();
		expect(validators.provider).toBeDefined();
		expect(validators.model).toBeDefined();
		expect(validators.policy).toBeDefined();
		expect(validators.default).toBeDefined();
	});
});
