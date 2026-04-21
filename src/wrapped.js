/**
 * Generate a shareable "wrapped" health card as self-contained HTML.
 * Think Spotify Wrapped meets WHOOP — dark, premium, screenshottable.
 */

// ─── Population benchmarks (age-adjusted general adult ranges) ───
// Benchmarks: general adult population estimates.
// HRV varies significantly by age/sex (Kubios 2024, Welltory 2023 meta-analysis, 296k+).
// RHR: AHA normal 60-100; athletes as low as 40 (WHOOP avg ~55-59 for health-conscious users).
// Steps: Lancet 2025 meta-analysis — 7k/day is the meaningful health threshold.
// Deep sleep: Sleep Foundation — adults typically 10-20% of total sleep (40-110min for 7-9h).
const BENCHMARKS = {
  hrv: [
    { max: 20, label: "Low", pct: "below average" },
    { max: 35, label: "Below average", pct: "~30th percentile" },
    { max: 50, label: "Average", pct: "~50th percentile" },
    { max: 70, label: "Above average", pct: "top ~30%" },
    { max: 100, label: "Strong", pct: "top ~15%" },
    { max: Infinity, label: "Elite", pct: "top ~5%" },
  ],
  rhr: [
    { max: 50, label: "Athlete-level", pct: "top ~5%" },
    { max: 60, label: "Very fit", pct: "top ~20%" },
    { max: 70, label: "Good", pct: "top ~40%" },
    { max: 80, label: "Average", pct: "~50th percentile" },
    { max: Infinity, label: "Above average", pct: "below 50th" },
  ],
  steps: [
    { max: 4000, label: "Sedentary", pct: "below average" },
    { max: 7000, label: "Moderate", pct: "~40th percentile" },
    { max: 10000, label: "Active", pct: "top ~35%" },
    { max: 12500, label: "Very active", pct: "top ~20%" },
    { max: Infinity, label: "Highly active", pct: "top ~10%" },
  ],
  sleepHours: [
    { max: 5, label: "Very short", pct: "below average" },
    { max: 6, label: "Short", pct: "~25th percentile" },
    { max: 7, label: "Adequate", pct: "~50th percentile" },
    { max: 8, label: "Optimal", pct: "top ~30%" },
    { max: 9, label: "Long", pct: "top ~15%" },
    { max: Infinity, label: "Very long", pct: "top ~5%" },
  ],
  deepSleep: [
    { max: 20, label: "Low", pct: "below average" },
    { max: 40, label: "Below average", pct: "~35th percentile" },
    { max: 60, label: "Average", pct: "~50th percentile" },
    { max: 90, label: "Above average", pct: "top ~25%" },
    { max: Infinity, label: "Strong", pct: "top ~10%" },
  ],
};

function getBenchmark(category, value) {
  const tiers = BENCHMARKS[category];
  if (!tiers || value == null) return null;
  for (const t of tiers) {
    if (value <= t.max) return t;
  }
  return tiers[tiers.length - 1];
}

// ─── Inline SVG icons (monochrome, 24x24 viewBox) ───
const ARCHETYPE_ICONS = {
  longevity: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" stroke="#d8b4fe" stroke-width="1.5" fill="#d8b4fe" fill-opacity="0.15" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.5" stroke="#d8b4fe" stroke-width="1.3"/></svg>`,
  optimizer: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clockwork: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#c4b5fd" stroke-width="1.5"/><path d="M12 7v5l3 3" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  recovered: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#c4b5fd" stroke-width="1.5"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round"/><path d="M9 9h.01M15 9h.01" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/></svg>`,
  mover: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 4v7h6" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 20l5-7 3 3 6-8" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  deepSleeper: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  endurance: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  recharger: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="7" width="12" height="14" rx="2" stroke="#c4b5fd" stroke-width="1.5"/><path d="M10 3h4" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round"/><path d="M12 11v4M10 13h4" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  burner: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c4-4 8-7.582 8-12a8 8 0 10-16 0c0 4.418 4 8 8 12z" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13a3 3 0 100-6 3 3 0 000 6z" stroke="#c4b5fd" stroke-width="1.5"/></svg>`,
  nightOwl: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="10" r="1.5" stroke="#c4b5fd" stroke-width="1.5"/><circle cx="15" cy="10" r="1.5" stroke="#c4b5fd" stroke-width="1.5"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="#c4b5fd" stroke-width="1.5"/><path d="M9 16s1.5 1 3 1 3-1 3-1" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round"/><path d="M3 12c2-1 3-3 3-3s1 2 3 3M15 9c2-1 3-3 3-3s1 2 3 3" stroke="#c4b5fd" stroke-width="1" stroke-linecap="round" opacity="0.5"/></svg>`,
  tracker: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3v18h18" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 16l4-5 4 4 5-7" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  earlyBird: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" stroke="#c4b5fd" stroke-width="1.5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  ironMind: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 7v6c0 5.25 3.4 10.15 8 11.25 4.6-1.1 8-6 8-11.25V7l-8-5z" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  zenMaster: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#c4b5fd" stroke-width="1.7" opacity="0.28"/><path d="M12 5.8L13.9 10.1L18.2 12L13.9 13.9L12 18.2L10.1 13.9L5.8 12L10.1 10.1L12 5.8Z" stroke="#c4b5fd" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.6" fill="#c4b5fd"/></svg>`,
};

