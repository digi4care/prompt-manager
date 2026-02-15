# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `bun install`, start a development server:

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.

## Testing (Docker Required)

All tests must be run via the Docker utility:

```sh
./scripts/run-tests-docker.sh bun run test
./scripts/run-tests-docker.sh bun run test:e2e:all
./scripts/run-tests-docker.sh --all
```

## Docker Deployment

Production deployment with OpenCode service is supported via Docker Compose:

### Quick Start

```sh
# Configure environment
cp .env.example .env
# Edit .env with your production values

# Start services
docker compose up -d --build

# Verify deployment
docker compose ps
curl http://localhost:3000/api/health
```

### Documentation

- **Quick Start**: [docs/deployment/QUICKSTART.md](docs/deployment/QUICKSTART.md)
- **Full Guide**: [docs/deployment/DOCKER.md](docs/deployment/DOCKER.md)
- **Architecture**: Web service connects to internal OpenCode service on port 4096

### Features

- ✅ OpenCode runs as background service (not exposed publicly)
- ✅ Health checks for all services
- ✅ Persistent data volumes
- ✅ Production-ready configuration

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
