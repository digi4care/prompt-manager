#!/bin/bash
# E2E Development Server Script
# Sets required environment variables and starts the dev server

export ADMIN_PASSWORD=test-admin-password
exec bun run dev
