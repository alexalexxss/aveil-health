# Pipelock agent-boundary smoke test — 2026-05-10

## Objective
Test `luckyPipewrench/pipelock` in an isolated disposable environment as an OpenClaw/Aveil agent-boundary receipt/security pattern. No global install, no OpenClaw config changes, no logged-in browser profile, no real credentials.

## Environment
- Disposable checkout: `/tmp/pipelock-smoke-20260510/pipelock`
- Disposable home: `/tmp/pipelock-smoke-20260510/home`
- Disposable binary: `/tmp/pipelock-smoke-20260510/bin/pipelock`
- Fake/seeded attack data only; no Aveil/GitHub/Telegram credentials used.

## Commands run
```bash
rm -rf /tmp/pipelock-smoke-20260510
mkdir -p /tmp/pipelock-smoke-20260510
cd /tmp/pipelock-smoke-20260510
git clone --depth 1 https://github.com/luckyPipewrench/pipelock.git
cd pipelock
PIPELOCK_HOME=/tmp/pipelock-smoke-20260510/home go run ./cmd/pipelock demo --no-color
GOBIN=/tmp/pipelock-smoke-20260510/bin go install ./cmd/pipelock
cd examples/tool-response-injection
PIPELOCK_BIN=/tmp/pipelock-smoke-20260510/bin/pipelock python3 demo.py
```

## Results
- Fake secret exfiltration: **blocked** in `pipelock demo` scenario 1 as `DLP match: Anthropic API Key (critical)`.
- Toy MCP/tool mediation: **passed** via the bundled tool-response-injection harness.
  - MCP stdio: blocked prompt-injection tool response; 4 action receipts, 4 verified, 2 verified blocks.
  - MCP HTTP upstream: blocked same class; 2 action receipts, 2 verified, 1 verified block.
  - Fetch surface: blocked same class; 1 action receipt, 1 verified block.
- Receipt artifact clarity: **useful**. Evidence JSONL files expose `verdict`, `transport`, `layer`, `target`, `pattern`, `chain_seq`, `signature`, and `signer_key`, which is clearer and more independently auditable than a normal agent markdown report.
- Tamper resistance: harness rejected a modified signature and a broken receipt chain.

## Proof artifacts
- Demo log: `/tmp/pipelock-smoke-20260510/demo.out`
- Tool/MCP harness log: `/tmp/pipelock-smoke-20260510/tool-response-demo.out`
- Receipt JSONL examples: `/tmp/pipelock-smoke-20260510/pipelock/examples/tool-response-injection/evidence/evidence-proxy-0.jsonl` and rotated sibling files.

## Caveat
The same-user deployment limit is real: if the agent and mediator share filesystem permissions, the agent can delete or truncate local evidence. For OpenClaw/Aveil, the valuable pattern is mediator-outside-agent + signed receipts, not blindly running another same-user local daemon.

## Recommendation
**steal pattern only** — use action-receipt fields and signed/hashed evidence chains as a design pattern for future Allen/OpenClaw run receipts. Do not adopt Pipelock globally until it can run under a separate trust boundary and a specific OpenClaw integration surface is chosen.
