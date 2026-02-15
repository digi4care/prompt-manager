import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

// Mock ws for libsql in tests
vi.mock('ws', () => ({
	WebSocket: class {},
	default: class {}
}));