/**
 * Compute health identity with evidence (Archer: identity + proof is the shareable unit).
 */
export function computeHealthIdentity(report) {
  const s = report.sleep;
  const r = report.recovery;
  const a = report.activity;
  const score = report.overall?.score ?? 0;

  // --- Tier 1: Elite overall ---
  if (score > 90) {
    return { title: "Longevity Champion", tagline: "Sleep, recovery, activity — all elite. You're not optimizing for today. You're optimizing for decades.", icon: ARCHETYPE_ICONS.longevity, elite: true };
  }
  if (score > 85) {
    return { title: "The Optimizer", tagline: "Every metric dialed. You don't guess — you measure, adjust, and win.", icon: ARCHETYPE_ICONS.optimizer };
  }

  // --- Tier 2: Elite physiological outcomes (highest status) ---
  if (r?.available && r.averageRHR && r.averageRHR < 55)
    return { title: "The Endurance Engine", tagline: "Resting heart rate of an athlete. Your cardiovascular system was built for distance.", icon: ARCHETYPE_ICONS.endurance };
  if (r?.available && r.averageHRV > 80)
    return { title: "The Recovered", tagline: "Your nervous system recovers like it's being paid to. Most people wish.", icon: ARCHETYPE_ICONS.recovered };
  if (a?.available && a.averages?.stepsPerDay > 12000)
    return { title: "The Mover", tagline: "12K+ steps is your baseline. Some people call that a hike.", icon: ARCHETYPE_ICONS.mover };
  if (s?.available && s.averages?.deepMinutes > 60)
    return { title: "The Deep Sleeper", tagline: "60+ minutes of deep sleep per night. Your brain rebuilds while the world scrolls.", icon: ARCHETYPE_ICONS.deepSleeper };
  if (a?.available && a.averages?.activeEnergyPerDay > 600)
    return { title: "The Burner", tagline: "600+ kcal burned daily. Your metabolism runs like it has somewhere to be.", icon: ARCHETYPE_ICONS.burner };

  // --- Tier 3: Behavioral/consistency archetypes ---
  if (s?.available && s.averages?.bedtimeHour < 21.5 && s.averages?.durationMinutes >= 360)
    return { title: "The Early Bird", tagline: "Asleep before most people finish dinner. The morning belongs to you.", icon: ARCHETYPE_ICONS.earlyBird };
  if (s?.available && s.averages?.bedtimeHour < 22 && s.averages?.bedtimeVariability < 0.5)
    return { title: "The Clockwork", tagline: "Same time, every night. Your circadian rhythm doesn't negotiate.", icon: ARCHETYPE_ICONS.clockwork };
  if (s?.available && s.averages?.bedtimeVariability < 0.5 && score >= 65 && r?.available && r.averageHRV >= 40)
    return { title: "The Iron Mind", tagline: "Nothing flashy, nothing skipped. Consistency is your unfair advantage.", icon: ARCHETYPE_ICONS.ironMind };
  if (s?.available && s.averages?.durationMinutes > 480)
    return { title: "The Recharger", tagline: "8+ hours every night. Your body recovers while others burn out.", icon: ARCHETYPE_ICONS.recharger };
  if (r?.available && r.averageHRV >= 50 && s?.available && s.averages?.durationMinutes >= 420 && a?.available && a.averages?.stepsPerDay >= 6000)
    return { title: "The Zen Master", tagline: "Nothing extreme, nothing neglected. You play the long game across every metric.", icon: ARCHETYPE_ICONS.zenMaster };

  // --- Tier 4: Fallback ---
  if (s?.available && s.averages?.bedtimeHour >= 24)
    return { title: "The Night Owl", tagline: "The world sleeps, you create. Late nights are your territory.", icon: ARCHETYPE_ICONS.nightOwl };

  return { title: "The Tracker", tagline: "Most people never look at their data. You did — and that's where every improvement starts.", icon: ARCHETYPE_ICONS.tracker };
}

function toTopPercent(pctLabel) {
  if (!pctLabel) return null;
  const lower = pctLabel.toLowerCase();
  // Match "top ~X%" or "top X%"
  const topMatch = lower.match(/top\s*~?(\d+)/);
  if (topMatch) return parseInt(topMatch[1], 10);
  // Match "~Xth percentile" or "Xth percentile"
  const pctMatch = lower.match(/~?(\d+)(?:st|nd|rd|th) percentile/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    return Math.max(1, 100 - pct);
  }
  return null;
}

/**
 * Pick the single most impressive percentile-based flex.
 * Keep this structurally consistent across all cards.
 */
export function computeHeroBoast(report, comparisons) {
  const candidates = [];

  for (const c of comparisons) {
    const topPct = toTopPercent(c.pct);
    if (topPct != null) {
      candidates.push({
        text: `Top ${topPct}% ${c.metric}`,
        impressiveness: 100 - topPct,
        value: c.value,
      });
    }
  }

  candidates.sort((a, b) => b.impressiveness - a.impressiveness);
  return candidates[0] || null;
}

