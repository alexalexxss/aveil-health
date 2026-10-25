/**
 * Shared pieces for the HTML outputs: Aveil colors and fonts, icons, and
 * number formats. Colors and type follow the Aveil app's design tokens.
 */

export const FONT_LINKS = `<link rel="preconnect" href="https://api.fontshare.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

export const TOKENS_CSS = `:root{
  --bg:#0C0907;
  --bg-2:#13100C;
  --bg-3:#1A1610;
  --ink:#F2ECE0;
  --ink-2:#D4C8B1;
  --ink-3:#A89981;
  --muted:#6F6554;
  --rule:rgba(242,236,224,0.08);
  --rule-2:rgba(242,236,224,0.14);
  --amber:#D97A2B;
  --amber-dim:#8B4D1C;
  --gold:#E8B45A;
  --sans:"Switzer",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
*{margin:0;padding:0;box-sizing:border-box}`;

const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" fill="currentColor"/></svg>`,
  walk: `<svg viewBox="0 0 24 24" aria-hidden="true" ${STROKE}><circle cx="13" cy="4.5" r="1.8" fill="currentColor" stroke="none"/><path d="m10 21 2.2-5.6L15 18v3"/><path d="m12.2 15.4 1-5.6-3 1.4-1.6 3"/><path d="m13.2 9.8 1.8 3 3 .9"/></svg>`,
  pulse: `<svg viewBox="0 0 24 24" aria-hidden="true" ${STROKE}><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill="currentColor"/></svg>`,
  dumbbell: `<svg viewBox="0 0 24 24" aria-hidden="true" ${STROKE}><path d="M7 12h10"/><rect x="4" y="8" width="3" height="8" rx="1" fill="currentColor"/><rect x="17" y="8" width="3" height="8" rx="1" fill="currentColor"/><path d="M2.5 10.5v3M21.5 10.5v3"/></svg>`,
  leaf: `<svg viewBox="0 0 24 24" aria-hidden="true" ${STROKE}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z"/><path d="M5 19 13 11"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8Z" fill="currentColor"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24" aria-hidden="true" ${STROKE}><path d="M7 17 17 7M9 7h8v8"/></svg>`,
};

export const GLYPHS = {
  lights_out: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M36 30.5A14.5 14.5 0 0 1 17.5 12a14.5 14.5 0 1 0 18.5 18.5Z" fill="currentColor"/><path d="m33 7 1.2 3 3 1.2-3 1.2L33 15.4l-1.2-3-3-1.2 3-1.2Z" fill="currentColor"/><path d="m39.5 16 .8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z" fill="currentColor"/></svg>`,
  clockwork: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M24 14v10.5l6.5 4" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  unbothered: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 40s-14-8.6-14-19a8 8 0 0 1 14-5.3A8 8 0 0 1 38 21c0 10.4-14 19-14 19Z" fill="currentColor"/><path d="M14 24h5l2.5-4 4 8 2.5-4H34" fill="none" stroke="#0C0907" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  engine: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M27 5 11 27h11l-3 16 18-24H25.5Z" fill="currentColor"/></svg>`,
  on_the_rise: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m8 34 11-11 7 7 13-14" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 15h10v10" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  all_rounder: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="12" r="7" fill="currentColor"/><circle cx="12" cy="24" r="7" fill="currentColor"/><circle cx="36" cy="24" r="7" fill="currentColor"/><circle cx="24" cy="36" r="7" fill="currentColor"/></svg>`,
  tracker: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="25" width="7" height="14" rx="2" fill="currentColor"/><rect x="20.5" y="16" width="7" height="23" rx="2" fill="currentColor"/><rect x="32" y="9" width="7" height="30" rx="2" fill="currentColor"/></svg>`,
  warming_up: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 32a12 12 0 0 1 24 0Z" fill="currentColor"/><path d="M6 37h36M24 9v5M11.5 14.5l3.4 3.4M36.5 14.5l-3.4 3.4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ─── Number formats ───

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "–";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

export function formatMinutesWords(minutes) {
  const rounded = Math.round(minutes);
  return `${rounded} ${rounded === 1 ? "minute" : "minutes"}`;
}

export function formatCount(value) {
  if (!Number.isFinite(value)) return "–";
  return Math.round(value).toLocaleString("en-US");
}

export function formatUnit(value, unit) {
  if (!Number.isFinite(value)) return "–";
  switch (unit) {
    case "minutes": return formatDuration(value);
    case "ms": return `${Math.round(value)} ms`;
    case "bpm": return `${Math.round(value)} bpm`;
    case "grams": return `${Math.round(value)} g`;
    case "steps": return `${formatCount(value)} steps`;
    case "steps_total": return formatCount(value);
    case "nights": return `${Math.round(value)} ${Math.round(value) === 1 ? "night" : "nights"}`;
    default: return formatCount(value);
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(isoDay) {
  const [year, month, day] = String(isoDay).split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatRange(startDay, endDay) {
  const startYear = startDay.slice(0, 4);
  const endYear = endDay.slice(0, 4);
  const start = startYear === endYear ? formatDay(startDay) : `${formatDay(startDay)}, ${startYear}`;
  return `${start} – ${formatDay(endDay)}, ${endYear}`;
}

export function joinList(items) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
