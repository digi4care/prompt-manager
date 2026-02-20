import '@testing-library/jest-dom';
import { vi, beforeAll } from 'vitest';

// Use hoisted to ensure mocks are applied before imports
const { mockWs, mockSdk } = vi.hoisted(() => {
	// Mock WebSocket class for ws module
	class MockWebSocket {
		constructor(public url: string) {}
		send = vi.fn();
		close = vi.fn();
		onopen: (() => void) | null = null;
		onclose: (() => void) | null = null;
		onmessage: ((event: { data: string }) => void) | null = null;
		onerror: ((error: Error) => void) | null = null;
	}

	// Mock ws for libsql in tests
	const mockWsModule = {
		__esModule: true,
		WebSocket: MockWebSocket,
		default: MockWebSocket
	};

	// Mock @opencode-ai/sdk
	const mockSdkModule = {
		OpenCode: vi.fn().mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			disconnect: vi.fn(),
			executeAgent: vi.fn().mockResolvedValue({ result: 'mocked' }),
			listModels: vi.fn().mockResolvedValue(['gpt-4', 'claude-3']),
			getModel: vi.fn().mockResolvedValue({ id: 'gpt-4', name: 'GPT-4' }),
			listCatalog: vi.fn().mockResolvedValue([])
		})),
		createAgent: vi.fn()
	};

	return { mockWs: mockWsModule, mockSdk: mockSdkModule };
});

vi.mock('ws', () => mockWs);
vi.mock('@opencode-ai/sdk', () => mockSdk);

// Mock @libsql/client for database tests
vi.mock('@libsql/client', () => ({
	createClient: vi.fn().mockImplementation(() => ({
		execute: vi.fn().mockResolvedValue({ rows: [], rowsAffected: 0 }),
		executeMultiple: vi.fn().mockResolvedValue([]),
		stream: vi.fn().mockResolvedValue({ rows: [] }),
		close: vi.fn()
	}))
}));

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	clear: vi.fn(),
	removeItem: vi.fn()
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	value: vi.fn().mockReturnValue({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}),
	writable: true
});

// Mock document.documentElement.classList
const classListMock = {
	add: vi.fn(),
	remove: vi.fn(),
	toggle: vi.fn(),
	contains: vi.fn().mockReturnValue(false)
};
Object.defineProperty(document.documentElement, 'classList', {
	value: classListMock,
	configurable: true
});
