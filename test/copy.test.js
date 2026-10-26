import test from "node:test";
import assert from "node:assert/strict";

import * as copy from "../src/copy.js";

// Every visible string in copy.js, with where it came from.
function allStrings() {
  const out = [];
  const walk = (value, where) => {
    if (typeof value === "string") out.push([where, value]);
    else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${where}[${index}]`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => walk(item, `${where}.${key}`));
  };
  for (const [name, value] of Object.entries(copy)) {
    if (typeof value !== "function") walk(value, name);
  }
  return out;
}

// Phrases the Aveil copy rules ban: hype, filler, praise, research-speak,
// overclaiming, diagnosis, doom, and time words that can be wrong when read.
const BANNED = [
  /unlock/i, /elevate/i, /leverag/i, /journey/i, /supercharg/i, /game.?changer/i,
  /crushing it/i, /great job/i, /listen to your body/i, /it's important to note/i,
  /at the end of the day/i, /gentle reminder/i, /studies (suggest|show)/i, /research shows/i,
  /meta-analysis/i, /\bwill (improve|fix)\b/i, /guarantee/i, /diagnos(e|is)\b(?! one)/i,
  /\bdisease/i, /\brisk\b/i, /mortality/i, /\bpoor\b/i, /needs attention/i, /\blever\b/i,
  /\btonight\b/i, /\bthis morning\b/i, /\btomorrow\b/i, /\bnext morning\b/i, /\bright now\b/i,
  /\btop \d/i, /percentile/i, /\bhealthy\b/i, /athlete/i,
];

test("no em dashes, double hyphens, or emoji in any line", () => {
  for (const [where, text] of allStrings()) {
    assert.doesNotMatch(text, /—|--/, `${where}: ${text}`);
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${where}: ${text}`);
    assert.ok((text.match(/!/g) || []).length <= 1, `${where}: ${text}`);
  }
});

test("no banned phrases", () => {
  for (const [where, text] of allStrings()) {
    // The disclaimer is the one place that may say what this is not.
    if (where === "BRIEF.disclaimer") continue;
    for (const pattern of BANNED) {
      assert.doesNotMatch(text, pattern, `${where}: ${text}`);
    }
  }
});

test("archetype titles never start with \"The\"", () => {
  for (const [key, archetype] of Object.entries(copy.ARCHETYPES)) {
    assert.doesNotMatch(archetype.title, /^The\b/, key);
    assert.ok(archetype.title.length <= 24, key);
    assert.ok(archetype.tagline.length <= 60, key);
  }
});

test("only known placeholders, and no measured number baked into a template", () => {
  for (const [where, text] of allStrings()) {
    for (const [, name] of text.matchAll(/\{([^}]*)\}/g)) {
      assert.ok(["period", "value", "threshold"].includes(name), `${where}: {${name}}`);
    }
    assert.doesNotMatch(text, /\d+\s?(ms|bpm|kcal|steps|km)\b/, `${where}: ${text}`);
  }
});

test("the brief disclaimer stays non-diagnostic", () => {
  assert.match(copy.BRIEF.disclaimer, /not a diagnosis/);
});
