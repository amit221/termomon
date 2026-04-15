import * as fs from "fs";
import * as path from "path";
import { BugHunterReport } from "./bug-hunter";
import { BalanceReport } from "./balance-analyzer";
import { McpSmokeReport } from "./mcp-smoke";

export function formatBugReport(report: BugHunterReport): string {
  const lines: string[] = [];
  const durationSec = (report.durationMs / 1000).toFixed(2);
  lines.push(`=== Bug Hunter Report ===`);
  lines.push(`Runs: ${report.totalRuns} runs | Duration: ${durationSec}s`);
  lines.push("");

  if (report.violations.length === 0) {
    lines.push(`Result: 0 violations found — all invariants held.`);
  } else {
    lines.push(`Result: ${report.violations.length} violation${report.violations.length === 1 ? "" : "s"} found!`);
    lines.push("");
    for (const v of report.violations) {
      lines.push(`  [VIOLATION] invariant=${v.invariant} | seed=${v.seed} | tick=${v.tick} | action=${v.action}`);
      lines.push(`              detail: ${v.detail}`);
    }
  }

  return lines.join("\n");
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines: string[] = [];
  const durationSec = (report.durationMs / 1000).toFixed(2);
  lines.push(`=== Balance Report ===`);
  lines.push(`Runs: ${report.totalRuns} runs | Duration: ${durationSec}s`);
  lines.push("");

  lines.push("Highlights:");
  for (const h of report.highlights) {
    lines.push(`  • ${h}`);
  }
  lines.push("");

  const xp = report.stats.xpSources;
  const totalXp = xp.catches + xp.discoveries;
  lines.push("XP Sources:");
  if (totalXp > 0) {
    lines.push(`  catches:     ${xp.catches} (${((xp.catches / totalXp) * 100).toFixed(1)}%)`);
    lines.push(`  discoveries: ${xp.discoveries} (${((xp.discoveries / totalXp) * 100).toFixed(1)}%)`);
  } else {
    lines.push(`  catches: ${xp.catches} | discoveries: ${xp.discoveries}`);
  }

  return lines.join("\n");
}

export function formatSmokeReport(report: McpSmokeReport): string {
  const lines: string[] = [];
  const durationSec = (report.durationMs / 1000).toFixed(2);
  lines.push(`=== MCP Smoke Report ===`);
  lines.push(`Runs: ${report.totalRuns} runs | Duration: ${durationSec}s`);
  lines.push("");

  const normal = report.toolResults.filter((r) => !r.isEdgeCase);
  const edge = report.toolResults.filter((r) => r.isEdgeCase);

  lines.push("Normal Operations:");
  for (const r of normal) {
    const status = r.success ? "PASS" : "FAIL";
    const errPart = r.error ? ` — ${r.error}` : "";
    lines.push(`  [${status}] ${r.tool}${errPart}`);
  }
  lines.push("");

  lines.push("Edge Cases:");
  for (const r of edge) {
    const status = r.success ? "PASS" : "FAIL";
    const errPart = r.error ? ` — ${r.error}` : "";
    lines.push(`  [${status}] ${r.tool}${errPart}`);
  }
  lines.push("");

  const totalPass = report.toolResults.filter((r) => r.success).length;
  const totalFail = report.toolResults.filter((r) => !r.success).length;
  lines.push(`Summary: ${totalPass} passed, ${totalFail} failed out of ${report.toolResults.length} total`);

  return lines.join("\n");
}

export function writeJsonReport(module: string, data: unknown): string {
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const timestamp = Date.now();
  const fileName = `${module}-${timestamp}.json`;
  const filePath = path.join(reportsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}
