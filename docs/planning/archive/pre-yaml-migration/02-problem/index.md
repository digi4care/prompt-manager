# 02 -- Problem Statement

## Current Situation
Prompt engineering is ad-hoc: prompts live in scattered files, execution is non-deterministic, and there's no versioning or improvement workflow.

## Root Cause
- No centralized prompt management with metadata
- No deterministic model/parameter resolution
- No version history or diff visualization
- No structured improvement loop

## Impact
- Inconsistent execution results
- Lost work when prompts change
- No audit trail for model selection
- Manual, error-prone improvement process

## Evidence
- PROJECT.md validated requirements show existing codebase covers CRUD, versions, judging, improvement
- SPEC-00 defines the settings-first execution differentiator
- Beads issues show active development on execution, logging, streaming, council modes
