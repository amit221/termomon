// src/config/creatures.ts

import { CreatureDefinition } from "../types";

export const CREATURES: CreatureDefinition[] = [
  // === COMMON (8 base + 8 evolved = 16) ===
  {
    id: "glitchlet",
    name: "Glitchlet",
    description: "A flickering pixel that can't decide what shape it is",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: [" .~. ", " |o| ", " '-' "],
      rich: [" ╭~╮ ", " │o│ ", " ╰─╯ "],
    },
    spawnCondition: {},
    evolution: { targetId: "glitchform", fragmentCost: 5 },
  },
  {
    id: "glitchform",
    name: "Glitchform",
    description: "A stabilized mass of corrupted pixels, humming with static",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" .~~~. ", " |O O| ", " |===| ", " '---' "],
      rich: [" ╭~~~╮ ", " │O O│ ", " │===│ ", " ╰───╯ "],
    },
    spawnCondition: {},
  },
  {
    id: "nullbyte",
    name: "Nullbyte",
    description: "Exists in the gaps between your data",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: ["  0  ", " /|\\ ", "  |  "],
      rich: ["  0  ", " /|\\ ", "  |  "],
    },
    spawnCondition: {},
    evolution: { targetId: "nullword", fragmentCost: 5 },
  },
  {
    id: "nullword",
    name: "Nullword",
    description: "A void where information used to be, now pulsing with emptiness",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" 0 0 ", " /|\\ ", "/===\\", "  |  "],
      rich: [" 0 0 ", " /|\\ ", "/===\\", "  |  "],
    },
    spawnCondition: {},
  },
  {
    id: "blinkbit",
    name: "Blinkbit",
    description: "Appears for exactly one frame then vanishes",
    rarity: "common",
    baseCatchRate: 0.75,
    art: {
      simple: [" * ", "*+*", " * "],
      rich: [" * ", "*+*", " * "],
    },
    spawnCondition: {},
    evolution: { targetId: "blinkburst", fragmentCost: 5 },
  },
  {
    id: "blinkburst",
    name: "Blinkburst",
    description: "A rapid strobe of ones and zeroes, impossible to look away",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" *** ", "**+**", " *** "],
      rich: [" *** ", "**+**", " *** "],
    },
    spawnCondition: {},
  },
  {
    id: "dustmote",
    name: "Dustmote",
    description: "A single particle drifting through dead processes",
    rarity: "common",
    baseCatchRate: 0.85,
    art: {
      simple: ["  .  ", " (.) ", "  '  "],
      rich: ["  .  ", " (.) ", "  '  "],
    },
    spawnCondition: {},
    evolution: { targetId: "dustcloud", fragmentCost: 5 },
  },
  {
    id: "dustcloud",
    name: "Dustcloud",
    description: "A swirling cluster of forgotten data fragments",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" .:. ", "(.:.)", " ':' "],
      rich: [" .:. ", "(.:.)", " ':' "],
    },
    spawnCondition: {},
  },

  // === UNCOMMON (4 base + 4 evolved = 8) ===
  {
    id: "hexashade",
    name: "Hexashade",
    description: "A shadow made of shifting hex values",
    rarity: "uncommon",
    baseCatchRate: 0.55,
    art: {
      simple: [" /##\\ ", " #  # ", " \\##/ "],
      rich: [" /##\\ ", " #  # ", " \\##/ "],
    },
    spawnCondition: {},
    evolution: { targetId: "hexwraith", fragmentCost: 7 },
  },
  {
    id: "hexwraith",
    name: "Hexwraith",
    description: "A towering column of hex that rewrites reality around it",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["/####\\", "#    #", "#    #", "\\####/"],
      rich: ["/####\\", "#    #", "#    #", "\\####/"],
    },
    spawnCondition: {},
  },
  {
    id: "loopwyrm",
    name: "Loopwyrm",
    description: "Caught in an infinite loop, endlessly chasing its own tail",
    rarity: "uncommon",
    baseCatchRate: 0.5,
    art: {
      simple: [" ,-, ", "(   )", " `-' "],
      rich: [" ,-. ", "(   )", " `-' "],
    },
    spawnCondition: {},
    evolution: { targetId: "recurserpent", fragmentCost: 7 },
  },
  {
    id: "recurserpent",
    name: "Recurserpent",
    description: "Each scale contains a smaller copy of itself",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: [" ,--. ", "(,-.))", " `--' "],
      rich: [" ,--. ", "(,-.))", " `--' "],
    },
    spawnCondition: {},
  },
  {
    id: "driftpixel",
    name: "Driftpixel",
    description: "Floats aimlessly between screen buffers",
    rarity: "uncommon",
    baseCatchRate: 0.5,
    art: {
      simple: ["~ . ~", " .+. ", "~ . ~"],
      rich: ["~ . ~", " .+. ", "~ . ~"],
    },
    spawnCondition: { timeOfDay: ["afternoon", "evening"] },
    evolution: { targetId: "driftswarm", fragmentCost: 7 },
  },
  {
    id: "driftswarm",
    name: "Driftswarm",
    description: "Hundreds of lost pixels moving as one",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["~.~.~", ".+.+.", "~.~.~"],
      rich: ["~.~.~", ".+.+.", "~.~.~"],
    },
    spawnCondition: {},
  },
  {
    id: "staticling",
    name: "Staticling",
    description: "Born from white noise between channels",
    rarity: "uncommon",
    baseCatchRate: 0.55,
    art: {
      simple: [" %%% ", " %o% ", " %%% "],
      rich: [" %%% ", " %o% ", " %%% "],
    },
    spawnCondition: { timeOfDay: ["night", "morning"] },
    evolution: { targetId: "staticstorm", fragmentCost: 7 },
  },
  {
    id: "staticstorm",
    name: "Staticstorm",
    description: "A raging tempest of electromagnetic interference",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["%%%%%", "%%o%%", "%%%%%"],
      rich: ["%%%%%", "%%o%%", "%%%%%"],
    },
    spawnCondition: {},
  },

  // === RARE (2 base + 2 evolved = 4) ===
  {
    id: "voidmoth",
    name: "Voidmoth",
    description: "Drawn to the glow of active terminals",
    rarity: "rare",
    baseCatchRate: 0.35,
    art: {
      simple: ["\\ | /", " \\|/ ", " /|\\ ", "/ | \\"],
      rich: ["\\ | /", " \\|/ ", " /|\\ ", "/ | \\"],
    },
    spawnCondition: { timeOfDay: ["night", "evening"] },
    evolution: { targetId: "voidraptor", fragmentCost: 10, catalystItemId: "shard" },
  },
  {
    id: "voidraptor",
    name: "Voidraptor",
    description: "Its wings tear holes in the display wherever it flies",
    rarity: "rare",
    baseCatchRate: 0,
    art: {
      simple: ["\\\\|//", " \\|/ ", " /|\\ ", "//|\\\\"],
      rich: ["\\\\|//", " \\|/ ", " /|\\ ", "//|\\\\"],
    },
    spawnCondition: {},
  },
  {
    id: "flickerjack",
    name: "Flickerjack",
    description: "A mischievous sprite that scrambles your cursor position",
    rarity: "rare",
    baseCatchRate: 0.3,
    art: {
      simple: [" >:) ", " ]|[ ", " / \\ "],
      rich: [" >:) ", " ]|[ ", " / \\ "],
    },
    spawnCondition: { timeOfDay: ["morning", "afternoon"] },
    evolution: { targetId: "flickerfiend", fragmentCost: 10, catalystItemId: "shard" },
  },
  {
    id: "flickerfiend",
    name: "Flickerfiend",
    description: "Commands an army of misplaced characters",
    rarity: "rare",
    baseCatchRate: 0,
    art: {
      simple: [">>:))", "]]|[[", " / \\ "],
      rich: [">>:))", "]]|[[", " / \\ "],
    },
    spawnCondition: {},
  },

  // === EPIC (1 base + 1 evolved = 2) ===
  {
    id: "phantomcursor",
    name: "Phantomcursor",
    description: "The ghost of every misplaced caret",
    rarity: "epic",
    baseCatchRate: 0.15,
    art: {
      simple: ["  |  ", " [|] ", "  |  ", " /_\\ "],
      rich: ["  |  ", " [|] ", "  |  ", " /_\\ "],
    },
    spawnCondition: { minTotalTicks: 200 },
    evolution: { targetId: "phantomkernel", fragmentCost: 15, catalystItemId: "prism" },
  },
  {
    id: "phantomkernel",
    name: "Phantomkernel",
    description: "A spectral process that haunts your system at ring zero",
    rarity: "epic",
    baseCatchRate: 0,
    art: {
      simple: [" .|. ", "[[|]]", " .|. ", "//_\\\\"],
      rich: [" .|. ", "[[|]]", " .|. ", "//_\\\\"],
    },
    spawnCondition: {},
  },

  // === LEGENDARY (1, no evolution) ===
  {
    id: "overflux",
    name: "Overflux",
    description: "A cascade of raw energy from the edge of memory",
    rarity: "legendary",
    baseCatchRate: 0.05,
    art: {
      simple: ["<|=|>", "=|X|=", "<|=|>"],
      rich: ["<|=|>", "=|X|=", "<|=|>"],
    },
    spawnCondition: { minTotalTicks: 500, timeOfDay: ["night"] },
  },
];

export function getCreatureMap(): Map<string, CreatureDefinition> {
  const map = new Map<string, CreatureDefinition>();
  for (const c of CREATURES) {
    map.set(c.id, c);
  }
  return map;
}

export function getSpawnableCreatures(): CreatureDefinition[] {
  return CREATURES.filter((c) => c.baseCatchRate > 0);
}
