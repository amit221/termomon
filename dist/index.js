"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.calculateCreatureScore = exports.calculateSlotScore = exports.calculateColorRarityScore = exports.calculateTraitRarityScore = exports.isCollectionFull = exports.releaseCreature = exports.archiveCreature = exports.listPartnersFor = exports.listBreedable = exports.calculateInheritance = exports.executeBreed = exports.previewBreed = exports.getTraitDefinition = exports.pickTraitForSlot = exports.pickSpecies = exports.getAllSpecies = exports.getSpeciesById = exports.loadSpecies = exports.formatMessage = exports.loadConfig = exports.loadCreatureName = exports.getVariantById = exports.SimpleTextRenderer = exports.StateManager = exports.GameEngine = void 0;
var game_engine_1 = require("./engine/game-engine");
Object.defineProperty(exports, "GameEngine", { enumerable: true, get: function () { return game_engine_1.GameEngine; } });
var state_manager_1 = require("./state/state-manager");
Object.defineProperty(exports, "StateManager", { enumerable: true, get: function () { return state_manager_1.StateManager; } });
var simple_text_1 = require("./renderers/simple-text");
Object.defineProperty(exports, "SimpleTextRenderer", { enumerable: true, get: function () { return simple_text_1.SimpleTextRenderer; } });
var traits_1 = require("./config/traits");
Object.defineProperty(exports, "getVariantById", { enumerable: true, get: function () { return traits_1.getVariantById; } });
Object.defineProperty(exports, "loadCreatureName", { enumerable: true, get: function () { return traits_1.loadCreatureName; } });
var loader_1 = require("./config/loader");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return loader_1.loadConfig; } });
Object.defineProperty(exports, "formatMessage", { enumerable: true, get: function () { return loader_1.formatMessage; } });
var species_1 = require("./config/species");
Object.defineProperty(exports, "loadSpecies", { enumerable: true, get: function () { return species_1.loadSpecies; } });
Object.defineProperty(exports, "getSpeciesById", { enumerable: true, get: function () { return species_1.getSpeciesById; } });
Object.defineProperty(exports, "getAllSpecies", { enumerable: true, get: function () { return species_1.getAllSpecies; } });
Object.defineProperty(exports, "pickSpecies", { enumerable: true, get: function () { return species_1.pickSpecies; } });
Object.defineProperty(exports, "pickTraitForSlot", { enumerable: true, get: function () { return species_1.pickTraitForSlot; } });
Object.defineProperty(exports, "getTraitDefinition", { enumerable: true, get: function () { return species_1.getTraitDefinition; } });
var breed_1 = require("./engine/breed");
Object.defineProperty(exports, "previewBreed", { enumerable: true, get: function () { return breed_1.previewBreed; } });
Object.defineProperty(exports, "executeBreed", { enumerable: true, get: function () { return breed_1.executeBreed; } });
Object.defineProperty(exports, "calculateInheritance", { enumerable: true, get: function () { return breed_1.calculateInheritance; } });
Object.defineProperty(exports, "listBreedable", { enumerable: true, get: function () { return breed_1.listBreedable; } });
Object.defineProperty(exports, "listPartnersFor", { enumerable: true, get: function () { return breed_1.listPartnersFor; } });
var archive_1 = require("./engine/archive");
Object.defineProperty(exports, "archiveCreature", { enumerable: true, get: function () { return archive_1.archiveCreature; } });
Object.defineProperty(exports, "releaseCreature", { enumerable: true, get: function () { return archive_1.releaseCreature; } });
Object.defineProperty(exports, "isCollectionFull", { enumerable: true, get: function () { return archive_1.isCollectionFull; } });
var rarity_1 = require("./engine/rarity");
Object.defineProperty(exports, "calculateTraitRarityScore", { enumerable: true, get: function () { return rarity_1.calculateTraitRarityScore; } });
Object.defineProperty(exports, "calculateColorRarityScore", { enumerable: true, get: function () { return rarity_1.calculateColorRarityScore; } });
Object.defineProperty(exports, "calculateSlotScore", { enumerable: true, get: function () { return rarity_1.calculateSlotScore; } });
Object.defineProperty(exports, "calculateCreatureScore", { enumerable: true, get: function () { return rarity_1.calculateCreatureScore; } });
var logger_1 = require("./logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map