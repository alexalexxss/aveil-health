/**
 * Aveil Wrapped: a shareable recap card in the Aveil app's design.
 * Screen one is the identity card; screen two is "the deeper cut".
 * Input is a period summary from buildPeriodSummary().
 */

import {
  ARCHETYPES,
  CHANGE_LABELS,
  FACT_LABELS,
  HERO,
  HIGHLIGHT_LABELS,
  LEVEL_LABELS,
  STRENGTH_NAMES,
  TIER_LABELS,
  WRAPPED,
  fill,
} from "./copy.js";
import { tierFor } from "./summary.js";
import {
  FONT_LINKS,
  GLYPHS,
  ICONS,
  TOKENS_CSS,
  capitalize,
  escapeHtml,
  formatCount,
  formatDay,
  formatDuration,
  formatRange,
  formatMinutesWords,
  formatUnit,
  joinList,
} from "./html.js";

const MEANINGFUL_FLOOR = { sleepMinutes: 15, deepMinutes: 10, remMinutes: 10, steps: 1000, hrv: 5, restingHR: 2 };
const CHANGE_METRIC_FOR_HIGHLIGHT = {
  total_steps: "steps",
  avg_sleep: "sleepMinutes",
  avg_deep_sleep: "deepMinutes",
  avg_rem_sleep: "remMinutes",
  avg_hrv: "hrv",
  avg_resting_hr: "restingHR",
};

/**
 * Turn a period summary into exactly what the card shows. Exported for tests.
 */
export function buildWrappedModel(summary) {
  assertSummary(summary);
  const period = summary.period.word;
  const hasData = summary.coverage.sleep + summary.coverage.recovery + summary.coverage.activity + summary.coverage.nutrition > 0;
  const base = {
    period,
    periodLine: summary.period.label,
    range: formatRange(summary.period.start, summary.period.end),
    hasData,
  };
  if (!hasData) return { ...base, emptyMessage: WRAPPED.noData };

  const standout = summary.standout;
  const archetypeKey = period === "week" && ARCHETYPES[`${standout.archetype}_week`]
    ? `${standout.archetype}_week`
    : standout.archetype;
  const archetype = ARCHETYPES[archetypeKey];
  const score = summary.scores.overall;
  const featured = bandPill(summary) || featuredMove(summary);

  return {
    ...base,
    archetype: standout.archetype,
    title: archetype.title,
    tagline: fill(archetype.tagline, { period }),
    glyph: standout.archetype,
    score,
    perfect: score === 100,
    hero: heroLine(summary),
    featured,
    cells: summary.highlights.map((item) => highlightCell(item, period, featured?.metric)),
    levels: levelRows(summary),
    facts: summary.facts.map((fact) => ({
      icon: fact.icon,
      value: formatUnit(fact.value, fact.unit === "steps" ? "steps_total" : fact.unit),
      label: FACT_LABELS[fact.key],
      day: formatDay(fact.day),
    })),
  };
}

function heroLine(summary) {
  const { standout, current, period } = summary;
  const word = period.word;
  switch (standout.archetype) {
    case "lights_out":
      return sentence(HERO.deep_sleep, formatMinutesWords(current.sleep.deepMinutes), word, true);
    case "unbothered":
      return standout.basis === "rhr"
        ? sentence(HERO.recovery_rhr, formatUnit(current.recovery.restingHR, "bpm"), word, true)
        : sentence(HERO.recovery_hrv, formatUnit(current.recovery.hrv, "ms"), word, true);
    case "engine":
      return sentence(HERO.activity, formatUnit(current.activity.steps, "steps"), word, true);
    case "clockwork":
      return sentence(HERO.regularity, formatMinutesWords(current.sleep.bedtimeSpreadMinutes), word, true);
    case "all_rounder": {
      // Deep sleep and sleep timing read as one area here: "sleep".
      const names = [...new Set(standout.strengths
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map((strength) => STRENGTH_NAMES[strength.dimension]))];
      return sentence(HERO.all_rounder, capitalize(joinList(names)), word, false);
    }
    case "on_the_rise":
      return sentence(HERO.on_the_rise, null, word, false);
    default:
      return sentence(HERO.first_read, null, word, false);
  }
}

