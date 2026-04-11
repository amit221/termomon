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
exports.getVariantById = getVariantById;
exports.loadCreatureName = loadCreatureName;
exports._resetTraitsCache = _resetTraitsCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let _config = null;
let _byId = new Map();
function ensureLoaded() {
    if (_config)
        return;
    const configPath = path.resolve(__dirname, "../../config/traits.json");
    _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    _byId = new Map();
    for (const slotRaw of _config.slots) {
        for (const variantList of Object.values(slotRaw.variants)) {
            for (const v of variantList) {
                _byId.set(v.id, { id: v.id, name: v.name, art: v.art });
            }
        }
    }
}
function getVariantById(id) {
    ensureLoaded();
    return _byId.get(id);
}
function loadCreatureName(rng) {
    const namesPath = path.resolve(__dirname, "../../config/names.json");
    const data = JSON.parse(fs.readFileSync(namesPath, "utf-8"));
    const names = data.names;
    return names[Math.floor(rng() * names.length)];
}
function _resetTraitsCache() {
    _config = null;
    _byId = new Map();
}
//# sourceMappingURL=traits.js.map