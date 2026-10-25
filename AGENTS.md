# aveil-health Agent Guide

This repo is the local-first Aveil CLI and MCP package for Apple Health exports.
It is the early open-source tool the Aveil app grew from; the app itself lives
elsewhere. If you are working inside the wider Aveil workspace, also read
`../AGENTS.md`.

## Product Scope

- CLI commands for Apple Health exports (`.zip` or `.xml`).
- Local HTML outputs: the Aveil Wrapped card and the health brief.
- An MCP server for agent access to local health summaries.
- No accounts, telemetry, server calls, or cloud sync in the CLI/MCP runtime.

Do not send health exports to remote services from this repo. Keep analysis
local unless the maintainer explicitly asks for a separate export flow.

## File Map

- `bin/cli.js`: CLI entry point and command routing.
- `src/parser.js`: streaming export parser; reads `.zip` in place.
- `src/summary.js`: period summary for Wrapped and the brief (averages, last 7
  days vs period, period vs previous period, sleep stages, reference marks).
- `src/copy.js`: every sentence the Wrapped card and brief can show.
- `src/html.js`: shared colors, fonts, icons, and number formats.
- `src/wrapped.js`: Aveil Wrapped card.
- `src/brief.js`: health brief (general and sleep-only modes).
- `src/sample-data.js`: seeded synthetic export for the demo and tests.
- `src/analyze.js`, `src/format.js`: terminal report and MCP analysis.
- `src/mcp-server.js`: MCP server and tool definitions.
- `test/`: tests (not shipped in the npm package).
- `assets/`: README images, made from the synthetic demo.
- `examples/output/`: demo outputs from the synthetic export.

## Commands

```bash
npm test
node bin/cli.js wrapped <export.zip> [--period week|month|year]
node bin/cli.js brief <export.zip> --output /tmp/health-brief.html
node bin/cli.js analyze <export.zip> [--json]
node bin/cli.js demo --output /tmp/aveil-demo
node bin/cli.js mcp
```

Use `npm test` as the default check for code changes. For output or copy
changes, regenerate the demo and look at the rendered pages.

## Editing Rules

- Keep Node.js support at `>=18` unless `package.json` changes deliberately.
- Keep the package zero-network by default.
- Never commit real Apple Health exports, personal health outputs, or generated
  private reports. Images and examples come from `node bin/cli.js demo`.
- Copy follows the Aveil voice: plain, specific, no verdicts, no medical
  claims, no em dashes. `test/copy.test.js` enforces the basics.
- Keep calculations simple and standard. This repo does not hold Aveil's
  app-side models.
- README copy is user-facing; keep it accurate, simple, and local-first.

## Release Notes

When changing CLI commands, package files, MCP tool names, or output contracts,
update `README.md` in the same branch.
