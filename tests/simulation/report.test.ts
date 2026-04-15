import { formatBugReport, formatBalanceReport, formatSmokeReport, writeJsonReport } from "../../src/simulation/report";
import * as fs from "fs";
import * as path from "path";

describe("report formatter", () => {
  test("formatBugReport with no violations", () => {
    const output = formatBugReport({ totalRuns: 100, violations: [], durationMs: 500 });
    expect(output).toContain("100 runs");
    expect(output).toContain("0 violations");
  });

  test("formatBugReport with violations", () => {
    const output = formatBugReport({
      totalRuns: 100,
      violations: [{
        tick: 5,
        action: "catch",
        invariant: "energy_negative",
        detail: "energy=-1",
        seed: 42,
        stateSnapshot: {},
      }],
      durationMs: 500,
    });
    expect(output).toContain("1 violation");
    expect(output).toContain("energy_negative");
    expect(output).toContain("seed=42");
  });

  test("formatBalanceReport includes highlights", () => {
    const output = formatBalanceReport({
      totalRuns: 50,
      stats: {
        ticksToLevel: new Map(),
        catchRateByTier: new Map(),
        energyDepleted: 0,
        collectionFullCount: 0,
        speciesDiscoveryTicks: [],
        xpSources: { catches: 10, discoveries: 2 },
        breedGenerations: [],
        upgradeRankReached: new Map(),
      },
      highlights: ["Catch rate: 75%", "Max gen: 3"],
      durationMs: 200,
    });
    expect(output).toContain("Catch rate: 75%");
    expect(output).toContain("Max gen: 3");
  });

  test("formatSmokeReport shows tool results", () => {
    const output = formatSmokeReport({
      totalRuns: 1,
      toolResults: [
        { tool: "scan", success: true, isEdgeCase: false },
        { tool: "catch", success: false, error: "out of range", isEdgeCase: true },
      ],
      durationMs: 100,
    });
    expect(output).toContain("scan");
    expect(output).toContain("catch");
  });

  test("writeJsonReport writes valid JSON", () => {
    const reportDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const filePath = writeJsonReport("test", { hello: "world" });
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(content.hello).toBe("world");
    fs.unlinkSync(filePath);
  });
});
