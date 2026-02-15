# Docker Deployment Guide

This guide covers deploying the Prompt Management application with OpenCode service using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum (4GB recommended)
- At least 10GB free disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd prompt-management
```

### 2. Configure Environment Variables

Copy the example environment file and configure your production settings:

```bash
cp .env.example .env
```

**Required Production Variables:**

```bash
# Application URL (update to your domain)
BETTER_AUTH_URL=https://your-domain.com
PUBLIC_APP_URL=https://your-domain.com

# Security
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
ADMIN_PASSWORD=<your-admin-password>

# Database
DATABASE_URL=file:/app/data/local.db

# OpenCode (internal - no need to change for Docker)
OPENCODE_URL=http://opencode:4096

# Anthropic API (for LLM-as-Judge)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Generate Secrets:**

```bash
# Generate Better Auth secret
openssl rand -base64 32
```

### 3. Start Services

Build and start all services:

```bash
docker compose up -d --build
```

This will:

- Build the web application
- Install and start OpenCode service
- Set up internal networking
- Configure health checks

### 4. Verify Deployment

Check service status:

```bash
docker compose ps
```

Expected output:

```
NAME                 STATUS                   PORTS
prompt-management-web-1   Up (healthy)          0.0.0.0:3000->3000/tcp
prompt-management-opencode-1 Up (healthy)
```

View logs:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f opencode
```

### 5. Access the Application

Open your browser at: `http://localhost:3000`

## Services Overview

### Web Application (`web`)

- **Image**: Built from Dockerfile
- **Port**: 3000 (configurable via `WEB_PORT`)
- **Health Check**: `/api/health` endpoint
- **Dependencies**: Requires OpenCode service to be healthy
- **Data**: Persisted in `data` volume

### OpenCode Service (`opencode`)

- **Image**: `node:20-alpine` with OpenCode CLI installed
- **Port**: 4096 (internal only, not exposed)
- **Health Check**: `/health` endpoint
- **Configuration**: Persisted in `opencode-data` volume
- **Network**: Internal only, accessible only by web service

## Architecture

```
Internet → Nginx/Proxy (optional) → Web Service (port 3000)
                                      ↓
                                   Internal Network
                                      ↓
                                OpenCode Service (port 4096)
```

**Security:**

- OpenCode is NOT exposed publicly
- Only the web service can reach OpenCode via internal network
- All secrets passed via environment variables
- Runs as non-root user

## Environment Configuration

### Development vs Production

| Variable          | Development             | Production (Docker)       |
| ----------------- | ----------------------- | ------------------------- |
| `NODE_ENV`        | `development`           | `production`              |
| `OPENCODE_URL`    | `http://localhost:4096` | `http://opencode:4096`    |
| `PUBLIC_APP_URL`  | `http://localhost:5173` | `https://your-domain.com` |
| `BETTER_AUTH_URL` | `http://localhost:5173` | `https://your-domain.com` |

### Docker-Specific Variables

```bash
# Web service port (default: 3000)
WEB_PORT=3000

# OpenCode configuration (optional)
OPENCODE_API_KEY=your-opencode-api-key
OPENCODE_WS_URL=ws://opencode:4096
```

## Volumes

### `data` Volume

- **Purpose**: SQLite database and application data
- **Location**: `/app/data` in web container
- **Backup**: Essential to back up this volume

### `opencode-data` Volume

- **Purpose**: OpenCode configuration and cache
- **Location**: `/home/opencode/.opencode` in opencode container
- **Backup**: Optional (will be recreated if lost)

## Backup & Restore

### Backup Data

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup web data
docker run --rm \
  -v prompt-management_data:/data \
  -v $(pwd)/backups/$(date +%Y%m%d):/backup \
  alpine tar czf /backup/web-data.tar.gz -C /data .

# Backup OpenCode data (optional)
docker run --rm \
  -v prompt-management_opencode-data:/data \
  -v $(pwd)/backups/$(date +%Y%m%d):/backup \
  alpine tar czf /backup/opencode-data.tar.gz -C /data .
```

### Restore Data

```bash
# Stop services
docker compose down

# Restore web data
docker run --rm \
  -v prompt-management_data:/data \
  -v $(pwd)/backups/20250107:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/web-data.tar.gz -C /data"

# Restore OpenCode data (optional)
docker run --rm \
  -v prompt-management_opencode-data:/data \
  -v $(pwd)/backups/20250107:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/opencode-data.tar.gz -C /data"

# Start services
docker compose up -d
```

## Monitoring

### Service Health

```bash
# Check health status
docker compose ps

# Detailed health checks
curl http://localhost:3000/api/health
```

### Logs

```bash
# Follow all logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific service
docker compose logs -f web
```

### Resource Usage

```bash
# CPU and memory usage
docker stats

# Disk usage
docker system df
```

## Scaling

### Scale Web Application

```bash
# Scale to 2 instances
docker compose up -d --scale web=2

# Note: You'll need a load balancer for production scaling
```

### OpenCode Scaling

OpenCode currently runs as a single service. For high availability, consider:

- Multiple OpenCode instances with a load balancer
- External OpenCode service

## Troubleshooting

### OpenCode Not Starting

```bash
# Check OpenCode logs
docker compose logs opencode

# Verify internal networking
docker compose exec web ping opencode
```

### Web Can't Connect to OpenCode

```bash
# Check OPENCODE_URL is set correctly
docker compose exec web env | grep OPENCODE_URL

# Test connectivity from web container
docker compose exec web wget -O- http://opencode:4096/health
```

### Database Issues

```bash
# Check database file permissions
docker compose exec web ls -la /app/data/

# Rebuild database (WARNING: data loss)
docker compose down -v
docker compose up -d
```

### Health Checks Failing

```bash
# Check health check configuration
docker compose config

# Manually test health endpoints
curl http://localhost:3000/api/health
docker compose exec opencode wget -O- http://localhost:4096/health
```

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Keep Docker updated** - Regular security patches
4. **Limit container privileges** - Runs as non-root user
5. **Network isolation** - OpenCode not exposed publicly
6. **Regular backups** - Automated backup script recommended
7. **Monitor logs** - Set up log aggregation (ELK, Loki, etc.)

## Production Considerations

### Reverse Proxy (Recommended)

Use Nginx, Caddy, or Traefik for:

- SSL/TLS termination
- Static file serving
- Rate limiting
- Security headers

Example Nginx config:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Logging

Configure centralized logging:

```yaml
# docker-compose.yml
services:
  web:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### Resource Limits

Add resource constraints:

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### Update OpenCode

```bash
# Stop services
docker compose down

# Remove OpenCode volume (optional - reconfigures OpenCode)
docker volume rm prompt-management_opencode-data

# Restart (will reinstall latest OpenCode)
docker compose up -d --build
```

## Next Steps

- [ ] Set up reverse proxy (Nginx/Caddy/Traefik)
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set up automated backups
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up log aggregation
- [ ] Configure CDN for static assets

## Support

For issues or questions:

- Check logs: `docker compose logs -f`
- Verify configuration: `docker compose config`
- Test connectivity: `docker compose exec web ping opencode`
