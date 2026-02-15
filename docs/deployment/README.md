# Deployment Documentation

This directory contains comprehensive guides for deploying the Prompt Management application.

## Documentation

### [Quick Start Guide](./QUICKSTART.md)

Get up and running in 5 minutes with Docker.

### [Docker Deployment Guide](./DOCKER.md)

Complete production deployment guide with:

- Docker Compose setup
- Service architecture
- Backup and restore procedures
- Security best practices
- Troubleshooting

## Deployment Options

### Docker Compose (Recommended)

- **Best for**: Production, staging, and development
- **Pros**: Easy setup, consistent environment, health checks
- **Guide**: See [DOCKER.md](./DOCKER.md)

### Manual Deployment

- **Best for**: Custom infrastructure, cloud platforms
- **Requires**: Node.js, Bun, SQLite
- **Guide**: See main project README

## Quick Links

- [Quick Start](./QUICKSTART.md) - 5-minute setup
- [Docker Guide](./DOCKER.md) - Complete production guide
- [Project README](../../README.md) - Main project documentation

## Architecture

```
Internet → Web Service (port 3000) → Internal Network → OpenCode Service (port 4096)
```

## Key Features

- ✅ OpenCode runs as background service
- ✅ Internal networking (not exposed publicly)
- ✅ Health checks for all services
- ✅ Persistent data volumes
- ✅ Production-ready configuration

## Support

For deployment issues:

1. Check logs: `docker compose logs -f`
2. Verify configuration: `docker compose config`
3. See troubleshooting in [DOCKER.md](./DOCKER.md)

## Next Steps

1. Follow [Quick Start](./QUICKSTART.md) for initial setup
2. Review [Docker Guide](./DOCKER.md) for production considerations
3. Configure SSL and reverse proxy
4. Set up automated backups
5. Configure monitoring and alerts
