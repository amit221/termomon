import { GameState, LevelUpResult } from "../types";
import { loadConfig } from "../config/loader";

export function getXpForNextLevel(level: number): number {
  const config = loadConfig();
  const thresholds = config.leveling.thresholds;
  const index = Math.min(level - 1, thresholds.length - 1);
  return thresholds[index];
}

export function getTraitRankCap(level: number): number {
  const config = loadConfig();
  const caps = config.leveling.traitRankCaps;
  const index = Math.min(level - 1, caps.length - 1);
  return caps[index];
}

export function grantXp(state: GameState, amount: number): LevelUpResult | null {
  state.profile.xp += amount;
  const oldLevel = state.profile.level;
  let currentLevel = oldLevel;

  while (true) {
    const needed = getXpForNextLevel(currentLevel);
    if (state.profile.xp >= needed) {
      state.profile.xp -= needed;
      currentLevel++;
    } else {
      break;
    }
  }

  if (currentLevel > oldLevel) {
    state.profile.level = currentLevel;
    return {
      oldLevel,
      newLevel: currentLevel,
      xpOverflow: state.profile.xp,
    };
  }
  return null;
}
