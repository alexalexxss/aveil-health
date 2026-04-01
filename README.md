# aveil-health

Private, local Apple Health analysis in your terminal. No uploads, no accounts, no cloud.

Turn your Apple Health export into actionable signals on sleep, recovery, activity, and nutrition — everything stays on your machine.

## Quick Start

```bash
# Analyze your Apple Health export (zip or xml)
npx aveil-health analyze export.zip

# Last 14 days only
npx aveil-health analyze export.xml --days 14

# JSON output (pipe to jq, save, or feed to other tools)
npx aveil-health analyze export.xml --json > report.json
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
  Avg bedtime: 9:00 PM · variability ±24min
  Trend: 📈 improving

  ■ RECOVERY
  Score: 74/100 (good)
  HRV: 120ms (avg 109.5ms) · RHR 49bpm
  Trend: 📈 improving

  ■ ACTIVITY
  Today: 11,045 steps · 634 kcal
  14-day avg: 13,648 steps/day · 738 kcal/day
  Recent workouts: Strength Training (34min), Walking (28min)
  Trend: 📉 declining

  ■ NUTRITION
  14-day avg: 1,676 kcal · 133g protein

  ■ SIGNALS
  ✅ Sleep: 7.2h (good)
     Deep 87m · REM 111m · Core 231m
     → Sleep looks solid — maintain current routine

  ✅ Recovery: 74/100 (good)
     HRV 120ms (avg 109.5ms) · RHR 49bpm
     → Good to push — recovery supports hard training today

  ─────────────────────────────────────
  77,186 records analyzed
  aveilx.com — health signals you can act on
```

## What It Analyzes

| Domain | Metrics | Source |
|--------|---------|--------|
| **Sleep** | Duration, deep/REM/core stages, bedtime consistency, trends | Apple Watch |
| **Recovery** | HRV-based readiness score, resting heart rate, sleep factor | Apple Watch |
| **Activity** | Steps, active energy, recent workouts, trends | iPhone + Watch |
| **Nutrition** | Calories, protein (if tracked in Apple Health) | Manual or apps |
| **Signals** | Actionable next steps based on all domains | Computed |

## How to Export Your Data

1. Open the **Health** app on your iPhone
2. Tap your **profile picture** (top right)
3. Scroll down → **Export All Health Data**
4. Tap **Export**
5. AirDrop or save the `.zip` file to your computer

The export can be large (50–500MB depending on how long you've had an Apple Watch). That's fine — the parser streams through it without loading everything into memory.

## Options

```
Usage: aveil-health analyze <export.xml | export.zip> [options]

Options:
  --days <n>    Number of recent days to analyze (default: 30)
  --json        Output as JSON instead of formatted report
  --help        Show help
```

## How It Works

1. **Parses** your Apple Health XML export using a streaming SAX parser (handles multi-GB files)
2. **Extracts** sleep sessions, heart rate, HRV, steps, workouts, nutrition, and more
3. **Analyzes** each domain with deterministic scoring (no AI/LLM calls, no network)
4. **Generates signals** — concrete, actionable observations based on your real data
5. **Outputs** a clean terminal report or structured JSON

## Signals

Signals are the core output — not just dashboards, but specific observations with next steps:

- **Sleep quality** — duration + stage breakdown + what to change
- **Deep sleep deficit** — triggered when your average deep sleep is below 45 minutes
- **Recovery readiness** — HRV-based score that tells you whether to push or rest
- **Activity alerts** — flagged when daily steps fall below health thresholds
- **Protein lag** — triggered when tracked protein intake is below recommended levels

Each signal includes a severity level (`positive` / `neutral` / `warning`) and concrete action items.

## Privacy

- **100% local** — your data is parsed and analyzed on your machine
- **Zero network calls** — no APIs, no telemetry, no uploads, no tracking
- **No account needed** — just your Apple Health export file
- **Open source** — read the code, verify the claims

## Requirements

- Node.js 18+
- An Apple Health export (iPhone required for export; Apple Watch recommended for full data)

## MCP Server

Use aveil-health as an MCP server inside Claude Code, Cursor, or any MCP-compatible tool.

### Setup

Add to your MCP config (e.g. `~/.claude/settings.json` or Cursor MCP settings):

```json
{
  "mcpServers": {
    "aveil-health": {
      "command": "npx",
      "args": ["aveil-health", "mcp"],
      "env": {
        "AVEIL_HEALTH_EXPORT": "/path/to/your/export.xml"
      }
    }
  }
}
```

### Available Tools

| Tool | What it does |
|------|--------------|
| `analyze_health` | Full health analysis — overall score, all domains, signals |
| `get_sleep_summary` | Last night + averages + stages + bedtime consistency |
| `get_recovery_status` | HRV-based readiness — should you push or rest today? |
| `get_activity_summary` | Steps, energy, workouts, trends |
| `get_signals` | Actionable observations with severity + next steps |

### Example Prompts

Once configured, ask your AI coding tool:

- "How did I sleep last night?"
- "Am I recovered enough to train hard today?"
- "Give me a health check"
- "What should I focus on to improve my sleep?"

All analysis runs locally on your machine. No data is sent anywhere.

## Roadmap

- [ ] Trend visualizations (terminal sparklines)
- [ ] Weekly digest mode
- [ ] Custom signal thresholds
- [ ] Garmin / Fitbit / Google Health export support
- [ ] Watch for file changes (auto-refresh on new exports)

## License

MIT

---

Built by [@alexalexxss](https://github.com/alexalexxss) · **[aveilx.com](https://aveilx.com)** — Health signals you can act on
