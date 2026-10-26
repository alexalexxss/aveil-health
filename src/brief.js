/**
 * Aveil Health Brief: a calm, printable summary to bring to a doctor or coach.
 * Same sections as the brief in the Aveil app. Input is a period summary
 * from buildPeriodSummary().
 */

import {
  BACKGROUND,
  BRIEF,
  BRIEF_HEADLINES,
  CONTEXT_PROBES,
  COVERAGE_LABELS,
  DOMAIN_NAMES,
  EVIDENCE_LABELS,
  EXPERIMENTS,
  MAIN_QUESTIONS,
  PATTERNS,
  fill,
} from "./copy.js";
import {
  FONT_LINKS,
  TOKENS_CSS,
  escapeHtml,
  formatDuration,
  formatMinutesWords,
  formatRange,
  formatUnit,
  joinList,
} from "./html.js";
import { MARKS, directionFor } from "./summary.js";

const DOMAIN_ORDER = ["sleep", "recovery", "activity", "nutrition"];
const SLEEP_DOMAINS = ["sleep", "recovery"];

export function generateHealthConsultBriefHTML(summary, options = {}) {
  return renderBrief(buildBriefModel(summary, { mode: "generic" }), options);
}

export function generateSleepConsultBriefHTML(summary, options = {}) {
  return renderBrief(buildBriefModel(summary, { mode: "sleep" }), options);
}

// Back-compat alias for the default brief generator.
export const generateAppointmentBriefHTML = generateHealthConsultBriefHTML;

/**
 * Turn a period summary into exactly what the brief shows. Exported for tests.
 */
export function buildBriefModel(summary, { mode = "generic" } = {}) {
  if (!summary || !summary.period || !summary.coverage) {
    throw new TypeError("The brief expects the output of buildPeriodSummary(data, { days }).");
  }
  const period = summary.period.word;
  const allowed = mode === "sleep" ? SLEEP_DOMAINS : DOMAIN_ORDER;
  const domains = allowed.filter((domain) => hasDomain(summary, domain));
  const base = {
    mode,
    eyebrow: mode === "sleep" ? BRIEF.eyebrowSleep : BRIEF.eyebrow,
    period,
    windowLabel: summary.period.label,
    range: formatRange(summary.period.start, summary.period.end),
  };
  if (!domains.length) {
    return { ...base, empty: true, message: BRIEF.noData };
  }

  const focus = pickFocus(summary, domains, mode);
  return {
    ...base,
    empty: false,
    focus,
    headline: fill(BRIEF_HEADLINES[focus], { period }),
    subline: fill(BRIEF.subline, {
      value: joinList(domains.map((domain) => DOMAIN_NAMES[domain])),
      threshold: summary.period.label.toLowerCase(),
    }),
    coverage: coverageLine(summary, allowed),
    question: MAIN_QUESTIONS[focus],
    patterns: patternLines(summary, domains, focus),
    evidence: evidenceRows(summary, mode),
    evidenceNote: fill(BRIEF.evidenceNote, { value: summary.period.label.toLowerCase() }),
    context: contextItems(focus, mode),
    experiment: fill(summary.period.days >= 300 ? EXPERIMENTS[`year_${focus}`] : EXPERIMENTS[focus], { period }),
    background: backgroundLines(summary, mode),
    disclaimer: BRIEF.disclaimer,
  };
}

function hasDomain(summary, domain) {
  const { current } = summary;
  switch (domain) {
    case "sleep": return current.sleep.nights >= 3;
    case "recovery": return current.recovery.hrvDays >= 3 || current.recovery.restingDays >= 3;
    case "activity": return current.activity.coverageDays >= 3;
    case "nutrition": return current.nutrition.days >= 3;
    default: return false;
  }
}

