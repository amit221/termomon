#!/usr/bin/env node
/**
 * Generates breeding recipe CSV tables with bloodline support.
 * Run: node scripts/generate-breeding-tables.js
 */

const fs = require('fs');
const path = require('path');

// ── Load trait pool ──
const poolCSV = fs.readFileSync(path.join(__dirname, '..', 'docs', 'design-analysis', 'trait-pool.csv'), 'utf-8');
const allTraits = poolCSV.trim().split('\n').slice(1).map(r => {
  const [slot, id, name, art, rarity, rarity_index, bloodline, spawn_rate] = r.split(',');
  return { slot, id, name, art, rarity, rarityIndex: parseInt(rarity_index), bloodline, spawnRate: parseFloat(spawn_rate) };
});

// Separate base traits from exclusives
const baseTraits = allTraits.filter(t => t.rarity !== 'exclusive');
const exclusiveTraits = allTraits.filter(t => t.rarity === 'exclusive');

// Group base traits by slot
const bySlot = {};
baseTraits.forEach(t => { if (!bySlot[t.slot]) bySlot[t.slot] = []; bySlot[t.slot].push(t); });

// ── Exclusive recipes: specific pairs that produce exclusive outputs ──
const EXCLUSIVE_RECIPES = {
  eyes: [
    { a: 'eye_r01', b: 'eye_r03', out: 'eye_x01', chance: 8 },  // Ring(keen) × Core(wild) → Eclipse
    { a: 'eye_e01', b: 'eye_e03', out: 'eye_x02', chance: 10 }, // Gem(keen) × Spark(wild) → Fractal
    { a: 'eye_l01', b: 'eye_l02', out: 'eye_x03', chance: 12 }, // Star Sight(keen) × Moon Eyes(wild) → Cosmos
  ],
  mouth: [
    { a: 'mth_r01', b: 'mth_r02', out: 'mth_x01', chance: 8 },
    { a: 'mth_e01', b: 'mth_e02', out: 'mth_x02', chance: 10 },
    { a: 'mth_l01', b: 'mth_l02', out: 'mth_x03', chance: 12 },
  ],
  body: [
    { a: 'bod_r01', b: 'bod_r03', out: 'bod_x01', chance: 8 },
    { a: 'bod_e01', b: 'bod_e02', out: 'bod_x02', chance: 10 },
    { a: 'bod_l01', b: 'bod_l02', out: 'bod_x03', chance: 12 },
  ],
  tail: [
    { a: 'tal_r02', b: 'tal_r01', out: 'tal_x01', chance: 8 },
    { a: 'tal_e01', b: 'tal_e02', out: 'tal_x02', chance: 10 },
    { a: 'tal_l01', b: 'tal_l02', out: 'tal_x03', chance: 12 },
  ],
};

// ── Weight tables ──
const INHERIT_SAME = [78, 65, 55, 50, 45, 40]; // by maxTier
const BASE_INHERIT = 35;
const TIER_PENALTY = 5;

const UPGRADE = {
  // [maxTier][bloodMatch] → weight
  0: { same: 18, neutral: 10, cross: 12 },
  1: { same: 15, neutral: 8, cross: 10 },
  2: { same: 12, neutral: 5, cross: 8 },
  3: { same: 8, neutral: 3, cross: 5 },
  4: { same: 5, neutral: 2, cross: 3 },
  5: { same: 0, neutral: 0, cross: 0 },
};

const SIDEGRADE = 5;

const DOWNGRADE = [0, 4, 5, 6, 7, 8]; // by minTier

const CORRUPT = {
  same: { same: 0, mixed: 0 },
  neutral: { same: 2, mixed: 2 },
  cross: { same: 5, mixed: 8 },
};

const NEW_SPECIES = [0, 0, 2, 4, 7, 15]; // by maxTier

