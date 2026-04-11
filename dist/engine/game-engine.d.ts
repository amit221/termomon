import { GameState, Tick, TickResult, ScanResult, CatchResult, BreedPreview, BreedResult, ArchiveResult, StatusResult, BreedTable } from "../types";
export declare class GameEngine {
    private state;
    constructor(state: GameState);
    processTick(tick: Tick, rng?: () => number): TickResult;
    scan(rng?: () => number): ScanResult;
    catch(nearbyIndex: number, rng?: () => number): CatchResult;
    breedPreview(parentAId: string, parentBId: string): BreedPreview;
    breedExecute(parentAId: string, parentBId: string, rng?: () => number): BreedResult;
    buildBreedTable(): BreedTable;
    archive(creatureId: string): ArchiveResult;
    release(creatureId: string): void;
    status(): StatusResult;
    getState(): GameState;
}
//# sourceMappingURL=game-engine.d.ts.map