/**
 * The area to discuss first.
 * 1. The first area with a clear gap, in the order sleep, recovery, movement,
 *    eating: sleep under 6h 30m a night or a bedtime that swings more than
 *    75 minutes; recovery (HRV) down 10% or more, or resting heart rate up
 *    3 bpm or more, since the period before; under 5,000 steps a day; under
 *    60 g of protein a day across 7 or more logged days.
 * 2. Otherwise the area furthest below a common mark: 7 hours of sleep,
 *    7,000 steps, or 75 g of protein.
 * 3. Otherwise sleep.
 */
function pickFocus(summary, domains, mode) {
  const { current, changes } = summary;
  const usable = domains.filter((domain) => mode !== "sleep" || SLEEP_DOMAINS.includes(domain));
  const change = (metric) => changes.find((entry) => entry.metric === metric);
  const sleep = current.sleep;
  const steps = current.activity.steps;
  const { proteinDays, protein } = current.nutrition;
  const hrv = change("hrv");
  const rhr = change("restingHR");

  const hasSteps = steps != null && current.activity.days >= 3;
  const clear = {
    sleep: sleep.averageMinutes != null && (sleep.averageMinutes < 390 || sleep.bedtimeSpreadMinutes > 75),
    recovery: Boolean((hrv && hrv.before > 0 && (hrv.now - hrv.before) / hrv.before <= -0.1) || (rhr && rhr.delta >= 3)),
    activity: hasSteps && steps < MARKS.stepsLow,
    nutrition: proteinDays >= 7 && protein < 60,
  };
  const first = usable.find((domain) => clear[domain]);
  if (first) return first;

  const mild = [
    ["sleep", sleep.averageMinutes != null && sleep.averageMinutes < MARKS.sleepMinutes ? (MARKS.sleepMinutes - sleep.averageMinutes) / MARKS.sleepMinutes : 0],
    ["activity", hasSteps && steps < MARKS.stepsStrong ? (MARKS.stepsStrong - steps) / MARKS.stepsStrong : 0],
    ["nutrition", proteinDays >= 7 && protein < MARKS.proteinLowGrams ? (MARKS.proteinLowGrams - protein) / MARKS.proteinLowGrams : 0],
  ].filter(([domain, gap]) => usable.includes(domain) && gap > 0);
  if (mild.length) return mild.sort((a, b) => b[1] - a[1])[0][0];

  return usable.includes("sleep") ? "sleep" : usable[0];
}

function coverageLine(summary, allowed) {
  const { coverage } = summary;
  const parts = [];
  for (const domain of ["sleep", "recovery", "nutrition", "activity"]) {
    if (!allowed.includes(domain)) continue;
    const count = coverage[domain];
    if (domain === "nutrition" && count === 0) continue;
    parts.push(`${COVERAGE_LABELS[domain]} ${count}/${coverage.days}`);
  }
  return parts;
}

