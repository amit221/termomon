"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const ticks_1 = require("./ticks");
const batch_1 = require("./batch");
const catch_1 = require("./catch");
const energy_1 = require("./energy");
const breed_1 = require("./breed");
const archive_1 = require("./archive");
const constants_1 = require("../config/constants");
class GameEngine {
    state;
    constructor(state) {
        this.state = state;
    }
    processTick(tick, rng = Math.random) {
        const notifications = [];
        (0, ticks_1.processNewTick)(this.state, tick);
        const energyGained = (0, energy_1.processEnergyGain)(this.state, tick.timestamp);
        const despawned = (0, batch_1.cleanupBatch)(this.state, tick.timestamp);
        let spawned = false;
        const timeSinceLastSpawn = tick.timestamp - this.state.lastSpawnAt;
        if (!this.state.batch && timeSinceLastSpawn >= constants_1.SPAWN_INTERVAL_MS) {
            const creatures = (0, batch_1.spawnBatch)(this.state, tick.timestamp, rng);
            if (creatures.length > 0) {
                spawned = true;
                this.state.lastSpawnAt = tick.timestamp;
                notifications.push({ message: `${creatures.length} creatures appeared nearby!`, level: "moderate" });
            }
        }
        return { notifications, spawned, energyGained, despawned };
    }
    scan(rng = Math.random) {
        // Auto-spawn if no creatures nearby
        if (this.state.nearby.length === 0) {
            (0, batch_1.spawnBatch)(this.state, Date.now(), rng);
        }
        const nearby = this.state.nearby.map((creature, index) => ({
            index,
            creature,
            catchRate: (0, catch_1.calculateCatchRate)(creature.speciesId, creature.slots, this.state.batch?.failPenalty ?? 0),
            energyCost: (0, catch_1.calculateEnergyCost)(creature.speciesId, creature.slots),
        }));
        const now = Date.now();
        const timeSinceSpawn = now - this.state.lastSpawnAt;
        const nextBatchInMs = Math.max(0, constants_1.SPAWN_INTERVAL_MS - timeSinceSpawn);
        return { nearby, energy: this.state.energy, batch: this.state.batch, nextBatchInMs };
    }
    catch(nearbyIndex, rng = Math.random) {
        if ((0, archive_1.isCollectionFull)(this.state)) {
            throw new Error("Collection is full (15 creatures). Archive or release a creature first.");
        }
        return (0, catch_1.attemptCatch)(this.state, nearbyIndex, rng);
    }
    breedPreview(parentAId, parentBId) {
        return (0, breed_1.previewBreed)(this.state, parentAId, parentBId);
    }
    breedExecute(parentAId, parentBId, rng = Math.random) {
        return (0, breed_1.executeBreed)(this.state, parentAId, parentBId, rng);
    }
    buildBreedTable() {
        return (0, breed_1.buildBreedTable)(this.state);
    }
    archive(creatureId) {
        return (0, archive_1.archiveCreature)(this.state, creatureId);
    }
    release(creatureId) {
        return (0, archive_1.releaseCreature)(this.state, creatureId);
    }
    status() {
        return {
            profile: this.state.profile,
            collectionCount: this.state.collection.length,
            archiveCount: this.state.archive.length,
            energy: this.state.energy,
            nearbyCount: this.state.nearby.length,
            batchAttemptsRemaining: this.state.batch?.attemptsRemaining ?? 0,
        };
    }
    getState() {
        return this.state;
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=game-engine.js.map