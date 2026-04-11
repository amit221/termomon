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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSpecies = loadSpecies;
exports.getSpeciesById = getSpeciesById;
exports.getAllSpecies = getAllSpecies;
exports.pickSpecies = pickSpecies;
exports.pickTraitForSlot = pickTraitForSlot;
exports.getTraitDefinition = getTraitDefinition;
exports._resetSpeciesCache = _resetSpeciesCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let _speciesCache = null;
let _speciesById = new Map();
let _traitIndex = new Map(); // speciesId -> variantId -> TraitDefinition
function ensureLoaded() {
    if (_speciesCache)
        return;
    _speciesCache = loadSpecies();
    _speciesById = new Map();
    _traitIndex = new Map();
    for (const species of _speciesCache) {
        _speciesById.set(species.id, species);
        const variantMap = new Map();
        for (const slotId of Object.keys(species.traitPools)) {
            const traits = species.traitPools[slotId];
            if (traits) {
                for (const trait of traits) {
                    variantMap.set(trait.id, trait);
                }
            }
        }
        _traitIndex.set(species.id, variantMap);
    }
}
function loadSpecies() {
    const speciesDir = path.resolve(__dirname, "../../config/species");
    if (!fs.existsSync(speciesDir))
        return [];
    const files = fs.readdirSync(speciesDir).filter((f) => f.endsWith(".json"));
    const species = [];
    for (const file of files) {
        const raw = fs.readFileSync(path.join(speciesDir, file), "utf-8");
        species.push(JSON.parse(raw));
    }
    return species;
}
function getSpeciesById(id) {
    ensureLoaded();
    return _speciesById.get(id);
}
function getAllSpecies() {
    ensureLoaded();
    return _speciesCache;
}
function pickSpecies(rng) {
    ensureLoaded();
    const species = _speciesCache;
    if (species.length === 0) {
        throw new Error("No species loaded");
    }
    const totalWeight = species.reduce((sum, s) => sum + s.spawnWeight, 0);
    let roll = rng() * totalWeight;
    for (const s of species) {
        roll -= s.spawnWeight;
        if (roll <= 0)
            return s;
    }
    return species[species.length - 1];
}
function pickTraitForSlot(species, slotId, rng) {
    const traits = species.traitPools[slotId];
    if (!traits || traits.length === 0) {
        throw new Error(`No traits for slot ${slotId} in species ${species.id}`);
    }
    const totalWeight = traits.reduce((sum, t) => sum + t.spawnRate, 0);
    let roll = rng() * totalWeight;
    for (const t of traits) {
        roll -= t.spawnRate;
        if (roll <= 0)
            return t;
    }
    return traits[traits.length - 1];
}
function getTraitDefinition(speciesId, variantId) {
    ensureLoaded();
    const variantMap = _traitIndex.get(speciesId);
    if (!variantMap)
        return undefined;
    return variantMap.get(variantId);
}
function _resetSpeciesCache() {
    _speciesCache = null;
    _speciesById = new Map();
    _traitIndex = new Map();
}
//# sourceMappingURL=species.js.map