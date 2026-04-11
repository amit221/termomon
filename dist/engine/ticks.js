"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeOfDay = getTimeOfDay;
exports.deriveStreak = deriveStreak;
exports.processNewTick = processNewTick;
const constants_1 = require("../config/constants");
function getTimeOfDay(hour) {
    for (const [period, [start, end]] of Object.entries(constants_1.TIME_OF_DAY_RANGES)) {
        if (start < end) {
            // Normal range (e.g., morning: 6-12)
            if (hour >= start && hour < end)
                return period;
        }
        else {
            // Wrapping range (e.g., night: 21-6)
            if (hour >= start || hour < end)
                return period;
        }
    }
    return "night"; // fallback
}
function deriveStreak(lastActiveDate, todayDate, currentStreak) {
    if (lastActiveDate === todayDate) {
        return Math.max(currentStreak, 1);
    }
    const last = new Date(lastActiveDate + "T00:00:00");
    const today = new Date(todayDate + "T00:00:00");
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
        return currentStreak + 1;
    }
    return 1;
}
function processNewTick(state, tick) {
    state.profile.totalTicks++;
    state.recentTicks.push(tick);
    if (state.recentTicks.length > constants_1.TICK_PRUNE_COUNT) {
        state.recentTicks = state.recentTicks.slice(-constants_1.TICK_PRUNE_COUNT);
    }
    const tickDate = new Date(tick.timestamp);
    const todayStr = tickDate.toISOString().split("T")[0];
    state.profile.currentStreak = deriveStreak(state.profile.lastActiveDate, todayStr, state.profile.currentStreak);
    state.profile.longestStreak = Math.max(state.profile.longestStreak, state.profile.currentStreak);
    state.profile.lastActiveDate = todayStr;
}
//# sourceMappingURL=ticks.js.map