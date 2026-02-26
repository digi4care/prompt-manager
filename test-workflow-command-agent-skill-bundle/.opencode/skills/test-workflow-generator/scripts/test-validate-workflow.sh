#!/usr/bin/env bash

set -euo pipefail

OUT_DIR="${1:-docs/testing}"

required_files=(
	"RUN_CONTEXT.md"
	"ANALYSIS_STRATEGY.md"
	"ANALYSIS_TODO.md"
	"ANALYSIS_UNIVERSE.md"
	"ANALYSIS_LOG.md"
	"ANALYSIS_DECISION_RECORD.md"
	"DEEP_DIVE_PLAN.md"
	"OMISSION_AUDIT_REPORT.md"
	"TEST_STRATEGY.md"
	"DEPENDENCY_TEST_MATRIX.md"
	"TRACEABILITY_MATRIX.md"
	"REGRESSION_GATE_CHECKLIST.md"
	"TEST_ENFORCEMENT_GUIDELINE.md"
	"IMPLEMENTATION_PLAN.md"
	"TODO.md"
	"GENERATION_REPORT.md"
)

missing=0

for file in "${required_files[@]}"; do
	if [[ ! -f "$OUT_DIR/$file" ]]; then
		echo "missing: $OUT_DIR/$file"
		missing=1
	fi
done

if [[ "$missing" -ne 0 ]]; then
	echo "validation failed: required files are missing" >&2
	exit 1
fi

matrix="$OUT_DIR/DEPENDENCY_TEST_MATRIX.md"
trace="$OUT_DIR/TRACEABILITY_MATRIX.md"

if ! grep -q "Good" "$matrix" || ! grep -q "Bad" "$matrix"; then
	echo "validation failed: matrix must include both Good and Bad behavior entries" >&2
	exit 1
fi

if ! grep -q "TRACE-" "$trace"; then
	echo "validation failed: traceability matrix must include TRACE IDs" >&2
	exit 1
fi

echo "validation passed: $OUT_DIR"
