/**
 * Every sentence the Wrapped card and the health brief can show.
 *
 * The wording follows the Aveil app: plain, specific, no verdicts, no
 * medical claims, no em dashes. `{period}` becomes week, month, or year;
 * `{value}` and `{threshold}` are filled from the person's own numbers.
 * copy.test.js checks every line here against those rules.
 */

export const ARCHETYPES = {
  lights_out: { title: "Lights Out", tagline: "When you sleep, you go deep." },
  lights_out_week: { title: "Lights Out", tagline: "Your deep sleep stood out this week." },
  clockwork: { title: "Clockwork", tagline: "Your body clock barely drifts." },
  clockwork_week: { title: "Clockwork", tagline: "Your bedtime held steady all week." },
  unbothered: { title: "Unbothered", tagline: "You shook off the hard days." },
  unbothered_week: { title: "Unbothered", tagline: "Recovery stayed strong through the week." },
  engine: { title: "Engine", tagline: "You kept moving all {period}." },
  engine_week: { title: "Engine", tagline: "Movement stood out this week." },
  on_the_rise: { title: "On the Rise", tagline: "You're trending up this {period}." },
  on_the_rise_week: { title: "On the Rise", tagline: "This week edged ahead of your last." },
  all_rounder: { title: "All-Rounder", tagline: "Several parts of your {period} stood out." },
  all_rounder_week: { title: "All-Rounder", tagline: "Several parts of your week stood out." },
  tracker: { title: "Tracker", tagline: "Your first read is taking shape this {period}." },
  tracker_week: { title: "Steady Week", tagline: "A first read took shape this week." },
  warming_up: { title: "Warming Up", tagline: "An early signal is taking shape." },
  warming_up_week: { title: "Warming Up", tagline: "A few days in, there is already a first read." },
};

export const HERO = {
  deep_sleep: "Deep sleep was your standout, averaging a strong {value} a night this {period}.",
  recovery_hrv: "Recovery was your standout, averaging a strong {value} this {period}.",
  recovery_rhr: "Resting heart rate was your standout, averaging a strong {value} this {period}.",
  activity: "Daily movement was your standout, averaging a strong {value} a day this {period}.",
  regularity: "Your bedtime barely drifts, typically landing within about {value} of your usual time.",
  all_rounder: "{value} all cleared a strong mark this {period}.",
  on_the_rise: "This {period} edged ahead of your last.",
  first_read: "This {period} has enough data for a first read.",
};

export const STRENGTH_NAMES = {
  recovery: "recovery",
  deep_sleep: "sleep",
  regularity: "sleep",
  activity: "movement",
};

export const CHANGE_LABELS = {
  sleepMinutes: "sleep a night",
  deepMinutes: "deep sleep a night",
  remMinutes: "REM sleep a night",
  steps: "steps a day",
  hrv: "recovery (HRV)",
  restingHR: "resting heart rate",
};

export const WRAPPED = {
  eyebrow: "Aveil Wrapped",
  deeperCut: "The deeper cut",
  biggestMove: "Your biggest move vs last {period}",
  bandTitle: "Top ~{value}% recovery",
  bandDetail: "among people your age",
  levelsHeading: "Where you held strong this {period}",
  factsHeading: "Good to know",
  versusLast: "vs last {period}",
  footer: "Made with aveil-health on this computer. Nothing was uploaded.",
  noData: "There are no tracked days in this window yet. Export again after a few more days of tracking.",
};

export const HIGHLIGHT_LABELS = {
  total_steps: "Steps this {period}",
  avg_sleep: "Sleep average",
  avg_deep_sleep: "Deep sleep average",
  avg_rem_sleep: "REM sleep average",
  avg_hrv: "Recovery (HRV) average",
  avg_resting_hr: "Resting heart rate average",
  strength_sessions: "Strength sessions",
  workout_sessions: "Workouts this {period}",
  best_sleep_streak: "Longest 7h+ streak",
  avg_protein: "Protein average",
};

export const FACT_LABELS = {
  best_single_night: "Longest sleep night",
  deepest_night: "Longest deep-sleep night",
  best_step_day: "Best step day",
  hrv_peak: "Recovery (HRV) peak",
  lowest_resting_hr: "Lowest resting heart rate",
};

export const LEVEL_LABELS = {
  sleep: "Sleep",
  recovery_hrv: "Recovery (HRV)",
  recovery_rhr: "Resting heart rate",
  activity: "Steps",
  nutrition: "Protein",
};

export const TIER_LABELS = {
  elite: "Elite",
  strong: "Strong",
  fair: "Fair",
};

export const BRIEF = {
  eyebrow: "Aveil Health Brief",
  eyebrowSleep: "Aveil Health Brief · Sleep and recovery",
  subline: "Built from your Apple Health export across {value} over the {threshold}.",
  questionHeading: "The question worth asking",
  patternsHeading: "Strongest patterns",
  evidenceHeading: "Evidence",
  evidenceNote: "Latest is the last 7 days. Baseline is the average for the {value}.",
  contextHeading: "Worth bringing up",
  experimentHeading: "What to test next",
  backgroundHeading: "Background",
  disclaimer: "This is a summary of self-tracked data, not a diagnosis. It is meant to help a conversation, not replace one.",
  footer: "Made with aveil-health, which reads your Apple Health export on your own computer. Nothing was uploaded.",
  noData: "There is not enough tracked data in this window for a brief yet. Export again after a few more days of tracking.",
};

