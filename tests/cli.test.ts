import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("CLI", () => {
  let tmpDir: string;
  let statePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "termomon-cli-test-"));
    statePath = path.join(tmpDir, "state.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function run(cmd: string): string {
    return execSync(`npx ts-node src/cli.ts ${cmd}`, {
      env: { ...process.env, TERMOMON_STATE_PATH: statePath },
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
  }

  test("status returns JSON with profile", () => {
    const out = run("status --json");
    const result = JSON.parse(out);
    expect(result.profile.level).toBe(1);
  });

  test("tick records a tick and returns result", () => {
    const out = run("tick --json");
    const result = JSON.parse(out);
    expect(result.notifications).toBeDefined();
  });

  test("scan returns nearby list", () => {
    const out = run("scan --json");
    const result = JSON.parse(out);
    expect(result.nearby).toBeDefined();
  });

  test("inventory returns items", () => {
    const out = run("inventory --json");
    const result = JSON.parse(out);
    expect(result).toBeDefined();
  });

  test("status in text mode returns readable output", () => {
    const out = run("status");
    expect(out).toContain("Level");
    expect(out).toContain("STATUS");
  });
});