// Split a template around {value} so the number can carry the accent color.
function sentence(template, value, period, accent) {
  const withPeriod = fill(template, { period });
  if (value == null || !withPeriod.includes("{value}")) {
    return { before: withPeriod, value: null, after: "", accent: false };
  }
  const [before, after] = withPeriod.split("{value}");
  return { before, value, after, accent };
}

// The app's prestige line: an age-based band, shown only when the summary found one.
function bandPill(summary) {
  if (!summary.recoveryBand) return null;
  return {
    metric: null,
    title: fill(WRAPPED.bandTitle, { value: summary.recoveryBand.band }),
    detail: WRAPPED.bandDetail,
    gold: true,
  };
}

function featuredMove(summary) {
  const improved = summary.changes.filter((change) => change.improved);
  if (!improved.length) return null;
  const top = improved.slice().sort((a, b) =>
    Math.abs(b.delta) / MEANINGFUL_FLOOR[b.metric] - Math.abs(a.delta) / MEANINGFUL_FLOOR[a.metric])[0];
  return {
    metric: top.metric,
    title: changeTitle(top),
    detail: fill(WRAPPED.biggestMove, { period: summary.period.word }),
    gold: false,
  };
}

function changeTitle(change) {
  const amount = changeAmount(change);
  switch (change.metric) {
    case "sleepMinutes": return `Sleep up ${amount} a night`;
    case "deepMinutes": return `Deep sleep up ${amount} a night`;
    case "remMinutes": return `REM sleep up ${amount} a night`;
    case "steps": return `Steps up ${amount} a day`;
    case "hrv": return `Recovery (HRV) up ${amount}`;
    case "restingHR": return `Resting heart rate down ${amount}`;
    default: return `${capitalize(CHANGE_LABELS[change.metric])} up ${amount}`;
  }
}

function changeAmount(change) {
  const size = Math.abs(change.delta);
  switch (change.metric) {
    case "sleepMinutes":
    case "deepMinutes":
    case "remMinutes":
      return `${Math.round(size)} min`;
    case "steps":
      return formatCount(size);
    case "hrv":
      return `${Math.round(size)} ms`;
    case "restingHR":
      return `${Math.round(size)} bpm`;
    default:
      return formatCount(size);
  }
}

function highlightCell(item, period, featuredMetric) {
  const metric = CHANGE_METRIC_FOR_HIGHLIGHT[item.key];
  const showChange = item.change && metric !== featuredMetric;
  let delta = null;
  if (showChange) {
    const sign = item.change.metric === "restingHR" ? "-" : "+";
    const unitText = item.change.metric === "steps" ? " a day" : "";
    delta = `${sign}${changeAmount(item.change)}${unitText} ${fill(WRAPPED.versusLast, { period })}`;
  }
  return {
    icon: item.icon,
    value: formatUnit(item.value, item.unit),
    label: fill(HIGHLIGHT_LABELS[item.key], { period }),
    tier: item.tier,
    tierLabel: item.tier ? TIER_LABELS[item.tier] : null,
    delta,
  };
}

