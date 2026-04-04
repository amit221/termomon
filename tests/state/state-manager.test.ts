import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";
import { GameState } from "../../src/types";

describe("StateManager", () => {
  let tmpDir: string;
  let stateManager: StateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "termomon-test-"));
    stateManager = new StateManager(path.join(tmpDir, "state.json"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates default state when no file exists", () => {
    const state = stateManager.load();
    expect(state.version).toBe(2);
    expect(state.profile.level).toBe(1);
    expect(state.profile.xp).toBe(0);
    expect(state.profile.totalCatches).toBe(0);
    expect(state.profile.totalMerges).toBe(0);
    expect(state.collection).toEqual([]);
    expect(state.nearby).toEqual([]);
    expect(state.batch).toBeNull();
    expect(state.energy).toBe(5);
    expect(state.claimedMilestones).toEqual([]);
    expect(state.settings.renderer).toBe("simple");
    expect(state.settings.notificationLevel).toBe("moderate");
  });

  test("saves and loads state", () => {
    const state = stateManager.load();
    state.profile.totalCatches = 42;
    state.energy = 15;
    stateManager.save(state);

    const loaded = stateManager.load();
    expect(loaded.profile.totalCatches).toBe(42);
    expect(loaded.energy).toBe(15);
  });

  test("creates parent directory if missing", () => {
    const deepPath = path.join(tmpDir, "a", "b", "state.json");
    const mgr = new StateManager(deepPath);
    const state = mgr.load();
    mgr.save(state);
    expect(fs.existsSync(deepPath)).toBe(true);
  });

  test("migrates v1 state to v2", () => {
    const v1State = {
      version: 1,
      profile: {
        level: 3,
        xp: 150,
        totalCatches: 10,
        totalTicks: 200,
        currentStreak: 5,
        longestStreak: 7,
        lastActiveDate: "2026-01-01",
      },
      collection: [{ creatureId: "mousebyte", fragments: 3 }],
      inventory: { bytetrap: 5 },
      nearby: [],
      recentTicks: [],
      claimedMilestones: ["first_catch"],
      settings: { renderer: "simple", notificationLevel: "moderate" },
    };

    const stateFile = path.join(tmpDir, "v1state.json");
    fs.writeFileSync(stateFile, JSON.stringify(v1State));
    const mgr = new StateManager(stateFile);
    const migrated = mgr.load();

    expect(migrated.version).toBe(2);
    expect(migrated.profile.level).toBe(3);
    expect(migrated.profile.totalCatches).toBe(10);
    expect(migrated.profile.totalMerges).toBe(0);
    expect(migrated.energy).toBe(5);
    expect(migrated.batch).toBeNull();
    // v1 collection is discarded on migration (trait-based system is incompatible)
    expect(migrated.collection).toEqual([]);
    expect(migrated.claimedMilestones).toEqual(["first_catch"]);
  });
});