// ── Helpers ──
function hashSeed(a, b) {
  const str = [a, b].sort().join('+');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getBloodMatch(tA, tB) {
  if (tA.bloodline === 'neutral' || tB.bloodline === 'neutral') return 'neutral';
  if (tA.bloodline === tB.bloodline) return 'same';
  return 'cross';
}

function getByRarity(pool, ri) { return pool.filter(t => t.rarityIndex === ri); }

// Get the next trait in the same bloodline (upgrade path)
function getBloodlineUpgrade(trait, pool) {
  if (trait.bloodline === 'neutral') return null;
  const next = pool.find(t => t.bloodline === trait.bloodline && t.rarityIndex === trait.rarityIndex + 1);
  return next || null;
}

function findExclusive(slot, idA, idB) {
  const recipes = EXCLUSIVE_RECIPES[slot] || [];
  const key = [idA, idB].sort().join('+');
  for (const r of recipes) {
    const rkey = [r.a, r.b].sort().join('+');
    if (key === rkey) {
      const exTrait = exclusiveTraits.find(t => t.id === r.out);
      return exTrait ? { trait: exTrait, chance: r.chance } : null;
    }
  }
  return null;
}

// ── Recipe generator ──
function generateRecipe(slot, slotPool, traitA, traitB) {
  const tierA = traitA.rarityIndex;
  const tierB = traitB.rarityIndex;
  const maxTier = Math.max(tierA, tierB);
  const minTier = Math.min(tierA, tierB);
  const sameTrait = traitA.id === traitB.id;
  const bloodMatch = getBloodMatch(traitA, traitB);
  const tierDiff = Math.abs(tierA - tierB);
  const seed = hashSeed(traitA.id, traitB.id);

  const outcomes = [];

  // 1. INHERIT
  if (sameTrait) {
    outcomes.push({ id: traitA.id, name: traitA.name, rarity: traitA.rarity, weight: INHERIT_SAME[maxTier], type: 'inherit' });
  } else {
    let wA = BASE_INHERIT - tierDiff * TIER_PENALTY;
    let wB = BASE_INHERIT + tierDiff * TIER_PENALTY;
    if (tierA > tierB) { [wA, wB] = [wB, wA]; }
    wA = Math.max(15, Math.min(50, wA));
    wB = Math.max(15, Math.min(50, wB));
    outcomes.push({ id: traitA.id, name: traitA.name, rarity: traitA.rarity, weight: wA, type: 'inherit' });
    outcomes.push({ id: traitB.id, name: traitB.name, rarity: traitB.rarity, weight: wB, type: 'inherit' });
  }

  // 2. UPGRADE (along bloodline)
  const upgradeW = UPGRADE[maxTier]?.[bloodMatch] || 0;
  if (upgradeW > 0) {
    // Prefer bloodline-specific upgrade
    let upgradeTrait = getBloodlineUpgrade(traitA, slotPool) || getBloodlineUpgrade(traitB, slotPool);
    if (!upgradeTrait) {
      const upPool = getByRarity(slotPool, maxTier + 1);
      if (upPool.length) upgradeTrait = upPool[seed % upPool.length];
    }
    if (upgradeTrait) {
      outcomes.push({ id: upgradeTrait.id, name: upgradeTrait.name, rarity: upgradeTrait.rarity, weight: upgradeW, type: 'upgrade' });
    }
  }

  // 3. EXCLUSIVE (cross-bloodline only, specific pairs)
  if (bloodMatch === 'cross') {
    const excl = findExclusive(slot, traitA.id, traitB.id);
    if (excl) {
      outcomes.push({ id: excl.trait.id, name: excl.trait.name, rarity: 'exclusive', weight: excl.chance, type: 'exclusive' });
    }
  }

  // 4. SIDEGRADE
  const sidePool = slotPool.filter(t => t.rarityIndex === tierA && t.id !== traitA.id && t.id !== traitB.id);
  if (sidePool.length > 0) {
    const pick = sidePool[seed % sidePool.length];
    outcomes.push({ id: pick.id, name: pick.name, rarity: pick.rarity, weight: SIDEGRADE, type: 'sidegrade' });
  }

  // 5. DOWNGRADE
  const downW = DOWNGRADE[minTier] || 0;
  if (downW > 0) {
    const downPool = getByRarity(slotPool, minTier - 1);
    if (downPool.length > 0) {
      const pick = downPool[(seed + 7) % downPool.length];
      outcomes.push({ id: pick.id, name: pick.name, rarity: pick.rarity, weight: downW, type: 'downgrade' });
    }
  }

  // 6. CORRUPT
  const tierMix = tierDiff > 0 ? 'mixed' : 'same';
  const corruptW = CORRUPT[bloodMatch]?.[tierMix] || 0;
  if (corruptW > 0) {
    outcomes.push({ id: 'CORRUPT', name: 'Corrupt', rarity: 'corrupt', weight: corruptW, type: 'corrupt' });
  }

  // 7. NEW SPECIES
  let newW = NEW_SPECIES[maxTier] || 0;
  // Exclusive parent bonus
  if (traitA.rarity === 'exclusive' || traitB.rarity === 'exclusive') newW += 5;
  if (newW > 0) {
    outcomes.push({ id: 'NEW', name: 'New Species', rarity: 'new', weight: newW, type: 'new' });
  }

  // Normalize to percentages
  const total = outcomes.reduce((s, o) => s + o.weight, 0);
  outcomes.forEach(o => { o.pct = Math.round(o.weight / total * 100); });
  // Fix rounding
  const pctSum = outcomes.reduce((s, o) => s + o.pct, 0);
  if (pctSum !== 100 && outcomes.length > 0) outcomes[0].pct += 100 - pctSum;

  outcomes.sort((a, b) => b.pct - a.pct);
  return outcomes;
}

// ── CSV generation ──
const MAX_OUTCOMES = 10;

function generateSlotCSV(slot) {
  const slotPool = bySlot[slot];
  const cols = ['parent_a_id', 'parent_a_name', 'parent_a_rarity', 'parent_a_blood',
    'parent_b_id', 'parent_b_name', 'parent_b_rarity', 'parent_b_blood',
    'blood_match', 'num_outcomes'];
  for (let i = 1; i <= MAX_OUTCOMES; i++) {
    cols.push(`out${i}_id`, `out${i}_name`, `out${i}_rarity`, `out${i}_pct`, `out${i}_type`);
  }

  const rows = [cols.join(',')];

  for (let i = 0; i < slotPool.length; i++) {
    for (let j = i; j < slotPool.length; j++) {
      const a = slotPool[i], b = slotPool[j];
      const recipe = generateRecipe(slot, slotPool, a, b);
      const bm = getBloodMatch(a, b);

      const parts = [a.id, a.name, a.rarity, a.bloodline, b.id, b.name, b.rarity, b.bloodline, bm, recipe.length];
      for (let k = 0; k < MAX_OUTCOMES; k++) {
        if (k < recipe.length) {
          parts.push(recipe[k].id, recipe[k].name, recipe[k].rarity, recipe[k].pct, recipe[k].type);
        } else {
          parts.push('', '', '', '', '');
        }
      }
      rows.push(parts.join(','));
    }
  }
  return rows.join('\n');
}

// ── Generate ──
const outDir = path.join(__dirname, '..', 'docs', 'design-analysis');

let totalRecipes = 0;
let totalWithExclusive = 0;
let totalWithCorrupt = 0;
let totalWithNew = 0;

for (const slot of ['eyes', 'mouth', 'body', 'tail']) {
  const csv = generateSlotCSV(slot);
  const filename = `breeding-recipes-${slot}.csv`;
  fs.writeFileSync(path.join(outDir, filename), csv, 'utf-8');

  const lines = csv.split('\n').length - 1;
  totalRecipes += lines;

  // Count special outcomes
  const dataLines = csv.split('\n').slice(1);
  dataLines.forEach(line => {
    if (line.includes(',exclusive,')) totalWithExclusive++;
    if (line.includes(',corrupt,')) totalWithCorrupt++;
    if (line.includes(',new,')) totalWithNew++;
  });

  console.log(`${filename}: ${lines} recipes`);
}

console.log(`\n--- Summary ---`);
console.log(`Total recipes: ${totalRecipes}`);
console.log(`Recipes with EXCLUSIVE output: ${totalWithExclusive}`);
console.log(`Recipes with CORRUPT risk: ${totalWithCorrupt}`);
console.log(`Recipes with NEW SPECIES chance: ${totalWithNew}`);
console.log(`\nBloodline pairs per slot:`);

for (const slot of ['eyes', 'mouth', 'body', 'tail']) {
  const pool = bySlot[slot];
  let same = 0, neutral = 0, cross = 0;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i; j < pool.length; j++) {
      const bm = getBloodMatch(pool[i], pool[j]);
      if (bm === 'same') same++;
      else if (bm === 'neutral') neutral++;
      else cross++;
    }
  }
  console.log(`  ${slot}: ${same} same, ${neutral} neutral, ${cross} cross`);
}
