#!/usr/bin/env bash

set -euo pipefail

PLUGINS_HOME=${PLUGINS_HOME:-/home/vscode/.local/share/claude-plugins}
MARKETPLACE_NAME=${MARKETPLACE_NAME:-digi4care-claude-plugins}
DEFAULT_PLUGINS=(designer prp-framework)

if [[ ! -d "${PLUGINS_HOME}/.claude-plugin" ]]; then
  echo "[bootstrap-claude-plugins] ${PLUGINS_HOME} ontbreekt of bevat geen marketplace. Sla over." >&2
  exit 0
fi

echo "[bootstrap-claude-plugins] Marketplace initialiseren vanuit ${PLUGINS_HOME}" >&2
claude plugin marketplace remove "${MARKETPLACE_NAME}" >/dev/null 2>&1 || true
claude plugin marketplace add "${PLUGINS_HOME}" >/dev/null

for plugin in "${DEFAULT_PLUGINS[@]}"; do
  echo "[bootstrap-claude-plugins] Plugin installeren: ${plugin}" >&2
  claude plugin install "${plugin}" >/dev/null || true
done

sync_skills() {
  local src="$1"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "${src}" ~/.claude/skills/ >/dev/null || true
  else
    cp -a "${src}" ~/.claude/skills/ >/dev/null || true
  fi
}

echo "[bootstrap-claude-plugins] Skills synchroniseren" >&2
mkdir -p ~/.claude/skills
if [[ -d "${PLUGINS_HOME}/skills-bucket/skills" ]]; then
  sync_skills "${PLUGINS_HOME}/skills-bucket/skills/."
elif [[ -d "${PLUGINS_HOME}/skills-bucket" ]]; then
  sync_skills "${PLUGINS_HOME}/skills-bucket/."
fi

echo "[bootstrap-claude-plugins] Klaar"
