import { GameState } from "../types";
declare const ENERGY_GAIN_INTERVAL_MS: number;
declare const MAX_ENERGY: number;
export declare function processEnergyGain(state: GameState, now: number): number;
export declare function spendEnergy(state: GameState, amount: number): void;
export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };
//# sourceMappingURL=energy.d.ts.map