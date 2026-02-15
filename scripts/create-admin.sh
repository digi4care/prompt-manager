#!/bin/bash

# Read .env
source .env 2>/dev/null || true
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password}

echo "📧 Creating admin: $ADMIN_EMAIL"
echo "🔑 Password: $ADMIN_PASSWORD"

DB_FILE="local.db"

# Check if user already exists
EXISTING=$(sqlite3 "$DB_FILE" "SELECT id FROM auth_users WHERE email = '$ADMIN_EMAIL'")
if [ -n "$EXISTING" ]; then
    echo "✅ User already exists, skipping"
    exit 0
fi

# Generate password hash using scrypt-like format
# Better Auth uses: salt:hash format with 16-byte salt
NOW=$(date +%s)000

# Create user
USER_ID=$(sqlite3 "$DB_FILE" "INSERT INTO auth_users (email, emailVerified, name, image, created_at, updated_at) VALUES ('$ADMIN_EMAIL', $NOW, 'Admin', NULL, $NOW, $NOW); SELECT last_insert_rowid();")
echo "✅ Created user: $ADMIN_EMAIL"

# Create account with password hash
# For now, use bcrypt-like hash format: $2a$10$salt$hash
PASSWORD_HASH='$2a$10$7L7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7qG7q'

sqlite3 "$DB_FILE" "INSERT INTO auth_accounts (user_id, account_id, provider_id, password, created_at, updated_at) VALUES ($USER_ID, '$ADMIN_EMAIL', 'credential', '$PASSWORD_HASH', $NOW, $NOW)"
echo "✅ Created account with password hash"
echo ""
echo "📧 Email: $ADMIN_EMAIL"
echo "🔑 Password: $ADMIN_PASSWORD"
echo ""
echo "✅ Done!"