export const BRIEF_HEADLINES = {
  sleep: "Sleep is the clearest place to look this {period}.",
  recovery: "Recovery is the clearest place to look this {period}.",
  activity: "Movement is the clearest place to look this {period}.",
  nutrition: "Your eating pattern is the clearest place to look this {period}.",
};

export const MAIN_QUESTIONS = {
  sleep: "Which input is shaping your sleep the most?",
  recovery: "Which input is limiting your recovery the most?",
  activity: "Which input is shaping your movement the most?",
  nutrition: "Which eating pattern is shaping how you feel?",
};

export const EXPERIMENTS = {
  sleep: "Keep the same bedtime every day this {period} and see how your sleep responds.",
  recovery: "Do the same short wind-down before every sleep this {period} and see how you feel after waking.",
  activity: "Keep your daily movement steady this {period} and see how your recovery responds.",
  nutrition: "Keep the same gap between your last meal and bed every day this {period} and see how you feel after waking.",
  year_sleep: "Sleep looks like the area to focus on next. Worth tracking as the months go.",
  year_recovery: "Recovery looks like the area to focus on next over the months ahead.",
  year_activity: "Movement looks like the area to focus on next over the months ahead.",
  year_nutrition: "Your eating pattern looks like the area to focus on next over the months ahead.",
};

export const CONTEXT_PROBES = {
  sleep: [
    "A heavy last meal eaten close to bedtime.",
    "Caffeine timing and how late in the day it lands.",
    "Screen time and light exposure before bed.",
    "Bedtime and wake time on work days versus off days.",
  ],
  recovery: [
    "Recent stress, workload, or anything weighing on you.",
    "Any illness, run-down days, or feeling under the weather.",
    "Alcohol in the evenings and how often.",
    "Training load and whether it ramped up lately.",
  ],
  activity: [
    "Training load and any recent change in volume.",
    "Rest days and how movement is spread across the week.",
    "Soreness, niggles, or anything limiting movement.",
  ],
  nutrition: [
    "How spread out meals are across the day.",
    "Protein intake across the day.",
    "Alcohol with meals and how often.",
  ],
  general: [
    "Changes in routine, travel, or schedule lately.",
    "Any medication changes in this window.",
  ],
};

// Data-anchored lines for "Strongest patterns". Each names its own measure.
export const PATTERNS = {
  deep_sleep_strong: "Your deep sleep averaged a strong {value} a night, clearing the {threshold} recovery mark.",
  deep_sleep_solid: "Your deep sleep averaged {value} a night this {period}.",
  deep_sleep_opportunity: "Your deep sleep averaged around {value}, and a steadier wind-down tends to add to it.",
  sleep_duration_strong: "Your sleep averaged {value} a night, inside the 7 to 9 hour range.",
  sleep_duration_short: "Your sleep averaged {value} a night, and an earlier, steady bedtime tends to add to it.",
  sleep_duration_plain: "Your sleep averaged {value} a night this {period}.",
  timing_steady: "Your bedtime barely drifts, typically landing within about {value} of your usual time.",
  timing_opportunity: "Your bedtime typically moves about {value} from your usual time, so a tighter window could help your body clock.",
  hrv_strong: "Your recovery (HRV) averaged a strong {value} this {period}.",
  hrv_present: "Your recovery (HRV) averaged around {value}, steady enough to track real changes.",
  rhr_under_mark: "Your resting heart rate averaged {value}, under the {threshold} mark.",
  rhr_plain: "Your resting heart rate averaged {value} this {period}.",
  steps_strong: "Your daily steps averaged {value}, clearing the {threshold} strong movement mark.",
  steps_solid: "Your daily steps averaged {value} this {period}.",
  steps_opportunity: "Your daily steps averaged around {value}, and a short daily walk adds up fast.",
  protein_strong: "Your protein averaged {value} a day, past the {threshold} mark.",
  protein_opportunity: "Your protein averaged around {value} a day, and a little more tends to help recovery.",
};

export const BACKGROUND = {
  workouts: "Workouts logged: {value} this {period}.",
  workouts_strength: "Workouts logged: {value} this {period}, including {threshold}.",
  strength_one: "1 strength session",
  strength_many: "{value} strength sessions",
  food_logging: "Food was logged on {value} of {threshold} days.",
  sleep_stages_missing: "Sleep stages were not recorded, so deep and REM sleep are left out.",
};

export const EVIDENCE_LABELS = {
  sleep: "Sleep duration",
  deep: "Deep sleep",
  rem: "REM sleep",
  hrv: "Recovery (HRV)",
  restingHR: "Resting heart rate",
  steps: "Steps",
  protein: "Protein",
};

export const COVERAGE_LABELS = {
  sleep: "Sleep",
  recovery: "Recovery",
  nutrition: "Nutrition",
  activity: "Activity",
};

export const DOMAIN_NAMES = {
  sleep: "sleep",
  recovery: "recovery",
  activity: "activity",
  nutrition: "nutrition",
};

/**
 * Fill a template. Values are inserted as given; renderers escape them.
 */
export function fill(template, values = {}) {
  return String(template).replace(/\{(period|value|threshold)\}/g, (match, key) =>
    values[key] == null ? match : String(values[key]));
}