function levelRows(summary) {
  const { current, scores, changes } = summary;
  const improvedDelta = (metric) => {
    const change = changes.find((entry) => entry.metric === metric && entry.improved);
    if (!change) return null;
    return `${change.metric === "restingHR" ? "-" : "+"}${changeAmount(change)}`;
  };
  const rows = [];
  if (current.sleep.nights >= 3) {
    rows.push({ icon: "moon", title: LEVEL_LABELS.sleep, value: formatDuration(current.sleep.averageMinutes), level: bucket(scores.parts.sleep), delta: improvedDelta("sleepMinutes") });
  }
  if (current.recovery.restingDays >= 3) {
    rows.push({ icon: "heart", title: LEVEL_LABELS.recovery_rhr, value: formatUnit(current.recovery.restingHR, "bpm"), level: bucket(scores.parts.recovery), delta: improvedDelta("restingHR") });
  } else if (current.recovery.hrvDays >= 3) {
    rows.push({ icon: "pulse", title: LEVEL_LABELS.recovery_hrv, value: formatUnit(current.recovery.hrv, "ms"), level: tierLevel(tierFor("hrv", current.recovery.hrv)), delta: improvedDelta("hrv") });
  }
  if (current.activity.days >= 3) {
    rows.push({ icon: "walk", title: LEVEL_LABELS.activity, value: `${formatCount(current.activity.steps)}/day`, level: bucket(scores.parts.activity), delta: improvedDelta("steps") });
  }
  if (current.nutrition.proteinDays >= 3) {
    const protein = current.nutrition.protein;
    rows.push({ icon: "leaf", title: LEVEL_LABELS.nutrition, value: `${Math.round(protein)} g/day`, level: protein >= 120 ? 4 : protein >= 100 ? 3 : protein >= 75 ? 2 : 1, delta: null });
  }
  return rows;
}

// Four-step level scale, like the app's level rows. No score yet (fewer than
// 5 days) means no scale, rather than a misleading lowest level.
function bucket(score) {
  if (score == null) return null;
  if (score >= 85) return 4;
  if (score >= 65) return 3;
  if (score >= 40) return 2;
  return 1;
}

function tierLevel(tier) {
  return { elite: 4, strong: 3, fair: 2 }[tier] || 1;
}

function assertSummary(summary) {
  if (!summary || !summary.period || !summary.coverage) {
    throw new TypeError("generateWrappedHTML expects the output of buildPeriodSummary(data, { days }).");
  }
}

// ─── HTML ───

/**
 * Generate the self-contained HTML card.
 * @param {object} summary - from buildPeriodSummary()
 * @param {object} [options]
 * @param {Date} [options.generatedAt]
 */