export function computeWalkStat(report) {
  if (!report.activity?.available || !report.activity.averages?.stepsPerDay) return null;
  const totalDays = report.activity.totalDays || report.activity.daysAnalyzed || 30;
  const totalSteps = report.activity.averages.stepsPerDay * totalDays;
  const km = totalSteps * 0.000762;
  if (km <= 0) return null;

  const routes = [
    { km: 3944, route: "New York → Los Angeles" },
    { km: 2500, route: "London → Istanbul" },
    { km: 1160, route: "Tokyo → Seoul" },
    { km: 615, route: "San Francisco → LA" },
    { km: 430, route: "Paris → Amsterdam" },
    { km: 306, route: "Boston → NYC" },
    { km: 150, route: "London → Birmingham" },
  ];

  let bestRoute = null;
  for (const r of routes) {
    if (km >= r.km * 0.85) {
      bestRoute = r;
      break;
    }
  }

  return {
    text: bestRoute
      ? `Walked ${Math.round(km).toLocaleString()}km, the distance from ${bestRoute.route}`
      : `Walked ${Math.round(km).toLocaleString()}km in this period`,
  };
}

/**
 * Compute a fun calorie equivalence — "you burned X, that's enough to..."
 * This is the shareable flex line.
 */
export function computeCalorieEquivalence(report) {
  if (!report.activity?.available || !report.activity.averages?.activeEnergyPerDay) return null;
  const days = report.activity.totalDays || report.activity.daysAnalyzed || 30;
  const totalKcal = Math.round(report.activity.averages.activeEnergyPerDay * days);
  if (totalKcal < 1000) return null;

  // Fun equivalences sorted by kcal threshold (descending) — varied, no repeats
  const equivalences = [
    { min: 500000, text: (k) => `You burned ${k.toLocaleString()} kcal — enough to climb Everest ${(k / 20000).toFixed(0)} times` },
    { min: 250000, text: (k) => `You burned ${k.toLocaleString()} kcal — equivalent to running ${Math.round(k / 2600)} marathons` },
    { min: 100000, text: (k) => `You burned ${k.toLocaleString()} kcal — enough to power your phone for ${Math.round(k / 2.5)} days` },
    { min: 50000,  text: (k) => `You burned ${k.toLocaleString()} kcal — that's ${Math.round(k / 500)} hours of swimming` },
    { min: 25000,  text: (k) => `You burned ${k.toLocaleString()} kcal — about ${Math.round(k / 100)}km worth of running` },
    { min: 10000,  text: (k) => `You burned ${k.toLocaleString()} kcal — equivalent to cycling ${Math.round(k / 30)}km` },
    { min: 5000,   text: (k) => `You burned ${k.toLocaleString()} kcal — enough to hike for ${Math.round(k / 400)} hours straight` },
    { min: 1000,   text: (k) => `You burned ${k.toLocaleString()} kcal — about ${Math.round(k / 100)} 5K runs worth of energy` },
  ];

  for (const eq of equivalences) {
    if (totalKcal >= eq.min) return { text: eq.text(totalKcal), totalKcal };
  }
  return { text: `You burned ${totalKcal.toLocaleString()} kcal`, totalKcal };
}

/**
 * Compute a surprising derived stat the user didn't know.
 * This is the conversation-starter.
 */
export function computeDerivedStat(report) {
  const stats = [];

  // Bedtime inconsistency → estimated sleep cost
  if (report.sleep?.available && report.sleep.averages?.bedtimeVariability != null) {
    const varMin = report.sleep.averages.bedtimeVariability * 60;
    if (varMin > 30) {
      // Research: each 30min of social jetlag costs ~15min of effective sleep
      const daysAnalyzed = report.sleep.nightsAnalyzed || 14;
      const costPerNight = (varMin / 30) * 15; // minutes lost per night
      const totalCost = Math.round(costPerNight * daysAnalyzed / 60);
      if (totalCost > 2) {
        stats.push({ text: `Your bedtime inconsistency likely cost ~${totalCost} hours of effective sleep`, impact: totalCost });
      }
    }
  }

  // Steps → distance equivalent
  if (report.activity?.available && report.activity.averages?.stepsPerDay) {
    const totalDays = report.activity.totalDays || 30;
    const totalSteps = report.activity.averages.stepsPerDay * totalDays;
    const km = totalSteps * 0.000762;
    // Find a fun city-to-city distance
    const distances = [
      { route: "New York → Los Angeles", km: 3944 },
      { route: "London → Istanbul", km: 2500 },
      { route: "Tokyo → Seoul", km: 1160 },
      { route: "San Francisco → LA", km: 615 },
      { route: "Paris → Amsterdam", km: 430 },
      { route: "Boston → NYC", km: 306 },
    ];
    for (const d of distances) {
      if (km >= d.km * 0.85) {
        stats.push({ text: `You walked the equivalent of ${d.route} (${Math.round(km).toLocaleString()}km)`, impact: km / 100 });
        break;
      }
    }
  }

  // Deep sleep hours over period
  if (report.sleep?.available && report.sleep.averages?.deepMinutes > 0) {
    const nights = report.sleep.nightsAnalyzed || 14;
    const totalDeepHours = Math.round(report.sleep.averages.deepMinutes * nights / 60);
    const averageDeepMinutes = report.sleep.averages.deepMinutes;
    if (totalDeepHours > 10) {
      let descriptor = "a solid base to build on";
      if (averageDeepMinutes >= 75) descriptor = "a standout recovery signal";
      else if (averageDeepMinutes >= 60) descriptor = "a strong recovery pattern";
      stats.push({
        text: `${totalDeepHours} hours of deep sleep total, averaging ${averageDeepMinutes} min a night, ${descriptor}`,
        impact: totalDeepHours / 5,
      });
    }
  }

  stats.sort((a, b) => b.impact - a.impact);
  return stats[0] || null;
}

