import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateOpencode = vi.fn();
const mockCreateOpencodeClient = vi.fn();
const mockGetPort = vi.fn();
const mockPortNumbers = vi.fn();

vi.mock('@opencode-ai/sdk', () => ({
	createOpencode: mockCreateOpencode,
	createOpencodeClient: mockCreateOpencodeClient
}));

vi.mock('get-port', () => ({
	default: mockGetPort,
	portNumbers: mockPortNumbers
}));

// Mock fetch globally to prevent auto-discovery network calls
vi.stubGlobal('fetch', vi.fn());

describe('createOpenCodeConnection', () => {
	let localCloseSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		localCloseSpy = vi.fn();

		// Mock fetch to simulate no existing server found (discovery fails fast)
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

		mockPortNumbers.mockReturnValue([10000, 10001]);
		mockGetPort.mockResolvedValue(15432);
		mockCreateOpencode.mockResolvedValue({
			client: { global: { health: vi.fn() } },
			server: {
				url: 'http://127.0.0.1:15432',
				close: localCloseSpy
			}
		});
		mockCreateOpencodeClient.mockReturnValue({ global: { health: vi.fn() } });
	});

	it('uses a random free local port and never hardcodes 4096', async () => {
		const { createOpenCodeConnection } = await import('$lib/server/opencode/create-connection');

		const connection = await createOpenCodeConnection({ mode: 'local' });

		expect(mockPortNumbers).toHaveBeenCalledWith(10000, 65535);
		expect(mockGetPort).toHaveBeenCalledTimes(1);
		expect(mockCreateOpencode).toHaveBeenCalledWith({
			hostname: '127.0.0.1',
			port: 15432
		});
		expect(connection.meta.port).toBe(15432);
		expect(connection.meta.port).not.toBe(4096);
		expect(connection.meta.startedLocalServer).toBe(true);
	}, 15000);

	it('uses exact remote configured port', async () => {
		const { createOpenCodeConnection } = await import('$lib/server/opencode/create-connection');

		const connection = await createOpenCodeConnection({
			mode: 'remote',
			remote: {
				protocol: 'https',
				host: 'api.example.com',
				port: 8443
			}
		});

		expect(mockCreateOpencodeClient).toHaveBeenCalledWith(
			expect.objectContaining({
				baseUrl: 'https://api.example.com:8443'
			})
		);
		expect(connection.meta.port).toBe(8443);
		expect(connection.meta.startedLocalServer).toBe(false);
	});

	it('builds URL from protocol host port and basePath', async () => {
		const { createOpenCodeConnection } = await import('$lib/server/opencode/create-connection');

		const connection = await createOpenCodeConnection({
			mode: 'remote',
			remote: {
				protocol: 'http',
				host: 'localhost',
				port: 5050,
				basePath: '/opencode/'
			}
		});

		expect(connection.meta.baseUrl).toBe('http://localhost:5050/opencode');
	});

	it('local close() shuts down server and remote close() is no-op', async () => {
		const { createOpenCodeConnection } = await import('$lib/server/opencode/create-connection');

		const local = await createOpenCodeConnection({ mode: 'local' });
		await local.close();
		expect(localCloseSpy).toHaveBeenCalledTimes(1);

		const remote = await createOpenCodeConnection({
			mode: 'remote',
			remote: {
				host: 'localhost',
				port: 8080
			}
		});

		await expect(remote.close()).resolves.toBeUndefined();
		expect(localCloseSpy).toHaveBeenCalledTimes(1);
	}, 15000);
});