function patternLines(summary, domains, focus) {
  const { current } = summary;
  const period = summary.period.word;
  const byDomain = { sleep: [], recovery: [], activity: [], nutrition: [] };

  if (domains.includes("sleep")) {
    const sleep = current.sleep;
    const hours = formatDuration(sleep.averageMinutes);
    if (sleep.averageMinutes < MARKS.sleepMinutes) byDomain.sleep.push(fill(PATTERNS.sleep_duration_short, { value: hours }));
    else if (sleep.averageMinutes <= 540) byDomain.sleep.push(fill(PATTERNS.sleep_duration_strong, { value: hours }));
    else byDomain.sleep.push(fill(PATTERNS.sleep_duration_plain, { value: hours, period }));

    if (sleep.stagedNights >= 5) {
      const deep = formatMinutesWords(sleep.deepMinutes);
      if (sleep.deepMinutes >= MARKS.deepStrongMinutes) byDomain.sleep.push(fill(PATTERNS.deep_sleep_strong, { value: deep, threshold: "60-minute" }));
      else if (sleep.deepMinutes >= MARKS.deepLowMinutes) byDomain.sleep.push(fill(PATTERNS.deep_sleep_solid, { value: deep, period }));
      else byDomain.sleep.push(fill(PATTERNS.deep_sleep_opportunity, { value: deep }));
    }
    if (sleep.bedtimeSpreadMinutes != null) {
      const spread = formatMinutesWords(sleep.bedtimeSpreadMinutes);
      if (sleep.bedtimeSpreadMinutes <= MARKS.bedtimeSteadyMinutes) byDomain.sleep.push(fill(PATTERNS.timing_steady, { value: spread }));
      else if (sleep.bedtimeSpreadMinutes >= MARKS.bedtimeDriftMinutes) byDomain.sleep.push(fill(PATTERNS.timing_opportunity, { value: spread }));
    }
  }

  if (domains.includes("recovery")) {
    const recovery = current.recovery;
    if (recovery.hrvDays >= 5) {
      const value = formatUnit(recovery.hrv, "ms");
      byDomain.recovery.push(recovery.hrv >= MARKS.hrvStrongMs
        ? fill(PATTERNS.hrv_strong, { value, period })
        : fill(PATTERNS.hrv_present, { value }));
    }
    if (recovery.restingDays >= 5) {
      const value = formatUnit(recovery.restingHR, "bpm");
      byDomain.recovery.push(recovery.restingHR < MARKS.restingHrMarkBpm
        ? fill(PATTERNS.rhr_under_mark, { value, threshold: `${MARKS.restingHrMarkBpm} bpm` })
        : fill(PATTERNS.rhr_plain, { value, period }));
    }
  }

  if (domains.includes("activity") && current.activity.days >= 3) {
    const value = formatUnit(current.activity.steps, "steps");
    if (current.activity.steps >= MARKS.stepsStrong) byDomain.activity.push(fill(PATTERNS.steps_strong, { value, threshold: "7,000-step" }));
    else if (current.activity.steps >= MARKS.stepsLow) byDomain.activity.push(fill(PATTERNS.steps_solid, { value, period }));
    else byDomain.activity.push(fill(PATTERNS.steps_opportunity, { value }));
  }

  if (domains.includes("nutrition") && current.nutrition.proteinDays >= 7) {
    const value = formatUnit(current.nutrition.protein, "grams");
    if (current.nutrition.protein >= MARKS.proteinStrongGrams) byDomain.nutrition.push(fill(PATTERNS.protein_strong, { value, threshold: "100 g" }));
    else if (current.nutrition.protein < MARKS.proteinLowGrams) byDomain.nutrition.push(fill(PATTERNS.protein_opportunity, { value }));
  }

  // Two lines from the area in focus, then one from the next area with data.
  const lines = byDomain[focus].slice(0, 2);
  for (const domain of DOMAIN_ORDER) {
    if (lines.length >= 3) break;
    if (domain === focus) continue;
    if (byDomain[domain].length) lines.push(byDomain[domain][0]);
  }
  return lines.slice(0, 3);
}

function evidenceRows(summary, mode) {
  const { current, recent } = summary;
  const rows = [];
  const add = (label, latest, baseline, format) => {
    if (baseline == null) return;
    rows.push({ metric: label, latest: format(latest), baseline: format(baseline), direction: directionFor(latest, baseline) });
  };
  if (current.sleep.nights >= 3) add(EVIDENCE_LABELS.sleep, recent.sleep.averageMinutes, current.sleep.averageMinutes, formatDuration);
  if (current.sleep.stagedNights >= 3) {
    add(EVIDENCE_LABELS.deep, recent.sleep.deepMinutes, current.sleep.deepMinutes, formatDuration);
    add(EVIDENCE_LABELS.rem, recent.sleep.remMinutes, current.sleep.remMinutes, formatDuration);
  }
  if (current.recovery.hrvDays >= 3) add(EVIDENCE_LABELS.hrv, recent.recovery.hrv, current.recovery.hrv, (value) => formatUnit(value, "ms"));
  if (current.recovery.restingDays >= 3) add(EVIDENCE_LABELS.restingHR, recent.recovery.restingHR, current.recovery.restingHR, (value) => formatUnit(value, "bpm"));
  if (mode !== "sleep") {
    if (current.activity.days >= 3) add(EVIDENCE_LABELS.steps, recent.activity.steps, current.activity.steps, (value) => formatUnit(value, "steps"));
    if (current.nutrition.proteinDays >= 3) add(EVIDENCE_LABELS.protein, recent.nutrition.protein, current.nutrition.protein, (value) => formatUnit(value, "grams"));
  }
  return rows;
}

