# aveil-health

**Private, local Apple Health analysis in your terminal.**

Turn your Apple Health export into actionable signals on sleep, recovery, activity, and nutrition — without uploading anything.

Your data never leaves your machine.

## Quick Start

```bash
npx aveil-health analyze export.zip
```

Or with a raw XML:

```bash
npx aveil-health analyze ~/Desktop/export.xml --days 14
```

## What You Get

- **Sleep analysis** — duration, deep/REM/core stages, timing consistency, trends
- **Recovery score** — HRV-based readiness with sleep factor
- **Activity tracking** — steps, active energy, recent workouts
- **Nutrition summary** — calories and protein (if tracked in Apple Health)
- **Actionable signals** — concrete next steps, not just dashboards

## How to Export Your Apple Health Data

1. Open **Health** app on iPhone
2. Tap your **profile picture** (top right)
3. Scroll down → **Export All Health Data**
4. Tap **Export**
5. AirDrop or save the zip file

## Options

```
aveil-health analyze <file>   Analyze export.xml or export.zip
  --days <n>                  Days to analyze (default: 30)
  --json                      Output raw JSON
  --help                      Show help
```

## Example Output

```
  ▲ AVEIL  Health Analysis
  ─────────────────────────────────────

  Overall Score: 86/100
  sleep 99 · recovery 74 · activity 100

  ■ SLEEP
  Last night: 7.2h total
  Deep 87m · REM 111m · Core 231m · Awake 31m
  14-night avg: 7.5h · deep 52m · REM 96m

  ■ RECOVERY
  Score: 74/100 (good)
  HRV: 120ms (avg 109.5ms) · RHR 49bpm

  ■ SIGNALS
  ✅ Sleep: 7.2h (good)
     → Sleep looks solid — maintain current routine
  ✅ Recovery: 74/100 (good)
     → Good to push — recovery supports hard training today
```

## Privacy

- **100% local** — your data is parsed and analyzed on your machine
- **No network calls** — no APIs, no telemetry, no uploads
- **No account needed** — just your Apple Health export

## MCP Server (Coming Soon)

Use aveil-health as an MCP server inside Claude Code, Cursor, or any MCP-compatible client.

## License

MIT

---

**[aveilx.com](https://aveilx.com)** — Health signals you can act on.
