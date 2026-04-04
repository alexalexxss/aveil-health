# Quantified Self weekly thread launch comment

I shipped **aveil-health**, a local CLI that analyzes Apple Health exports and turns them into something more useful than raw CSV/XML dumps.

You export your Apple Health data, run one command, and get a readable report with sleep stages, recovery readiness, activity trends, nutrition signals (if you track food), plus a shareable Health Wrapped card. It also has an MCP mode if you want to give an AI agent local health context.

The main constraint I cared about: **no server, no Docker, no account, no telemetry**. Everything runs on your machine against your own export file. The target user is an individual self-tracker who wants actionable signals and simple sharing, not a full dashboard stack.

If you try it, I’d especially love feedback on whether the signals feel genuinely actionable vs. just descriptive, and what you’d want next beyond Apple Health.

## Feedback questions

1. Which output is more useful first: the CLI report, the Wrapped card, or the MCP mode?
2. Which signals feel highest-value for daily use: sleep, recovery, activity, or nutrition?
3. If you already use another QS tool, what would Aveil need to do to earn a place in your workflow?

## Candidate taglines

- Apple Health, interpreted locally.
- Turn your health export into signals, not spreadsheets.
- One command for actionable Apple Health insights.
