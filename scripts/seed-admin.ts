import { scrypt } from '@noble/hashes/scrypt.js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Database from 'bun:sqlite';

// Read .env
const envContent = readFileSync('.env', 'utf-8');
const ADMIN_EMAIL = envContent.match(/ADMIN_EMAIL=(.+)/)?.[1]?.trim() || 'admin@example.com';
const ADMIN_PASSWORD = envContent.match(/ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'password';

console.log(`📧 Email: ${ADMIN_EMAIL}`);
console.log(`🔑 Password: ${ADMIN_PASSWORD}`);

// Better Auth exact config
const config = {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
};

function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = scrypt(password.normalize("NFKC"), salt, {
        N: config.N,
        p: config.p,
        r: config.r,
        dkLen: config.dkLen,
    });
    return `${salt}:${Buffer.from(key).toString('hex')}`;
}

const db = new Database('local.db');

// Delete existing admin
db.run('DELETE FROM auth_accounts WHERE user_id = 1');
db.run('DELETE FROM auth_users WHERE id = 1');
console.log('✅ Deleted existing admin');

// Create user (snake_case columns!)
const now = Date.now();
db.run('INSERT INTO auth_users (email, email_verified, name, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', 
    [ADMIN_EMAIL, 1, 'Admin', null, now, now]);
console.log('✅ Created user');

// Create account with Better Auth hash
const passwordHash = hashPassword(ADMIN_PASSWORD);
console.log(`🔐 Hash: ${passwordHash.substring(0, 40)}...`);

db.run('INSERT INTO auth_accounts (user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', 
    [1, ADMIN_EMAIL, 'credential', passwordHash, now, now]);
console.log('✅ Created account');

db.close();
console.log('\n✅ Done! You can now login with:');
console.log(`   Email: ${ADMIN_EMAIL}`);
console.log(`   Password: ${ADMIN_PASSWORD}`);