/**
 * Compute population comparisons for key metrics.
 */
export function computeComparisons(report) {
  const comps = [];

  if (report.recovery?.available && report.recovery.averageHRV) {
    const v = Math.round(report.recovery.averageHRV);
    const b = getBenchmark("hrv", v);
    if (b) comps.push({ metric: "HRV", value: `${v}ms`, tier: b.label, pct: b.pct,
      fact: v > 60 ? "Higher HRV = stronger stress resilience and faster recovery" : "HRV reflects your autonomic nervous system's adaptability" });
  }
  if (report.recovery?.available && report.recovery.averageRHR) {
    const v = Math.round(report.recovery.averageRHR);
    const b = getBenchmark("rhr", v);
    if (b) comps.push({ metric: "Resting HR", value: `${v}bpm`, tier: b.label, pct: b.pct,
      fact: v < 55 ? "You have the resting heart rate of a trained endurance athlete" : v < 65 ? "Lower resting HR correlates with cardiovascular longevity" : "Resting HR improves with consistent aerobic training" });
  }
  if (report.activity?.available && report.activity.averages?.stepsPerDay) {
    const v = report.activity.averages.stepsPerDay;
    const b = getBenchmark("steps", v);
    if (b) comps.push({ metric: "Daily Steps", value: v.toLocaleString(), tier: b.label, pct: b.pct,
      fact: v > 10000 ? "You exceed the 10K threshold linked to reduced all-cause mortality" : v > 7500 ? "Each additional 2,000 steps reduces cardiovascular risk ~8%" : "Even small increases in daily steps compound over time" });
  }
  if (report.sleep?.available && report.sleep.averages?.durationMinutes) {
    const hrs = report.sleep.averages.durationMinutes / 60;
    const b = getBenchmark("sleepHours", hrs);
    if (b) comps.push({ metric: "Sleep Duration", value: `${hrs.toFixed(1)}h`, tier: b.label, pct: b.pct,
      fact: hrs >= 7 ? "You hit the 7-9h window where cognitive performance peaks" : "Adults sleeping <7h show measurable cognitive decline within days" });
  }
  if (report.sleep?.available && report.sleep.averages?.deepMinutes) {
    const v = Math.round(report.sleep.averages.deepMinutes);
    const b = getBenchmark("deepSleep", v);
    if (b) comps.push({ metric: "Deep Sleep", value: `${v}min`, tier: b.label, pct: b.pct,
      fact: v > 60 ? "Deep sleep is when growth hormone peaks and tissue repair happens" : "Deep sleep is your body's physical recovery window" });
  }

  return comps;
}

/**
 * Compute 2-3 surprising / shareable stats from the report.
 */
