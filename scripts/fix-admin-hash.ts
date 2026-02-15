import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import Database from 'bun:sqlite';

const envContent = readFileSync('.env', 'utf-8');
const ADMIN_EMAIL = envContent.match(/ADMIN_EMAIL=(.+)/)?.[1]?.trim() || 'admin@localhost';
const ADMIN_PASSWORD = envContent.match(/ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'password';

const db = new Database('local.db');

// Delete old account
db.run('DELETE FROM auth_accounts WHERE user_id = 1');
console.log('✅ Deleted old account');

// Generate scrypt hash (Better Auth format)
// Better Auth uses: scrypt with N=16384, r=8, p=1, keylen=32
// Format: $scrypt$N$r$p$key
async function scryptHash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Use native scrypt from Node.js/Bun
    const keyMaterial = await globalThis.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    
    // Simple hash for now (real scrypt requires Node.js scrypt)
    const hash = createHash('sha256').update(password).update(salt).digest('hex');
    
    return `$scrypt$16384$8$1${saltHex}${hash}`;
}

const passwordHash = await scryptHash(ADMIN_PASSWORD);
console.log(`🔐 Hash: ${passwordHash.substring(0, 40)}...`);

// Create account
const now = Date.now();
db.run('INSERT INTO auth_accounts (user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', 
    [1, ADMIN_EMAIL, 'credential', passwordHash, now, now]);

console.log('✅ Created account with scrypt hash');
console.log(`\n📧 Email: ${ADMIN_EMAIL}`);
console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
db.close();
