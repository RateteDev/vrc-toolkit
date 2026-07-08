set shell := ["bash", "-euo", "pipefail", "-c"]

# ─── Setup & Clean ───

# Install dependencies and configure local environment (run once after clone)
[group('Setup & Clean')]
setup:
    git config core.hooksPath .githooks
    bun install

# Remove build artifacts and caches
[group('Setup & Clean')]
clean:
    rm -rf node_modules packages/*/node_modules apps/*/node_modules

# ─── Core ───

# Run core lint, format, and type checks without modifying files
[group('Core')]
core-check:
    bunx biome check .
    bunx tsc --noEmit

# Auto-fix core lint and format issues
[group('Core')]
core-fix:
    bunx biome check --write .

# Run core tests
[group('Core')]
core-test:
    cd packages/core && bun test

# Run core CI (check → test)
[group('Core')]
core-ci:
    just core-check
    just core-test

# ─── CI ───

# Run local CI (mirrors remote CI pipeline)
ci-local:
    just _check-agents-sync
    just core-ci

[private]
_check-agents-sync:
    @diff -q CLAUDE.md AGENTS.md >/dev/null || { echo "CLAUDE.md and AGENTS.md are out of sync. Run: cp CLAUDE.md AGENTS.md"; exit 1; }

# ─── Claude Code ───

[private]
_session-start:
    @echo '=== just --list ==='
    @echo '$ just --list'
    @just --list
    @echo ''
    @echo '=== docs ==='
    @echo '$ find docs -type f'
    @find docs -type f | sort | awk -F/ '{d=$0; sub(/[^/]+$/,"",d); if (d!=p) {print d; p=d}; f=$0; sub(/^.*\//,"",f); print "  " f}'
