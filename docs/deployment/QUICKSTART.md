# Quick Start: Docker Deployment

Fast-track guide to get Prompt Management running with OpenCode in Docker.

## 5-Minute Setup

### 1. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env and set these minimum required values:
# - BETTER_AUTH_SECRET (generate: openssl rand -base64 32)
# - ADMIN_PASSWORD
# - ANTHROPIC_API_KEY
# - BETTER_AUTH_URL=http://localhost:3000
# - PUBLIC_APP_URL=http://localhost:3000
```

### 2. Start Services

```bash
# Build and start all services
docker compose up -d --build
```

### 3. Verify Deployment

```bash
# Check services are healthy
docker compose ps

# Should show both services as "Up (healthy)"
```

### 4. Access Application

Open http://localhost:3000 in your browser.

## Service Startup Order

1. **OpenCode** starts first (internal network, port 4096)
2. **Web App** waits for OpenCode health check
3. **Web App** starts once OpenCode is ready

## Common Commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart

# Check health
curl http://localhost:3000/api/health
```

## Environment Variables Cheat Sheet

| Variable             | Description           | Example                          |
| -------------------- | --------------------- | -------------------------------- |
| `BETTER_AUTH_SECRET` | Auth encryption key   | `openssl rand -base64 32`        |
| `ADMIN_PASSWORD`     | Admin access password | `your-secure-password`           |
| `ANTHROPIC_API_KEY`  | LLM API key           | `sk-ant-...`                     |
| `OPENCODE_URL`       | OpenCode service URL  | `http://opencode:4096` (default) |
| `WEB_PORT`           | Web service port      | `3000` (default)                 |

## Troubleshooting Quick Fixes

### Services not starting?

```bash
# Check logs for errors
docker compose logs

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Web app can't reach OpenCode?

```bash
# Verify internal networking
docker compose exec web ping opencode

# Should get ping responses
```

### Need to reset everything?

```bash
# WARNING: This deletes all data
docker compose down -v
rm -rf data/
```

## Next Steps

- See [DOCKER.md](./DOCKER.md) for comprehensive deployment guide
- Configure reverse proxy for production
- Set up SSL certificates
- Configure automated backups

## Key Points

✅ OpenCode runs internally (not exposed publicly)
✅ Web app automatically connects to OpenCode
✅ Health checks ensure services are ready
✅ Data persisted in Docker volumes
✅ Production-ready configuration
