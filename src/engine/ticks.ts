import { GameState, Tick, TimeOfDay } from "../types";
import { TICK_PRUNE_COUNT, TIME_OF_DAY_RANGES } from "../config/constants";

export function getTimeOfDay(hour: number): TimeOfDay {
  for (const [period, [start, end]] of Object.entries(TIME_OF_DAY_RANGES)) {
    if (start < end) {
      // Normal range (e.g., morning: 6-12)
      if (hour >= start && hour < end) return period as TimeOfDay;
    } else {
      // Wrapping range (e.g., night: 21-6)
      if (hour >= start || hour < end) return period as TimeOfDay;
    }
  }
  return "night"; // fallback
}

export function deriveStreak(
  lastActiveDate: string,
  todayDate: string,
  currentStreak: number
): number {
  if (lastActiveDate === todayDate) {
    return Math.max(currentStreak, 1);
  }

  const last = new Date(lastActiveDate + "T00:00:00");
  const today = new Date(todayDate + "T00:00:00");
  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) {
    return currentStreak + 1;
  }
  return 1;
}

export function processNewTick(state: GameState, tick: Tick): void {
  state.profile.totalTicks++;

  state.recentTicks.push(tick);
  if (state.recentTicks.length > TICK_PRUNE_COUNT) {
    state.recentTicks = state.recentTicks.slice(-TICK_PRUNE_COUNT);
  }

  const tickDate = new Date(tick.timestamp);
  const todayStr = tickDate.toISOString().split("T")[0];

  state.profile.currentStreak = deriveStreak(
    state.profile.lastActiveDate,
    todayStr,
    state.profile.currentStreak
  );
  state.profile.longestStreak = Math.max(
    state.profile.longestStreak,
    state.profile.currentStreak
  );
  state.profile.lastActiveDate = todayStr;
}
