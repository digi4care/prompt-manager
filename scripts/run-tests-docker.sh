#!/usr/bin/env bash

set -euo pipefail

compose_file="docker-compose.playwright.yml"
service="playwright"

if [[ "${1:-}" == "--all" ]]; then
  docker compose -f "$compose_file" run --rm --build -e TEST_COMMAND="bun run test" "$service"
  docker compose -f "$compose_file" run --rm --build -e E2E_WORKERS=4 -e TEST_COMMAND="npx playwright test --project=chromium --project=firefox" "$service"
  exit 0
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: ./scripts/run-tests-docker.sh --all | <command...>"
  echo "Example: ./scripts/run-tests-docker.sh bun run test:e2e:all"
  exit 1
fi

docker compose -f "$compose_file" run --rm --build -e TEST_COMMAND="$*" "$service"
