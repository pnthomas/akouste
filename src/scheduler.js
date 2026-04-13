/** @typedef {{ greek: string; english: string; topic: string; category: string }} WordEntry */

const STORAGE_KEY = "akouste.recurrenceWeights.v2";
const BASELINE_WEIGHT = 1;
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 20;
const DECAY = 0.98;
const RECENT_WINDOW = 3;

const OUTCOME_MULTIPLIER = {
  correct: 0.5,
  wrong: 2,
  guessed: 1.3,
  know: 0.25,
};

/**
 * Shared weighted scheduler for all modes.
 * @param {WordEntry[]} entries
 */
export function createRecurrenceScheduler(entries) {
  /** @type {Record<string, number>} */
  let weights = readWeights();
  /** @type {string[]} */
  const recent = [];

  for (const e of entries) {
    const k = lemmaKey(e.greek);
    if (!k) continue;
    const w = Number(weights[k]);
    if (!Number.isFinite(w)) weights[k] = BASELINE_WEIGHT;
  }
  writeWeights(weights);

  function applyDecay() {
    let changed = false;
    for (const key of Object.keys(weights)) {
      const current = Number(weights[key]);
      if (!Number.isFinite(current)) {
        weights[key] = BASELINE_WEIGHT;
        changed = true;
        continue;
      }
      const next = clamp(BASELINE_WEIGHT + (current - BASELINE_WEIGHT) * DECAY);
      if (Math.abs(next - current) > 0.00001) {
        weights[key] = next;
        changed = true;
      }
    }
    if (changed) writeWeights(weights);
  }

  /**
   * @param {WordEntry[]} pool
   * @returns {WordEntry | null}
   */
  function pick(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    applyDecay();

    const filtered = pool.filter((e) => !recent.includes(lemmaKey(e.greek)));
    const candidates = filtered.length > 0 ? filtered : pool;
    const selected = weightedChoice(candidates, weights);
    if (!selected) return null;
    pushRecent(lemmaKey(selected.greek));
    return selected;
  }

  /**
   * @param {string} greek
   * @param {"correct"|"wrong"|"guessed"|"know"} outcome
   */
  function record(greek, outcome) {
    const key = lemmaKey(greek);
    if (!key) return;
    const current = Number(weights[key]);
    const base = Number.isFinite(current) ? current : BASELINE_WEIGHT;
    const mult = OUTCOME_MULTIPLIER[outcome] || 1;
    weights[key] = clamp(base * mult);
    writeWeights(weights);
  }

  function pushRecent(key) {
    if (!key) return;
    recent.push(key);
    while (recent.length > RECENT_WINDOW) recent.shift();
  }

  return { pick, record };
}

function lemmaKey(greek) {
  return (greek || "").trim();
}

function clamp(value) {
  return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, value));
}

/**
 * @param {WordEntry[]} entries
 * @param {Record<string, number>} weights
 */
function weightedChoice(entries, weights) {
  let total = 0;
  const vals = entries.map((e) => {
    const key = lemmaKey(e.greek);
    const w = clamp(Number(weights[key]) || BASELINE_WEIGHT);
    total += w;
    return w;
  });
  if (total <= 0) return entries[Math.floor(Math.random() * entries.length)] || null;
  let r = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    r -= vals[i];
    if (r <= 0) return entries[i];
  }
  return entries[entries.length - 1] || null;
}

function readWeights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeWeights(weights) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
}