export function generateWrappedHTML(summary, options = {}) {
  const model = buildWrappedModel(summary);
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const accent = model.perfect ? "var(--gold)" : "var(--amber)";

  const body = model.hasData
    ? `${heroCard(model, accent)}\n${detailCard(model)}`
    : emptyCard(model);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aveil Wrapped</title>
${FONT_LINKS}
<style>
${TOKENS_CSS}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1;padding:40px 16px 32px;min-height:100vh}
.spread{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:24px}
.story{width:400px;max-width:100%;border:1px solid var(--rule);border-radius:12px;overflow:hidden;position:relative;background:#0B0907;padding:34px 22px 26px}
.story-hero{background:
  radial-gradient(120% 70% at 50% -10%,rgba(224,150,60,0.22) 0%,rgba(224,150,60,0.06) 35%,rgba(224,150,60,0) 60%),
  linear-gradient(180deg,#1A1206 0%,#0B0907 38%,#0B0907 100%)}
.eyebrow{font-family:var(--mono);font-weight:500;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${accent};text-align:center}
.period{font-family:var(--mono);font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);text-align:center;margin-top:8px}
.range{font-size:12px;color:var(--ink-3);text-align:center;margin-top:5px}
.glyph{width:46px;height:46px;margin:26px auto 0;color:${accent}}
.glyph svg{width:100%;height:100%;display:block}
.title{font-weight:600;font-size:34px;line-height:1.05;letter-spacing:-.015em;text-align:center;margin-top:14px;color:${model.perfect ? "var(--gold)" : "var(--ink)"}}
.tagline{font-size:14px;line-height:1.45;color:${accent};text-align:center;margin-top:10px}
.ring{width:112px;height:112px;margin:24px auto 0;position:relative}
.ring svg{width:100%;height:100%;display:block;transform:rotate(-90deg)}
.ring-score{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:30px;color:var(--ink)}
.hero{font-weight:600;font-size:16px;line-height:1.42;text-align:center;margin:22px 6px 0;color:var(--ink)}
.hero .accent{color:${accent}}
.pill{display:flex;align-items:center;gap:12px;min-height:64px;margin-top:20px;padding:12px 14px;border:1px solid rgba(217,122,43,0.28);background:rgba(217,122,43,0.06);border-radius:4px}
.pill-title{font-weight:600;font-size:17px;line-height:1.25;color:var(--ink)}
.pill-detail{font-size:12px;color:var(--ink-2);margin-top:2px}
.pill-gold{border-color:rgba(232,180,90,0.55);background:rgba(232,180,90,0.12)}
.pill-gold .pill-title{color:var(--gold)}
.pill-gold .icon-box{background:rgba(232,180,90,0.12);color:var(--gold)}
.icon-box{width:30px;height:30px;border-radius:4px;background:rgba(217,122,43,0.12);color:var(--amber);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.icon-box svg{width:16px;height:16px;display:block}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.cell{background:var(--bg-2);border:1px solid var(--rule);border-radius:4px;padding:14px 10px 13px;text-align:center;display:flex;flex-direction:column;align-items:center}
.cell-top{display:flex;align-items:center;justify-content:center;gap:8px}
.cell-value{font-weight:600;font-size:19px;color:var(--ink);white-space:nowrap}
.cell-label{font-weight:500;font-size:12px;color:var(--ink-2);margin-top:8px;line-height:1.3}
.cell-delta{font-size:11px;color:var(--amber);margin-top:5px;display:flex;align-items:center;gap:3px}
.cell-delta svg{width:11px;height:11px}
.tag{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:3px;border:1px solid;margin-top:8px}
.tag-elite{color:var(--gold);border-color:rgba(232,180,90,0.65)}
.tag-strong{color:var(--amber);border-color:rgba(217,122,43,0.65)}
.tag-fair{color:var(--muted);border-color:rgba(111,101,84,0.65)}
.cut-eyebrow{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${accent}}
.cut-period{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-top:6px}
.cut-range{font-size:12px;color:var(--ink-3);margin-top:4px}
.section{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin:26px 0 12px}
.level{display:flex;align-items:center;gap:12px;padding:12px 0}
.level + .level{border-top:1px solid var(--rule)}
.level-main{flex:1;min-width:0}
.level-title{font-weight:500;font-size:14px;color:var(--ink)}
.level-value{font-family:var(--mono);font-size:13px;color:var(--ink-2);margin-top:3px}
.scale{display:flex;gap:3px;margin-top:8px}
.scale span{width:26px;height:4px;border-radius:2px;background:var(--rule-2)}
.scale span.on{background:var(--amber)}
.level-delta{font-size:12px;color:var(--amber);display:flex;align-items:center;gap:3px;white-space:nowrap}
.level-delta svg{width:12px;height:12px}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fact{background:var(--bg-2);border:1px solid var(--rule);border-radius:4px;padding:13px 12px}
.fact-value{font-weight:600;font-size:18px;color:var(--ink);white-space:nowrap}
.fact-label{font-size:12px;color:var(--ink-2);margin-top:6px;line-height:1.3}
.fact-day{font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-top:4px}
.empty{font-size:15px;line-height:1.5;color:var(--ink-2);text-align:center;margin-top:28px}
.footer{font-family:var(--mono);font-size:11px;letter-spacing:.04em;color:var(--muted);text-align:center;margin-top:22px}
@media (max-width:440px){body{padding:16px 10px}.story{padding:28px 16px 22px}.title{font-size:30px}}
</style>
</head>
<body>
<main class="spread">
${body}
</main>
<p class="footer">${escapeHtml(WRAPPED.footer)}</p>
</body>
</html>`;

  return {
    html,
    filename: `aveil-wrapped-${generatedAt.toISOString().slice(0, 10)}.html`,
  };
}

function heroCard(model, accent) {
  const hero = model.hero;
  const heroHtml = hero.value == null
    ? escapeHtml(hero.before)
    : `${escapeHtml(hero.before)}<span class="${hero.accent ? "accent" : ""}">${escapeHtml(hero.value)}</span>${escapeHtml(hero.after)}`;

  return `<section class="story story-hero" aria-label="Aveil Wrapped">
  <div class="eyebrow">${escapeHtml(WRAPPED.eyebrow)}</div>
  <div class="period">${escapeHtml(model.periodLine)}</div>
  <div class="range">${escapeHtml(model.range)}</div>
  <div class="glyph">${GLYPHS[model.glyph] || GLYPHS.tracker}</div>
  <h1 class="title">${escapeHtml(model.title)}</h1>
  <p class="tagline">${escapeHtml(model.tagline)}</p>
  ${model.score == null ? "" : scoreRing(model.score, accent)}
  <p class="hero">${heroHtml}</p>
  ${model.featured ? `<div class="pill${model.featured.gold ? " pill-gold" : ""}"><div class="icon-box">${ICONS.star}</div><div><div class="pill-title">${escapeHtml(model.featured.title)}</div><div class="pill-detail">${escapeHtml(model.featured.detail)}</div></div></div>` : ""}
  ${model.cells.length ? `<div class="grid">${model.cells.map(cellHtml).join("")}</div>` : ""}
</section>`;
}

function scoreRing(score, accent) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return `<div class="ring" role="img" aria-label="Score ${score} out of 100">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(242,236,224,0.08)" stroke-width="6"/><circle cx="60" cy="60" r="${radius}" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${filled.toFixed(2)} ${circumference.toFixed(2)}"/></svg>
    <div class="ring-score">${score}</div>
  </div>`;
}

function cellHtml(cell) {
  return `<div class="cell">
    <div class="cell-top"><div class="icon-box">${ICONS[cell.icon] || ICONS.star}</div><div class="cell-value">${escapeHtml(cell.value)}</div></div>
    <div class="cell-label">${escapeHtml(cell.label)}</div>
    ${cell.delta ? `<div class="cell-delta">${ICONS.arrowUp}${escapeHtml(cell.delta)}</div>` : ""}
    ${cell.tier ? `<span class="tag tag-${cell.tier}">${escapeHtml(cell.tierLabel)}</span>` : ""}
  </div>`;
}

function detailCard(model) {
  const levels = model.levels.map((row) => `<div class="level">
      <div class="icon-box">${ICONS[row.icon]}</div>
      <div class="level-main">
        <div class="level-title">${escapeHtml(row.title)}</div>
        <div class="level-value">${escapeHtml(row.value)}</div>
        ${row.level == null ? "" : `<div class="scale" aria-label="Level ${row.level} of 4">${[1, 2, 3, 4].map((step) => `<span class="${step <= row.level ? "on" : ""}"></span>`).join("")}</div>`}
      </div>
      ${row.delta ? `<div class="level-delta">${ICONS.arrowUp}${escapeHtml(row.delta)}</div>` : ""}
    </div>`).join("");

  const facts = model.facts.map((fact) => `<div class="fact">
      <div class="fact-value">${escapeHtml(fact.value)}</div>
      <div class="fact-label">${escapeHtml(fact.label)}</div>
      <div class="fact-day">${escapeHtml(fact.day)}</div>
    </div>`).join("");

  return `<section class="story" aria-label="${escapeHtml(WRAPPED.deeperCut)}">
  <div class="cut-eyebrow">${escapeHtml(WRAPPED.eyebrow)}</div>
  <div class="cut-period">${escapeHtml(`${model.periodLine} · ${WRAPPED.deeperCut}`)}</div>
  <div class="cut-range">${escapeHtml(model.range)}</div>
  ${levels ? `<div class="section">${escapeHtml(fill(WRAPPED.levelsHeading, { period: model.period }))}</div>${levels}` : ""}
  ${facts ? `<div class="section">${escapeHtml(WRAPPED.factsHeading)}</div><div class="facts">${facts}</div>` : ""}
</section>`;
}

function emptyCard(model) {
  return `<section class="story story-hero">
  <div class="eyebrow">${escapeHtml(WRAPPED.eyebrow)}</div>
  <div class="period">${escapeHtml(model.periodLine)}</div>
  <p class="empty">${escapeHtml(model.emptyMessage)}</p>
</section>`;
}
