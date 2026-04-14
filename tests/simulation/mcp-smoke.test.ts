import { McpSmokeTester } from "../../src/simulation/mcp-smoke";

describe("McpSmokeTester", () => {
  test("runs smoke test without crashes", () => {
    const tester = new McpSmokeTester({ runs: 2, seed: 42 });
    const report = tester.run();
    expect(report.totalRuns).toBe(2);
    expect(report.toolResults).toBeDefined();
    expect(typeof report.durationMs).toBe("number");
  });

  test("tests all core tools", () => {
    const tester = new McpSmokeTester({ runs: 1, seed: 42 });
    const report = tester.run();
    const testedTools = new Set(report.toolResults.map((r) => r.tool));
    expect(testedTools.has("scan")).toBe(true);
    expect(testedTools.has("status")).toBe(true);
    expect(testedTools.has("energy")).toBe(true);
  });

  test("catches error-producing edge cases", () => {
    const tester = new McpSmokeTester({ runs: 1, seed: 42 });
    const report = tester.run();
    const edgeCases = report.toolResults.filter((r) => r.isEdgeCase);
    expect(edgeCases.length).toBeGreaterThan(0);
  });
});
