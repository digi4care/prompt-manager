import Database from 'bun:sqlite';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const ADMIN_PASSWORD = envContent.match(/ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'password';

const db = new Database('local.db');

// Better Auth uses scrypt with format: $scrypt$N$r$p$salt$hash
// But actually Better Auth uses a simpler format for SQLite
// Let me check what hash format Better Auth expects

// For now, let's use a simple approach - Better Auth's hashPassword
// We'll use the Node.js scrypt function

import { scryptSync, randomBytes } from 'crypto';

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(ADMIN_PASSWORD, salt, 64).toString('hex');
const passwordHash = `${salt}:${hash}`;

console.log('Password hash:', passwordHash.substring(0, 50) + '...');

db.run('UPDATE auth_accounts SET password = ? WHERE user_id = 1', [passwordHash]);
console.log('✅ Password hash updated');

db.close();
