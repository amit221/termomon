import { GameState, Tick, TimeOfDay } from "../types";
export declare function getTimeOfDay(hour: number): TimeOfDay;
export declare function deriveStreak(lastActiveDate: string, todayDate: string, currentStreak: number): number;
export declare function processNewTick(state: GameState, tick: Tick): void;
//# sourceMappingURL=ticks.d.ts.map