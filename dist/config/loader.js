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
exports.loadConfig = loadConfig;
exports.formatMessage = formatMessage;
exports.buildMilestoneCondition = buildMilestoneCondition;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let cached = null;
function loadConfig() {
    if (cached)
        return cached;
    const configPath = path.resolve(__dirname, "../../config/balance.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    cached = JSON.parse(raw);
    return cached;
}
function formatMessage(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return key in vars ? String(vars[key]) : match;
    });
}
function buildMilestoneCondition(condition) {
    return (profile) => {
        const value = profile[condition.type];
        return value >= condition.threshold;
    };
}
//# sourceMappingURL=loader.js.map