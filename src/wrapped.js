/**
 * Generate a shareable "wrapped" health card as self-contained HTML.
 * Think Spotify Wrapped meets WHOOP — dark, premium, screenshottable.
 */

/**
 * Compute a fun health identity based on analysis patterns.
 */
export function computeHealthIdentity(report) {
  const s = report.sleep;
  const r = report.recovery;
  const a = report.activity;
  const score = report.overall?.score ?? 0;

  if (score > 85)
    return { title: "The Optimizer", tagline: "Dialed in across the board", emoji: "⚡" };
  if (s?.available && s.averages?.bedtimeHour < 22 && s.averages?.bedtimeVariability < 0.5)
    return { title: "The Disciplined", tagline: "Routine is your superpower", emoji: "🎯" };
  if (r?.available && r.averageHRV > 80)
    return { title: "The Recovered", tagline: "Your nervous system is thriving", emoji: "🧘" };
  if (a?.available && a.averages?.stepsPerDay > 12000)
    return { title: "The Mover", tagline: "Built for momentum", emoji: "🏃" };
  if (s?.available && s.averages?.deepMinutes > 60)
    return { title: "The Deep Sleeper", tagline: "Quality rest, deep recovery", emoji: "🌙" };
  if (s?.available && s.averages?.bedtimeHour >= 24)
    return { title: "The Night Owl", tagline: "Late nights, your own rhythm", emoji: "🦉" };

  return { title: "The Tracker", tagline: "Measuring what matters", emoji: "📊" };
}

/**
 * Compute 2-3 surprising / shareable stats from the report.
 */
