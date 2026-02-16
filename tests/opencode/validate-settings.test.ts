import { describe, expect, it } from 'vitest';
import {
	OpenCodeSettingsValidationError,
	validateSettings
} from '$lib/server/opencode/validate-settings';

describe('validateSettings', () => {
	it('accepts local mode and applies defaults', () => {
		const result = validateSettings({ mode: 'local' });

		expect(result).toEqual({
			mode: 'local',
			local: {
				hostname: '127.0.0.1',
				portRange: {
					min: 10000,
					max: 65535
				}
			}
		});
	});

	it('rejects invalid local port ranges with clear errors', () => {
		expect(() =>
			validateSettings({
				mode: 'local',
				local: {
					portRange: {
						min: 9999,
						max: 70000
					}
				}
			})
		).toThrow(OpenCodeSettingsValidationError);

		try {
			validateSettings({
				mode: 'local',
				local: {
					portRange: {
						min: 9999,
						max: 70000
					}
				}
			});
		} catch (error) {
			expect(error).toBeInstanceOf(OpenCodeSettingsValidationError);
			expect((error as OpenCodeSettingsValidationError).errors).toContain(
				'local.portRange must stay within 10000..65535'
			);
		}
	});

	it('requires explicit remote host and port when baseUrl is missing', () => {
		expect(() =>
			validateSettings({
				mode: 'remote',
				remote: {
					host: 'example.com'
				}
			})
		).toThrow(OpenCodeSettingsValidationError);

		try {
			validateSettings({
				mode: 'remote',
				remote: {
					host: 'example.com'
				}
			});
		} catch (error) {
			expect(error).toBeInstanceOf(OpenCodeSettingsValidationError);
			expect((error as OpenCodeSettingsValidationError).errors).toContain(
				'remote.port is required when remote.baseUrl is not set'
			);
		}
	});

	it('accepts remote baseUrl override without host/port', () => {
		const result = validateSettings({
			mode: 'remote',
			remote: {
				baseUrl: 'https://api.example.com/opencode'
			}
		});

		expect(result).toEqual({
			mode: 'remote',
			remote: {
				baseUrl: 'https://api.example.com/opencode'
			}
		});
	});
});
