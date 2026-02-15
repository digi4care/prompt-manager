import Database from 'bun:sqlite';
import { readFileSync } from 'fs';
import bcrypt from 'bcrypt';

const envContent = readFileSync('.env', 'utf-8');
const ADMIN_PASSWORD = envContent.match(/ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'password';

const db = new Database('local.db');

// Generate bcrypt hash (cost factor 10)
const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

console.log('Password hash:', passwordHash);

db.run('UPDATE auth_accounts SET password = ? WHERE user_id = 1', [passwordHash]);
console.log('✅ Password hash updated with bcrypt');

db.close();
