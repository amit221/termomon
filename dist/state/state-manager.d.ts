import { GameState } from "../types";
export declare class StateManager {
    private filePath;
    constructor(filePath: string);
    load(): GameState;
    save(state: GameState): void;
}
//# sourceMappingURL=state-manager.d.ts.map