function contextItems(focus, mode) {
  const items = [...CONTEXT_PROBES[focus]];
  items.push(mode === "sleep" && focus === "sleep" ? CONTEXT_PROBES.recovery[0] : CONTEXT_PROBES.general[0]);
  return items.slice(0, 5);
}

function backgroundLines(summary, mode) {
  const { current, coverage } = summary;
  const period = summary.period.word;
  const lines = [];
  if (mode !== "sleep" && current.activity.workouts >= 1) {
    const strength = current.activity.strength;
    const strengthText = strength === 1 ? BACKGROUND.strength_one : fill(BACKGROUND.strength_many, { value: strength });
    lines.push(strength >= 1
      ? fill(BACKGROUND.workouts_strength, { value: current.activity.workouts, threshold: strengthText, period })
      : fill(BACKGROUND.workouts, { value: current.activity.workouts, period }));
  }
  if (mode !== "sleep" && coverage.nutrition >= 1 && coverage.nutrition < coverage.days) {
    lines.push(fill(BACKGROUND.food_logging, { value: coverage.nutrition, threshold: coverage.days }));
  }
  if (current.sleep.nights >= 3 && current.sleep.stagedNights === 0) {
    lines.push(BACKGROUND.sleep_stages_missing);
  }
  return lines;
}

// ─── HTML ───

function renderBrief(model, options = {}) {
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const prefix = model.mode === "sleep" ? "aveil-sleep-brief" : "aveil-health-brief";
  const content = model.empty ? emptyContent(model) : briefContent(model);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(model.eyebrow)}</title>
