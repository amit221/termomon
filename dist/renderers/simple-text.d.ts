import { Renderer, ScanResult, CatchResult, BreedPreview, BreedResult, StatusResult, Notification, CollectionCreature, BreedTable } from "../types";
export declare class SimpleTextRenderer implements Renderer {
    renderScan(result: ScanResult): string;
    renderCatch(result: CatchResult): string;
    renderBreedPreview(preview: BreedPreview): string;
    renderBreedResult(result: BreedResult): string;
    renderCollection(collection: CollectionCreature[]): string;
    renderArchive(archive: CollectionCreature[]): string;
    renderEnergy(energy: number, maxEnergy: number): string;
    renderStatus(result: StatusResult): string;
    renderNotification(notification: Notification): string;
    renderBreedTable(table: BreedTable): string;
    private appendBreedSpeciesSection;
    private padSilhouette;
    private breedRowLine;
}
//# sourceMappingURL=simple-text.d.ts.map