export function computeSurprisingStats(report) {
  const stats = [];

  // Total steps
  if (report.activity?.available && report.activity.averages?.stepsPerDay) {
    const days = 14;
    const total = Math.round(report.activity.averages.stepsPerDay * days);
    stats.push({
      label: "Total Steps",
      value: total.toLocaleString(),
      detail: `~${days} days tracked`,
    });
  }

  // Best sleep night
  if (report.sleep?.available && report.sleep.bestNight) {
    const bn = report.sleep.bestNight;
    stats.push({
      label: "Best Sleep",
      value: `${(bn.totalMinutes / 60).toFixed(1)}h`,
      detail: bn.date || "recent",
    });
  }

  // HRV peak
  if (report.recovery?.available && report.recovery.peakHRV) {
    stats.push({
      label: "HRV Peak",
      value: `${report.recovery.peakHRV.value}ms`,
      detail: report.recovery.peakHRV.date || "recent",
    });
  }

  // Records analyzed
  if (report.recordCount) {
    stats.push({
      label: "Records Analyzed",
      value: report.recordCount.toLocaleString(),
      detail: "from your Apple Health export",
    });
  }

  return stats.slice(0, 3);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreColor(score) {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

/**
 * Generate a self-contained HTML file for the health card.
 * @param {AnalysisReport} report
 * @param {object} options
 * @returns {{ html: string, filename: string }}
 */
export function generateWrappedHTML(report, options = {}) {
  const identity = computeHealthIdentity(report);
  const surprising = computeSurprisingStats(report);
  const score = report.overall?.score ?? 0;
  const pct = Math.min(100, Math.max(0, score));
  const color = scoreColor(score);
  const today = new Date().toISOString().slice(0, 10);

  // Stats grid items
  const gridItems = [];
  if (report.sleep?.available && report.sleep.averages) {
    gridItems.push({
      label: "Sleep",
      value: `${(report.sleep.averages.durationMinutes / 60).toFixed(1)}h avg`,
      sub: `Deep ${report.sleep.averages.deepMinutes}m · REM ${report.sleep.averages.remMinutes}m`,
    });
  }
  if (report.recovery?.available) {
    gridItems.push({
      label: "Recovery",
      value: `HRV ${report.recovery.latestHRV || report.recovery.averageHRV || "—"}ms`,
      sub: report.recovery.readiness || "—",
    });
  }
  if (report.activity?.available && report.activity.averages) {
    gridItems.push({
      label: "Activity",
      value: `${report.activity.averages.stepsPerDay?.toLocaleString() || "—"}/day`,
      sub: `${report.activity.averages.activeEnergyPerDay || "—"} kcal avg`,
    });
  }
  if (report.sleep?.available && report.sleep.averages?.bedtimeVariability != null) {
    gridItems.push({
      label: "Consistency",
      value: `±${Math.round(report.sleep.averages.bedtimeVariability * 60)}min`,
      sub: "bedtime variability",
    });
  }

  // Top signals
  const signals = (report.signals || []).slice(0, 3);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aveil Health Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:#e2e8f0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;padding:32px 16px}
.card{width:600px;max-width:100%;background:linear-gradient(180deg,#0f0f1a 0%,#0a0a0f 100%);border:1px solid rgba(124,58,237,0.2);border-radius:24px;overflow:hidden;padding:40px 32px}
.header{text-align:center;margin-bottom:32px}
.logo{font-size:14px;letter-spacing:4px;color:#7c3aed;font-weight:700;margin-bottom:4px}
.subtitle{font-size:12px;color:#64748b;letter-spacing:1px}
.score-section{text-align:center;margin-bottom:24px}
.score-ring{width:140px;height:140px;border-radius:50%;background:conic-gradient(${color} ${pct * 3.6}deg,#1e1e2e ${pct * 3.6}deg);display:inline-flex;align-items:center;justify-content:center;position:relative;box-shadow:0 0 40px rgba(124,58,237,0.15)}
.score-inner{width:110px;height:110px;border-radius:50%;background:#0a0a0f;display:flex;flex-direction:column;align-items:center;justify-content:center}
.score-num{font-size:36px;font-weight:800;color:${color}}
.score-label{font-size:11px;color:#64748b;margin-top:2px}
.identity{text-align:center;margin-bottom:28px}
.identity-emoji{font-size:32px}
.identity-title{font-size:22px;font-weight:700;color:#f1f5f9;margin:4px 0}
.identity-tagline{font-size:13px;color:#7c3aed;font-style:italic}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.grid-item{background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.12);border-radius:12px;padding:14px 16px}
.grid-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;margin-bottom:4px}
.grid-value{font-size:18px;font-weight:700;color:#f1f5f9}
.grid-sub{font-size:11px;color:#64748b;margin-top:2px}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;margin-bottom:12px;padding-top:8px}
.surprising{margin-bottom:24px}
.surprising-item{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.08)}
.surprising-item:last-child{border-bottom:none}
.surprising-label{font-size:12px;color:#94a3b8}
.surprising-value{font-size:16px;font-weight:700;color:#f1f5f9}
.surprising-detail{font-size:10px;color:#64748b}
.signals{margin-bottom:28px}
.signal{padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.08)}
.signal:last-child{border-bottom:none}
.signal-title{font-size:13px;font-weight:600;color:#e2e8f0}
.signal-detail{font-size:11px;color:#64748b;margin-top:2px}
.footer{text-align:center;padding-top:20px;border-top:1px solid rgba(124,58,237,0.12)}
.footer-brand{font-size:12px;color:#64748b;margin-bottom:6px}
.footer-compat{font-size:11px;color:#7c3aed;margin-bottom:4px}
.footer-mcp{display:inline-block;font-size:10px;color:#22c55e;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:6px;padding:2px 8px;margin:6px 0}
.footer-github{font-size:11px;color:#475569;margin-top:6px}
.footer-privacy{font-size:10px;color:#334155;margin-top:4px}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">▲ AVEIL</div>
    <div class="subtitle">YOUR HEALTH REPORT · ${escapeHtml(today)}</div>
  </div>

  <div class="score-section">
    <div class="score-ring">
      <div class="score-inner">
        <div class="score-num">${score}</div>
        <div class="score-label">/ 100</div>
      </div>
    </div>
  </div>

  <div class="identity">
    <div class="identity-emoji">${identity.emoji}</div>
    <div class="identity-title">${escapeHtml(identity.title)}</div>
    <div class="identity-tagline">${escapeHtml(identity.tagline)}</div>
  </div>

  ${gridItems.length ? `<div class="grid">${gridItems.map((g) => `
    <div class="grid-item">
      <div class="grid-label">${escapeHtml(g.label)}</div>
      <div class="grid-value">${escapeHtml(g.value)}</div>
      <div class="grid-sub">${escapeHtml(g.sub)}</div>
    </div>`).join("")}
  </div>` : ""}

  ${surprising.length ? `<div class="surprising">
    <div class="section-title">Highlights</div>
    ${surprising.map((s) => `<div class="surprising-item">
      <div>
        <div class="surprising-label">${escapeHtml(s.label)}</div>
        <div class="surprising-detail">${escapeHtml(s.detail)}</div>
      </div>
      <div class="surprising-value">${escapeHtml(s.value)}</div>
    </div>`).join("")}
  </div>` : ""}

  ${signals.length ? `<div class="signals">
    <div class="section-title">Signals</div>
    ${signals.map((s) => `<div class="signal">
      <div class="signal-title">${escapeHtml(s.title)}</div>
      <div class="signal-detail">${escapeHtml(s.detail)}</div>
    </div>`).join("")}
  </div>` : ""}

  <div class="footer">
    <div class="footer-brand">Generated with aveil-health · aveilx.com</div>
    <div class="footer-compat">Works with Claude Code · Cursor · Codex · OpenClaw</div>
    <div class="footer-mcp">🔌 MCP Server Available</div>
    <div class="footer-github">github.com/alexalexxss/aveil-health</div>
    <div class="footer-privacy">100% local · zero uploads · open source</div>
  </div>
</div>
</body>
</html>`;

  return {
    html,
    filename: `aveil-wrapped-${today}.html`,
  };
}
