// Mock ws module for jsdom test environment
// This provides a minimal WebSocket implementation for testing

class MockWebSocket {
	public readyState = 0; // CONNECTING
	public OPEN = 1;
	public CLOSED = 3;

	constructor(public url: string) {}

	public send(data: string | ArrayBuffer): void {
		// No-op for testing
	}

	public close(): void {
		// No-op for testing
	}

	public addEventListener(): void {
		// No-op for testing
	}

	public removeEventListener(): void {
		// No-op for testing
	}
}

class MockWebSocketServer {
	constructor() {
		// No-op for testing
	}

	public close(): void {
		// No-op for testing
	}
}

// ESM exports
export const WebSocket = MockWebSocket;
export const WebSocketServer = MockWebSocketServer;

// CommonJS default export
export default {
	WebSocket: MockWebSocket,
	WebSocketServer: MockWebSocketServer
};