export function computeSurprisingStats(report) {
  const stats = [];
  const daysAnalyzed = report.activity?.daysAnalyzed || report.sleep?.nightsAnalyzed || report.recovery?.daysAnalyzed || 0;

  // Total steps in the analyzed period
  if (report.activity?.available && report.activity.averages?.stepsPerDay && daysAnalyzed > 0) {
    const total = Math.round(report.activity.averages.stepsPerDay * daysAnalyzed);
    stats.push({
      label: "Total Steps",
      value: total.toLocaleString(),
      detail: `across ${daysAnalyzed} days`,
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

/**
 * Generate better wrapped-specific insights (not just the generic signals).
 */
function generateWrappedInsights(report) {
  const insights = [];

  // Sleep architecture insight
  if (report.sleep?.available && report.sleep.averages) {
    const { deepMinutes, remMinutes, durationMinutes } = report.sleep.averages;
    const deepPct = durationMinutes > 0 ? ((deepMinutes / (durationMinutes / 60 * 60)) * 100).toFixed(0) : 0;
    const remPct = durationMinutes > 0 ? ((remMinutes / (durationMinutes / 60 * 60)) * 100).toFixed(0) : 0;
    if (deepMinutes < 45) {
      insights.push({
        title: "Deep sleep is your bottleneck",
        detail: `${deepMinutes}min avg deep sleep (${deepPct}% of total). Adults need 60-90min for physical recovery. Later dinners, alcohol, and elevated body temperature are common suppressors.`,
      });
    } else if (deepMinutes >= 60) {
      insights.push({
        title: "Deep sleep is a strength",
        detail: `${deepMinutes}min avg — above the 60min recovery threshold. This supports muscle repair, immune function, and memory consolidation.`,
      });
    }
    if (remMinutes < 60) {
      insights.push({
        title: "REM sleep could improve",
        detail: `${remMinutes}min avg REM. This stage handles emotional processing and learning. Common suppressors: stress, late caffeine, irregular schedule.`,
      });
    }
  }

  // HRV + recovery insight
  if (report.recovery?.available) {
    const { averageHRV, averageRHR, latestHRV } = report.recovery;
    if (averageHRV && latestHRV) {
      const diff = latestHRV - averageHRV;
      if (diff > 10) {
        insights.push({
          title: "Recovery is trending up",
          detail: `Latest HRV ${Math.round(latestHRV)}ms is ${Math.round(diff)}ms above your baseline. Your autonomic nervous system is responding well to your current routine.`,
        });
      } else if (diff < -10) {
        insights.push({
          title: "Recovery dip detected",
          detail: `Latest HRV ${Math.round(latestHRV)}ms is ${Math.abs(Math.round(diff))}ms below baseline. Common causes: poor sleep, alcohol, stress, overtraining, or illness onset.`,
        });
      }
    }
    if (averageRHR && averageRHR < 55) {
      insights.push({
        title: "Resting heart rate is strong",
        detail: `${Math.round(averageRHR)}bpm avg — athlete range. This correlates with cardiovascular fitness and longevity.`,
      });
    }
  }

  // Bedtime consistency insight
  if (report.sleep?.available && report.sleep.averages?.bedtimeVariability != null) {
    const varMin = Math.round(report.sleep.averages.bedtimeVariability * 60);
    if (varMin > 60) {
      insights.push({
        title: "Bedtime variability is high",
        detail: `±${varMin}min swing. Research links irregular sleep timing to metabolic disruption and reduced cognitive performance — even when total hours are adequate.`,
      });
    } else if (varMin <= 30) {
      insights.push({
        title: "Consistent sleep timing",
        detail: `±${varMin}min variability — very consistent. This stability strengthens circadian rhythm and improves sleep quality over time.`,
      });
    }
  }

  // Activity insight
  if (report.activity?.available && report.activity.averages?.stepsPerDay) {
    const steps = report.activity.averages.stepsPerDay;
    if (steps >= 10000) {
      insights.push({
        title: "Daily movement is solid",
        detail: `${steps.toLocaleString()} steps/day avg. Above the 10K threshold associated with reduced all-cause mortality risk.`,
      });
    } else if (steps < 5000) {
      insights.push({
        title: "Movement is below baseline",
        detail: `${steps.toLocaleString()} steps/day. Studies show each additional 2,000 steps reduces cardiovascular risk by ~8%. Small increases compound.`,
      });
    }
  }

  return insights.slice(0, 3);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function scoreColor(score) {
  if (score >= 60) return "#D97A2B";
  return "#A89981";
}

function tintSvg(svg, color) {
  return svg.replace(/#d8b4fe|#c4b5fd/gi, color);
}

/**
 * Generate a self-contained HTML file for the health card.
 */
export function generateWrappedHTML(report, options = {}) {
  const identity = computeHealthIdentity(report);
  const surprising = computeSurprisingStats(report);
  const comparisons = computeComparisons(report);
  const insights = generateWrappedInsights(report);
  const heroBoast = computeHeroBoast(report, comparisons);
  const walkStat = computeWalkStat(report);
  const calorieEq = computeCalorieEquivalence(report);
  const derivedStat = computeDerivedStat(report);
  const score = report.overall?.score ?? 0;
  const pct = Math.min(100, Math.max(0, score));
  const isElite = identity.elite === true;
  const color = isElite ? '#E6B84A' : scoreColor(score);
  const identityIcon = tintSvg(identity.icon, color);
  const ringGlow = isElite
    ? '0 0 52px rgba(230,184,74,0.18), 0 0 18px rgba(230,184,74,0.10)'
    : '0 0 38px rgba(217,122,43,0.10)';
  const today = new Date().toISOString().slice(0, 10);
  const daysAnalyzed = report.activity?.totalDays || report.sleep?.nightsAnalyzed || report.recovery?.daysAnalyzed || 365;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysAnalyzed);
  const periodStart = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const periodEnd = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const periodLabel = periodStart === periodEnd ? periodStart : `${periodStart} – ${periodEnd}`;
  const subtitleClass = periodLabel.length > 16 ? 'subtitle subtitle-compact' : 'subtitle';
  const scoreDegrees = pct * 3.6;

  const gridItems = [];
  if (report.sleep?.available && report.sleep.averages) {
    gridItems.push({
      label: 'Sleep',
      value: `${(report.sleep.averages.durationMinutes / 60).toFixed(1)}h avg`,
      sub: `Deep ${report.sleep.averages.deepMinutes}m · REM ${report.sleep.averages.remMinutes}m`,
    });
  }
  if (report.recovery?.available) {
    gridItems.push({
      label: 'Recovery',
      value: `HRV ${report.recovery.latestHRV || report.recovery.averageHRV || '—'}ms`,
      sub: report.recovery.readiness || '—',
    });
  }
  if (report.activity?.available && report.activity.averages) {
    gridItems.push({
      label: 'Activity',
      value: `${report.activity.averages.activeEnergyPerDay?.toLocaleString() || '—'} kcal/day`,
      sub: 'active energy avg',
    });
  }
  if (report.sleep?.available && report.sleep.averages?.bedtimeVariability != null) {
    gridItems.push({
      label: 'Consistency',
      value: `±${Math.round(report.sleep.averages.bedtimeVariability * 60)}min`,
      sub: 'bedtime variability',
    });
  }

  function featureBlock(icon, text, toneClass = '', accentValue = false) {
    const tone = toneClass ? ` ${toneClass}` : '';
    const accentClass = accentValue ? ' feature-value-accent' : '';
    return `<div class="feature${tone}"><div class="feature-icon">${icon}</div><div class="feature-value${accentClass}">${escapeHtml(text)}</div></div>`;
  }

  function featureRow(icon, text) {
    return `<div class="feature-row"><div class="feature-row-icon">${icon}</div><div class="feature-row-text">${escapeHtml(text)}</div></div>`;
  }

  const percentileIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.3 6.7 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" stroke="#D97A2B" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const distanceIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20s-5-4.35-5-8.5C7 8.46 9.24 6 12 6s5 2.46 5 5.5C17 15.65 12 20 12 20Z" stroke="#D97A2B" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="11.5" r="1.6" fill="#D97A2B"/></svg>`;
  const energyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c-3 0-6-1.7-6-5.5 0-2.8 2.4-5.6 3.8-7.5.3-.4.8-.6 1.3-.6h1.8c.5 0 1 .2 1.3.6 1.4 1.9 3.8 4.7 3.8 7.5C18 20.3 15 22 12 22z" stroke="#D97A2B" stroke-width="1.4"/><path d="M12 18.5c-1.2 0-2.4-.7-2.4-2 0-1 1-2.3 1.6-3.1.2-.2.4-.3.6-.3h.4c.2 0 .4.1.6.3.6.8 1.6 2.1 1.6 3.1 0 1.3-1.2 2-2.4 2z" fill="#D97A2B" opacity="0.22"/></svg>`;
  const sleepIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14.2A8.5 8.5 0 119.8 4 6.8 6.8 0 0020 14.2z" stroke="#D97A2B" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const whiteDistanceIcon = tintSvg(distanceIcon, '#F2ECE0');
  const whiteEnergyIcon = tintSvg(energyIcon, '#F2ECE0');
  const whiteSleepIcon = tintSvg(sleepIcon, '#F2ECE0');

  const combinedFeatureRows = [
    walkStat?.text ? featureRow(whiteDistanceIcon, walkStat.text) : null,
    calorieEq?.text ? featureRow(whiteEnergyIcon, calorieEq.text) : null,
    derivedStat?.text ? featureRow(whiteSleepIcon, derivedStat.text) : null,
  ].filter(Boolean).join('');
  const combinedFeatureHTML = combinedFeatureRows
    ? `<div class="feature feature-group">${combinedFeatureRows}</div>`
    : '';

  const gridRows = gridItems.map((g) => `<div class="grid-item"><div class="grid-label">${escapeHtml(g.label)}</div><div class="grid-value">${escapeHtml(g.value)}</div><div class="grid-sub">${escapeHtml(g.sub)}</div></div>`).join('');
  const gridHTML = gridRows ? `<div class="grid">${gridRows}</div>` : '';

  const comparisonRows = comparisons.map((c) => {
    const factHTML = c.fact ? `<div class="comp-fact">${escapeHtml(c.fact)}</div>` : '';
    return `<div class="comp-item"><div style="display:flex;justify-content:space-between;align-items:center;width:100%"><div class="comp-left"><div class="comp-metric">${escapeHtml(c.metric)}</div><div class="comp-value">${escapeHtml(c.value)}</div></div><div class="comp-right"><div class="comp-tier">${escapeHtml(c.tier)}</div><div class="comp-pct">${escapeHtml(c.pct)}</div></div></div>${factHTML}</div>`;
  }).join('');
  const comparisonsHTML = comparisonRows ? `<div class="comparisons"><div class="section-title">How You Compare</div>${comparisonRows}</div>` : '';

  const surprisingRows = surprising.map((s) => `<div class="surprising-item"><div><div class="surprising-label">${escapeHtml(s.label)}</div><div class="surprising-detail">${escapeHtml(s.detail)}</div></div><div class="surprising-value">${escapeHtml(s.value)}</div></div>`).join('');
  const surprisingHTML = surprisingRows ? `<div class="surprising"><div class="section-title">Highlights</div>${surprisingRows}</div>` : '';

  const insightRows = insights.map((i) => `<div class="insight"><div class="insight-title">${escapeHtml(i.title)}</div><div class="insight-detail">${escapeHtml(i.detail)}</div></div>`).join('');
  const insightsHTML = insightRows ? `<div class="insights"><div class="section-title">Insights</div>${insightRows}</div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aveil Wrapped</title>
<link rel="preconnect" href="https://api.fontshare.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0C0907;
  --bg-2:#13100C;
  --bg-3:#1A1610;
  --ink:#F2ECE0;
  --ink-2:#D4C8B1;
  --ink-3:#A89981;
  --muted:#6F6554;
  --rule:rgba(242,236,224,0.08);
  --rule-strong:rgba(242,236,224,0.14);
  --amber:#D97A2B;
  --gold:#E6B84A;
  --serif:"Newsreader",Georgia,serif;
  --sans:"Switzer",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,monospace;
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);display:flex;justify-content:center;padding:32px 16px;font-feature-settings:"tnum" 1;-webkit-font-smoothing:antialiased}
.card{width:620px;max-width:100%;background:var(--bg-2);border:1px solid var(--rule);border-radius:4px;overflow:hidden;padding:40px 32px}
.header{text-align:center;margin-bottom:30px}
.logo{font-family:var(--mono);font-weight:400;font-size:11px;letter-spacing:.20em;color:var(--amber);margin-bottom:10px;text-transform:uppercase}
.subtitle{font-family:var(--sans);font-weight:400;font-size:28px;line-height:1.08;letter-spacing:-.02em;color:var(--ink);max-width:320px;margin:0 auto}
.subtitle-compact{font-size:23px;max-width:420px;letter-spacing:-.015em}
.score-section{text-align:center;margin-bottom:28px}
.score-ring{width:136px;height:136px;border-radius:50%;background:conic-gradient(${color} ${scoreDegrees}deg,rgba(242,236,224,0.08) ${scoreDegrees}deg);display:inline-flex;align-items:center;justify-content:center;position:relative;box-shadow:${ringGlow}}
.score-inner{width:124px;height:124px;border-radius:50%;background:var(--bg-2);display:flex;flex-direction:column;align-items:center;justify-content:center}
.score-num{font-family:var(--mono);font-weight:500;font-size:32px;color:var(--ink);line-height:1}
.score-label{font-family:var(--mono);font-weight:400;font-size:10px;color:var(--muted);margin-top:6px;letter-spacing:.20em;text-transform:uppercase}
.identity{text-align:center;margin-bottom:28px}
.identity-icon{margin:0 auto 10px;display:flex;justify-content:center;align-items:center}
.identity-icon svg{width:42px;height:42px;display:block}
.identity-title{font-family:var(--sans);font-weight:500;font-size:21px;color:var(--ink);margin:6px 0;letter-spacing:-.01em;line-height:1.2}
.identity-tagline{font-family:var(--serif);font-weight:300;font-style:italic;font-size:16px;color:var(--ink-2);line-height:1.55;max-width:440px;margin:0 auto}
.feature{margin-bottom:14px;padding:16px 18px;background:var(--bg-3);border:1px solid var(--rule);border-radius:4px;text-align:center}
.feature-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin:0 auto 10px}
.feature-value{font-family:var(--serif);font-weight:400;font-style:italic;font-size:17px;color:var(--ink);line-height:1.55}
.feature-value-accent{font-family:var(--sans);font-style:normal;font-weight:500;font-size:18px;color:var(--amber);letter-spacing:-.01em}
.feature-primary{border-color:rgba(217,122,43,0.22);background:rgba(217,122,43,0.06);display:flex;align-items:center;justify-content:center;gap:12px;text-align:left}
.feature-primary .feature-icon{margin:0}
.feature-group{padding:18px 20px;text-align:left}
.feature-row{display:flex;align-items:center;justify-content:flex-start;gap:12px;text-align:left}
.feature-row + .feature-row{margin-top:12px;padding-top:12px;border-top:1px solid var(--rule)}
.feature-row-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.feature-row-text{font-family:var(--sans);font-weight:500;font-size:16px;color:var(--ink);line-height:1.45}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}
.grid-item{background:var(--bg-3);border:1px solid var(--rule);border-radius:4px;padding:16px}
.grid-label{font-family:var(--mono);font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:.20em;color:var(--amber);margin-bottom:8px}
.grid-value{font-family:var(--mono);font-weight:500;font-size:20px;color:var(--ink);line-height:1.15}
.grid-sub{font-family:var(--serif);font-weight:400;font-size:13px;color:var(--ink-3);margin-top:6px;line-height:1.45}
.section-title{font-family:var(--mono);font-weight:400;font-size:11px;text-transform:uppercase;letter-spacing:.20em;color:var(--amber);margin-bottom:12px;padding-top:4px}
.comparisons,.surprising,.insights{margin-bottom:24px}
.comp-item,.surprising-item,.insight{padding:14px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-3);margin-bottom:8px}
.comp-item:last-child,.surprising-item:last-child,.insight:last-child{margin-bottom:0}
.comp-left{display:flex;flex-direction:column}
.comp-metric{font-family:var(--mono);font-weight:400;font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.20em}
.comp-value{font-family:var(--mono);font-weight:500;font-size:16px;color:var(--ink);margin-top:4px}
.comp-right{text-align:right}
.comp-tier{font-family:var(--sans);font-weight:500;font-size:14px;color:var(--amber);letter-spacing:-.01em}
.comp-pct{font-family:var(--mono);font-weight:400;font-size:10px;color:var(--muted);letter-spacing:.20em;text-transform:uppercase;margin-top:2px}
.comp-fact{font-family:var(--serif);font-weight:300;font-style:italic;font-size:13px;color:var(--ink-3);margin-top:10px;text-align:left;line-height:1.55;border-top:1px solid var(--rule);padding-top:10px}
.surprising-item{display:flex;justify-content:space-between;align-items:baseline}
.surprising-label{font-family:var(--mono);font-weight:400;font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.20em}
.surprising-value{font-family:var(--mono);font-weight:500;font-size:22px;color:var(--ink)}
.surprising-detail{font-family:var(--serif);font-weight:400;font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5}
.insight-title{font-family:var(--sans);font-weight:500;font-size:15px;color:var(--ink);letter-spacing:-.01em}
.insight-detail{font-family:var(--serif);font-weight:400;font-size:14px;color:var(--ink-2);margin-top:6px;line-height:1.55}
@media (max-width:640px){
  body{padding:16px}
  .card{padding:30px 20px;border-radius:4px}
  .grid{grid-template-columns:1fr}
  .subtitle{font-size:24px;max-width:248px}
  .subtitle-compact{font-size:20px;max-width:280px}
  .identity-title{font-size:20px}
}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">AVEIL WRAPPED</div>
    <div class="${subtitleClass}">${escapeHtml(periodLabel)}</div>
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
    <div class="identity-icon">${identityIcon}</div>
    <div class="identity-title">${escapeHtml(identity.title)}</div>
    <div class="identity-tagline">${escapeHtml(identity.tagline)}</div>
  </div>

  ${heroBoast?.text ? featureBlock(percentileIcon, heroBoast.text, 'feature-primary', true) : ''}
  ${combinedFeatureHTML}
  ${gridHTML}
  ${comparisonsHTML}
  ${surprisingHTML}
  ${insightsHTML}
</div>
</body>
</html>`;

  return {
    html,
    filename: `aveil-wrapped-${today}.html`,
  };
}

/**
 * Generate demo cards for all archetypes with mock data.
 * Great for launch assets and showcasing variety.
 */
export function generateDemoCards(outDir) {
  const { mkdirSync, writeFileSync } = await_fs();
  mkdirSync(outDir, { recursive: true });

  const demos = [
    { name: "longevity-champion", score: 94, sleep: { dur: 480, deep: 85, rem: 100, btHour: 21.3, btVar: 0.2 }, hrv: 120, rhr: 45, steps: 14500, kcal: 900 },
    { name: "optimizer", score: 88, sleep: { dur: 465, deep: 72, rem: 95, btHour: 21.5, btVar: 0.3 }, hrv: 110, rhr: 48, steps: 13900, kcal: 850 },
    { name: "clockwork", score: 75, sleep: { dur: 440, deep: 55, rem: 80, btHour: 21.6, btVar: 0.25 }, hrv: 55, rhr: 62, steps: 8500, kcal: 520 },
    { name: "recovered", score: 78, sleep: { dur: 430, deep: 50, rem: 85, btHour: 22.5, btVar: 0.6 }, hrv: 95, rhr: 56, steps: 9200, kcal: 600 },
    { name: "mover", score: 72, sleep: { dur: 400, deep: 45, rem: 70, btHour: 23.0, btVar: 0.7 }, hrv: 50, rhr: 65, steps: 15000, kcal: 920 },
    { name: "early-bird", score: 77, sleep: { dur: 420, deep: 52, rem: 82, btHour: 21.0, btVar: 0.35 }, hrv: 62, rhr: 58, steps: 9500, kcal: 550 },
    { name: "deep-sleeper", score: 76, sleep: { dur: 470, deep: 80, rem: 90, btHour: 22.0, btVar: 0.5 }, hrv: 60, rhr: 60, steps: 7000, kcal: 480 },
    { name: "endurance-engine", score: 74, sleep: { dur: 420, deep: 55, rem: 75, btHour: 22.5, btVar: 0.6 }, hrv: 65, rhr: 48, steps: 11000, kcal: 780 },
    { name: "iron-mind", score: 71, sleep: { dur: 435, deep: 52, rem: 78, btHour: 22.2, btVar: 0.45 }, hrv: 55, rhr: 63, steps: 8800, kcal: 550 },
    { name: "recharger", score: 70, sleep: { dur: 510, deep: 55, rem: 100, btHour: 21.7, btVar: 0.55 }, hrv: 58, rhr: 62, steps: 6500, kcal: 450 },
    { name: "burner", score: 73, sleep: { dur: 410, deep: 48, rem: 72, btHour: 22.8, btVar: 0.55 }, hrv: 52, rhr: 58, steps: 10500, kcal: 920 },
    { name: "zen-master", score: 64, sleep: { dur: 450, deep: 55, rem: 85, btHour: 22.3, btVar: 0.65 }, hrv: 58, rhr: 61, steps: 8500, kcal: 520 },
    { name: "night-owl", score: 62, sleep: { dur: 380, deep: 40, rem: 65, btHour: 24.5, btVar: 0.8 }, hrv: 45, rhr: 68, steps: 6000, kcal: 400 },
    { name: "tracker", score: 55, sleep: { dur: 390, deep: 35, rem: 60, btHour: 23.5, btVar: 1.0 }, hrv: 40, rhr: 72, steps: 5500, kcal: 350 },
  ];

  const files = [];
  for (const d of demos) {
    const report = {
      overall: { score: d.score },
      sleep: {
        available: true,
        nightsAnalyzed: 30,
        averages: {
          durationMinutes: d.sleep.dur,
          deepMinutes: d.sleep.deep,
          remMinutes: d.sleep.rem,
          bedtimeHour: d.sleep.btHour,
          bedtimeVariability: d.sleep.btVar,
        },
        bestNight: { totalMinutes: d.sleep.dur + 60, date: "2026-03-15" },
        trend: "stable",
      },
      activity: {
        available: true,
        totalDays: 365,
        daysAnalyzed: 365,
        averages: {
          stepsPerDay: d.steps,
          activeEnergyPerDay: d.kcal,
        },
      },
      recovery: {
        available: true,
        daysAnalyzed: 30,
        latestHRV: d.hrv + 5,
        averageHRV: d.hrv,
        averageRHR: d.rhr,
        recoveryScore: d.score > 70 ? 75 : 55,
        readiness: d.score > 70 ? "good" : "moderate",
        peakHRV: { value: d.hrv + 30, date: "2026-02-20" },
      },
      recordCount: 500000 + Math.floor(Math.random() * 500000),
      signals: [],
    };

    const { html, filename } = generateWrappedHTML(report);
    const outFile = `${outDir}/wrapped-${d.name}.html`;
    writeFileSync(outFile, html);
    files.push(`wrapped-${d.name}.html`);
  }

  return files;
}

// Lazy fs import for demo generation
import { mkdirSync, writeFileSync } from "node:fs";
function await_fs() {
  return { mkdirSync, writeFileSync };
}
