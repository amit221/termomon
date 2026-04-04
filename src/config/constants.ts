import { loadConfig, buildMilestoneCondition } from "./loader";

const config = loadConfig();

// Batch / Spawning
export const TICKS_PER_SPAWN_CHECK = config.batch.ticksPerSpawnCheck;
export const SPAWN_PROBABILITY = config.batch.spawnProbability;
export const BATCH_LINGER_MS = config.batch.batchLingerMs;
export const SHARED_ATTEMPTS = config.batch.sharedAttempts;
export const TIME_OF_DAY_RANGES: Record<string, [number, number]> = config.batch.timeOfDay;

// Catching
export const BASE_CATCH_RATE = config.catching.baseCatchRate;
export const MIN_CATCH_RATE = config.catching.minCatchRate;
export const MAX_CATCH_RATE = config.catching.maxCatchRate;
export const FAIL_PENALTY_PER_MISS = config.catching.failPenaltyPerMiss;
export const XP_PER_RARITY: Record<string, number> = config.catching.xpPerRarity;

// Energy
export const ENERGY_GAIN_INTERVAL_MS = config.energy.gainIntervalMs;
export const MAX_ENERGY = config.energy.maxEnergy;
export const STARTING_ENERGY = config.energy.startingEnergy;
export const SESSION_BONUS_ENERGY = config.energy.sessionBonus;

// Merge
export const BASE_MERGE_RATE = config.merge.baseMergeRate;
export const MIN_MERGE_RATE = config.merge.minMergeRate;
export const MAX_MERGE_RATE = config.merge.maxMergeRate;
export const BASE_MUTATION = config.merge.baseMutation;
export const VOLATILE_MUTATION_BONUS = config.merge.volatileMutationBonus;
export const STABLE_MUTATION_PENALTY = config.merge.stableMutationPenalty;
export const MIN_MUTATION = config.merge.minMutation;
export const MAX_MUTATION = config.merge.maxMutation;
export const MUTATION_UP_WEIGHT = config.merge.mutationUpWeight;
export const DOUBLE_MUTATION_CHANCE = config.merge.doubleMutationChance;

// Progression
export const XP_PER_LEVEL = config.progression.xpPerLevel;
export const SESSION_GAP_MS = config.progression.sessionGapMs;
export const TICK_PRUNE_COUNT = config.progression.tickPruneCount;

// Milestones
export interface Milestone {
  id: string;
  description: string;
  condition: (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean;
  reward: Array<{ energy?: number }>;
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
