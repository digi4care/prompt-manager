import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const ADMIN_EMAIL = envContent.match(/ADMIN_EMAIL=(.+)/)?.[1]?.trim() || 'admin@localhost';
const ADMIN_PASSWORD = envContent.match(/ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'password';

console.log(`📧 Email: ${ADMIN_EMAIL}`);
console.log(`🔑 Password: ${ADMIN_PASSWORD}`);

// Check user ID
import Database from 'bun:sqlite';
const db = new Database('local.db');

const user = db.query('SELECT id FROM auth_users WHERE email = ?').get(ADMIN_EMAIL);
if (!user) {
    console.error('❌ User not found');
    process.exit(1);
}

const userId = user.id;
console.log(`✅ Found user ID: ${userId}`);

// Generate password hash (Better Auth uses scrypt)
// Format: salt:hash where salt is hex, hash is derived
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Generate 16-byte salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Use PBKDF2 (Bun doesn't have scrypt in Web Crypto)
    const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${saltHex}:${keyHex}`;
}

const passwordHash = await hashPassword(ADMIN_PASSWORD);
console.log(`🔐 Hash: ${passwordHash.substring(0, 30)}...`);

// Create account
const now = Date.now();
db.run('INSERT INTO auth_accounts (user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', 
    [userId, ADMIN_EMAIL, 'credential', passwordHash, now, now]);

console.log('✅ Account created');
db.close();
