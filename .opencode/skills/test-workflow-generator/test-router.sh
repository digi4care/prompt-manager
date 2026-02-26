#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$ROOT_DIR/templates"
VALIDATOR="$ROOT_DIR/scripts/test-validate-workflow.sh"

COMMAND="${1:-help}"
OUT_DIR="${2:-docs/testing}"

print_help() {
	cat <<'EOF'
test-workflow-generator router

Usage:
  bash .opencode/skills/test-workflow-generator/test-router.sh scaffold [out_dir]
  bash .opencode/skills/test-workflow-generator/test-router.sh validate [out_dir]
  bash .opencode/skills/test-workflow-generator/test-router.sh help

Commands:
  scaffold  Create missing docs/testing files from templates
  validate  Validate required files and basic matrix/traceability contracts
  help      Show this message
EOF
}

scaffold() {
	mkdir -p "$OUT_DIR"
	for template in "$TEMPLATES_DIR"/*.template.md; do
		name="$(basename "$template" .template.md).md"
		target="$OUT_DIR/$name"
		if [[ ! -f "$target" ]]; then
			cp "$template" "$target"
			echo "created: $target"
		else
			echo "exists:  $target"
		fi
	done
}

validate() {
	bash "$VALIDATOR" "$OUT_DIR"
}

case "$COMMAND" in
	scaffold)
		scaffold
		;;
	validate)
		validate
		;;
	help|--help|-h)
		print_help
		;;
	*)
		echo "unknown command: $COMMAND" >&2
		print_help
		exit 1
		;;
esac
