import { BalanceConfig, MilestoneCondition } from "../types";
export declare function loadConfig(): BalanceConfig;
export declare function formatMessage(template: string, vars: Record<string, string | number>): string;
export declare function buildMilestoneCondition(condition: MilestoneCondition): (profile: {
    totalCatches: number;
    currentStreak: number;
    totalTicks: number;
}) => boolean;
//# sourceMappingURL=loader.d.ts.map