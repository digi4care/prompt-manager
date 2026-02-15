import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ws = require('ws');

export const WebSocket = ws.WebSocket ?? ws;
export const WebSocketServer = ws.WebSocketServer ?? ws.Server;

export default ws;
