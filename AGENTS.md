# Aveil Health Agent Guide

This repo is the local-first Aveil CLI and MCP package for Apple Health exports.
It is part of the Aveil workspace, but it is not the iOS, Android, or backend
release surface.

Read the parent guide at `../AGENTS.md` first for shared Aveil positioning,
branch discipline, and cross-repo contracts. This file owns only repo-local
implementation and verification.

## Product Scope

- CLI commands for analyzing Apple Health export `.zip` or `.xml` files.
- Local HTML artifacts such as health consult briefs and Health Wrapped cards.
- MCP server tools for agent access to local health summaries.
- No accounts, telemetry, server calls, or cloud sync in the CLI/MCP runtime.

Do not route private health exports to remote services from this repo. Keep
analysis local unless Alex explicitly asks for a separate export/research flow.

## File Map

- `bin/cli.js` — CLI entrypoint and command routing.
- `src/parser.js` — streaming Apple Health export parser.
- `src/analyze.js` — scoring, trends, and signal generation.
- `src/format.js` — terminal/JSON formatting.
- `src/brief.js` — consult and sleep brief HTML output.
- `src/wrapped.js` — Health Wrapped card generation.
- `src/mcp-server.js` — MCP server and tool definitions.
- `assets/` — checked-in showcase images.
- `examples/` — example/generated user-facing outputs when present.
- `docs/ops/` — repo-specific operational notes.

## Commands

```bash
npm test
node bin/cli.js analyze <export.zip>
node bin/cli.js brief <export.zip> --output /tmp/health-consult-brief.html
node bin/cli.js wrapped <export.zip>
node bin/cli.js mcp
```

Use `npm test` as the default verification gate for code changes. For artifact
or copy changes, generate the affected output when a safe local fixture/export is
available; otherwise state that no real export fixture was available.

## Editing Rules

- Keep Node.js support at `>=18` unless `package.json` changes deliberately.
- Keep the package zero-network by default.
- Do not commit real Apple Health exports, personal health outputs, or generated
  private reports.
- Avoid broad parser rewrites unless the test fixture proves the behavior.
- README copy is user-facing; keep it accurate, simple, and local-first.

## Release Notes

When changing CLI commands, package files, MCP tool names, or user-facing output
contracts, update `README.md` in the same branch and mention any cross-repo impact
in the handoff.
