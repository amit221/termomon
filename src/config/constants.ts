import { loadConfig, buildMilestoneCondition } from "./loader";

const config = loadConfig();

// Spawning
export const TICKS_PER_SPAWN_CHECK = config.spawning.ticksPerSpawnCheck;
export const SPAWN_PROBABILITY = config.spawning.spawnProbability;
export const MAX_NEARBY = config.spawning.maxNearby;
export const INITIAL_SPAWN_COUNT = config.spawning.initialSpawnCount;
export const CREATURE_LINGER_MS = config.spawning.creatureLingerMs;
export const MAX_CATCH_ATTEMPTS = config.spawning.maxCatchAttempts;
export const SPAWN_WEIGHTS: Record<string, number> = config.spawning.spawnWeights;
export const TIME_OF_DAY_RANGES: Record<string, [number, number]> = config.spawning.timeOfDay;

// Catching
export const MAX_CATCH_RATE = config.catching.maxCatchRate;
export const BONUS_ITEM_DROP_CHANCE = config.catching.bonusItemDropChance;
export const BONUS_ITEM_ID = config.catching.bonusItemId;
export const FRAGMENTS_PER_CATCH = config.catching.fragmentsPerCatch;
export const XP_PER_CATCH: Record<string, number> = config.catching.xpPerCatch;

// Progression
export const XP_PER_LEVEL = config.progression.xpPerLevel;
export const SESSION_GAP_MS = config.progression.sessionGapMs;
export const TICK_PRUNE_COUNT = config.progression.tickPruneCount;

// Rewards
export const PASSIVE_DRIP_INTERVAL = config.rewards.passiveDripInterval;
export const PASSIVE_DRIP_ITEMS: Array<{ itemId: string; count: number; weight: number }> =
  config.rewards.passiveDripItems;
export const SESSION_REWARD_ITEMS: Array<{ itemId: string; count: number; weight: number }> =
  config.rewards.sessionRewardItems;

// Milestones — build condition functions from declarative JSON
export interface Milestone {
  id: string;
  description: string;
  condition: (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean;
  reward: Array<{ itemId: string; count: number }>;
  oneTime: boolean;
}

export const MILESTONES: Milestone[] = config.rewards.milestones.map((m) => ({
  id: m.id,
  description: m.description,
  condition: buildMilestoneCondition(m.condition),
  reward: m.reward,
  oneTime: m.oneTime,
}));

// Messages
export const MESSAGES: Record<string, Record<string, string>> = config.messages;