${FONT_LINKS}
<style>
${TOKENS_CSS}
:root{--paper:#F7F3EB;--paper-ink:#0C0907;--paper-muted:#3D342A;--paper-rule:rgba(12,9,7,0.12);--paper-soft:rgba(12,9,7,0.07)}
body{background:#EDE6D9;color:var(--paper-ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1;padding:36px 16px}
.sheet{max-width:720px;margin:0 auto;background:var(--paper);border:1px solid var(--paper-rule);border-radius:6px;padding:36px 40px 30px}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--amber)}
h1{font-weight:500;font-size:27px;line-height:1.18;letter-spacing:-.01em;margin-top:10px}
.subline{font-size:14px;line-height:1.5;color:var(--paper-muted);margin-top:10px}
.meta{font-size:13px;color:var(--paper-muted);margin-top:8px}
.coverage{font-weight:500;font-size:14px;margin-top:6px;display:flex;flex-wrap:wrap;gap:4px 0}
.coverage span + span::before{content:"·";color:var(--paper-muted);margin:0 8px}
.callout{margin-top:22px;padding:14px 16px;border:1px solid rgba(217,122,43,0.4);background:rgba(217,122,43,0.06);border-radius:4px}
.callout-label{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--amber)}
.callout-text{font-weight:600;font-size:17px;line-height:1.35;margin-top:6px}
.section{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--amber);margin:28px 0 10px}
.pattern{font-weight:500;font-size:16px;line-height:1.45}
.pattern + .pattern{margin-top:10px}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--paper-muted);text-align:left;padding:0 0 8px;border-bottom:1px solid var(--paper-rule)}
td{font-size:14px;padding:9px 0;border-bottom:1px solid var(--paper-soft)}
tr:last-child td{border-bottom:none}
th:nth-child(1),td:nth-child(1){width:40%}
th:nth-child(2),td:nth-child(2),th:nth-child(3),td:nth-child(3){width:24%}
th:nth-child(4),td:nth-child(4){width:12%;text-align:center}
td.metric{font-weight:500}
td.trend{font-size:15px;color:var(--paper-muted)}
.note{font-size:12px;color:var(--paper-muted);margin-top:8px}
ul{list-style:none}
li{font-size:15px;line-height:1.45;display:flex;gap:10px}
li + li{margin-top:6px}
li::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--paper-ink);flex-shrink:0;margin-top:9px}
.disclaimer{font-size:12px;line-height:1.5;color:var(--paper-muted);margin-top:26px;padding-top:14px;border-top:1px solid var(--paper-rule)}
.footer{font-family:var(--mono);font-size:11px;color:var(--paper-muted);text-align:center;margin-top:16px}
.empty{font-size:16px;line-height:1.5;margin-top:14px}
@media (max-width:640px){body{padding:12px 8px}.sheet{padding:24px 18px}h1{font-size:23px}}
@media print{body{background:#fff;padding:0}.sheet{border:none;max-width:none;padding:0}.footer{display:none}.callout,tr{break-inside:avoid}}
</style>
</head>
<body>
<article class="sheet">
${content}
</article>
<p class="footer">${escapeHtml(BRIEF.footer)}</p>
</body>
</html>`;

  return {
    html,
    filename: `${prefix}-${generatedAt.toISOString().slice(0, 10)}.html`,
  };
}

function briefContent(model) {
  const arrow = { up: "↑", down: "↓", steady: "→" };
  const evidence = model.evidence.length
    ? `<div class="section">${escapeHtml(BRIEF.evidenceHeading)}</div>
  <table>
    <thead><tr><th>Metric</th><th>Latest</th><th>Baseline</th><th>Trend</th></tr></thead>
    <tbody>
      ${model.evidence.map((row) => `<tr><td class="metric">${escapeHtml(row.metric)}</td><td>${escapeHtml(row.latest)}</td><td>${escapeHtml(row.baseline)}</td><td class="trend">${arrow[row.direction] || "–"}</td></tr>`).join("\n      ")}
    </tbody>
  </table>
  <p class="note">${escapeHtml(model.evidenceNote)}</p>`
    : "";

  return `<div class="eyebrow">${escapeHtml(model.eyebrow)}</div>
  <h1>${escapeHtml(model.headline)}</h1>
  <p class="subline">${escapeHtml(model.subline)}</p>
  <p class="meta">${escapeHtml(`${model.windowLabel} · ${model.range}`)}</p>
  <p class="coverage">${model.coverage.map((part) => `<span>${escapeHtml(part)}</span>`).join("")}</p>
  <div class="callout"><div class="callout-label">${escapeHtml(BRIEF.questionHeading)}</div><div class="callout-text">${escapeHtml(model.question)}</div></div>
  ${model.patterns.length ? `<div class="section">${escapeHtml(BRIEF.patternsHeading)}</div>${model.patterns.map((line) => `<p class="pattern">${escapeHtml(line)}</p>`).join("")}` : ""}
  ${evidence}
  <div class="section">${escapeHtml(BRIEF.contextHeading)}</div>
  <ul>${model.context.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  <div class="callout"><div class="callout-label">${escapeHtml(BRIEF.experimentHeading)}</div><div class="callout-text">${escapeHtml(model.experiment)}</div></div>
  ${model.background.length ? `<div class="section">${escapeHtml(BRIEF.backgroundHeading)}</div><ul>${model.background.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  <p class="disclaimer">${escapeHtml(model.disclaimer)}</p>`;
}

function emptyContent(model) {
  return `<div class="eyebrow">${escapeHtml(model.eyebrow)}</div>
  <p class="meta">${escapeHtml(`${model.windowLabel} · ${model.range}`)}</p>
  <p class="empty">${escapeHtml(model.message)}</p>
  <p class="disclaimer">${escapeHtml(BRIEF.disclaimer)}</p>`;
}
