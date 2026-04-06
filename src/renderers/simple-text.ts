import {
  Renderer,
  ScanResult,
  CatchResult,
  MergeResult,
  MergePreview,
  StatusResult,
  Notification,
  CollectionCreature,
  CreatureSlot,
  Rarity,
  SlotId,
  SlotUpgradeChance,
} from "../types";
import { MAX_ENERGY } from "../engine/energy";
import { getVariantById } from "../config/traits";

const stringWidth = require("string-width") as (str: string) => number;

// --- ANSI codes ---
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";

const RARITY_COLOR: Record<Rarity, string> = {
  common: "\x1b[90m",
  uncommon: "\x1b[97m",
  rare: "\x1b[36m",
  epic: "\x1b[35m",
  legendary: "\x1b[33m",
  mythic: "\x1b[31m",
};

function col(text: string, rarity: Rarity): string {
  return `${RARITY_COLOR[rarity]}${text}${RESET}`;
}

// --- Creature art ---

const ART_WIDTH = 13;

function centerLine(rawText: string, coloredText: string): string {
  const w = stringWidth(rawText);
  const left = Math.floor((ART_WIDTH - w) / 2);
  return " ".repeat(Math.max(0, left)) + coloredText;
}

function renderCreatureLines(slots: CreatureSlot[]): string[] {
  const bySlot: Partial<Record<SlotId, CreatureSlot>> = {};
  for (const s of slots) {
    bySlot[s.slotId] = s;
  }

  const eyesSlot = bySlot["eyes"];
  const mouthSlot = bySlot["mouth"];
  const bodySlot = bySlot["body"];
  const tailSlot = bySlot["tail"];

  const eyesArt = eyesSlot ? (getVariantById(eyesSlot.variantId)?.art ?? "o.o") : "o.o";
  const mouthArt = mouthSlot ? (getVariantById(mouthSlot.variantId)?.art ?? " - ") : " - ";
  const bodyArt = bodySlot ? (getVariantById(bodySlot.variantId)?.art ?? " ░░ ") : " ░░ ";
  const tailArt = tailSlot ? (getVariantById(tailSlot.variantId)?.art ?? "~") : "~";

  const eyesRarity = eyesSlot?.rarity ?? "common";
  const mouthRarity = mouthSlot?.rarity ?? "common";
  const bodyRarity = bodySlot?.rarity ?? "common";
  const tailRarity = tailSlot?.rarity ?? "common";

  // Line 1: eyes centered in W=13
  const eyesRaw = eyesArt;
  const eyesColored = col(eyesArt, eyesRarity);
  const eyesLine = "      " + centerLine(eyesRaw, eyesColored);

  // Line 2: (mouth) centered in W=13
  const mouthRaw = `(${mouthArt})`;
  const mouthColored = col("(", mouthRarity) + col(mouthArt, mouthRarity) + col(")", mouthRarity);
  const mouthLine = "      " + centerLine(mouthRaw, mouthColored);

  // Line 3: ╱body╲ centered in W=13
  const bodyRaw = `╱${bodyArt}╲`;
  const bodyColored = col("╱", bodyRarity) + col(bodyArt, bodyRarity) + col("╲", bodyRarity);
  const bodyLine = "      " + centerLine(bodyRaw, bodyColored);

  // Line 4: tail centered in W=13
  const tailRaw = tailArt;
  const tailColored = col(tailArt, tailRarity);
  const tailLine = "      " + centerLine(tailRaw, tailColored);

  return [eyesLine, mouthLine, bodyLine, tailLine];
}

// --- Progress bars ---

function energyBar(energy: number, maxEnergy: number): string {
  const filled = Math.min(10, Math.round((energy / maxEnergy) * 10));
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return `  Energy: ${GREEN}${bar}${RESET} ${energy}/${maxEnergy}`;
}

function xpBar(xp: number, nextXp: number): string {
  const filled = Math.min(10, Math.round((xp / nextXp) * 10));
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return `${GREEN}${bar}${RESET} ${xp}/${nextXp}`;
}

function upgradeBar(chance: number, rarity: Rarity): string {
  const filled = Math.round(chance * 10);
  const bar = "▸".repeat(filled) + "░".repeat(10 - filled);
  return `${RARITY_COLOR[rarity]}${bar}${RESET}`;
}

// --- Divider ---

function divider(): string {
  return `  ${DIM}${"─".repeat(46)}${RESET}`;
}

// --- Variant names line ---

function variantNamesLine(slots: CreatureSlot[]): string {
  const names: string[] = [];
  const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
  for (const slotId of order) {
    const s = slots.find((sl) => sl.slotId === slotId);
    if (s) {
      const variant = getVariantById(s.variantId);
      names.push(variant?.name ?? s.variantId);
    }
  }
  return `      ${DIM}${names.join("  ")}${RESET}`;
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    const lines: string[] = [];

    lines.push(energyBar(result.energy, MAX_ENERGY));
    lines.push(`  ${DIM}${result.nearby.length} creature${result.nearby.length !== 1 ? "s" : ""} nearby${RESET}`);
    lines.push("");

    for (const entry of result.nearby) {
      const c = entry.creature;
      const rate = Math.round(entry.catchRate * 100);
      lines.push(`  ${DIM}[${entry.index + 1}]${RESET} ${BOLD}${c.name}${RESET}         Rate: ${rate}%  Cost: ${entry.energyCost}E`);
      for (const line of renderCreatureLines(c.slots)) {
        lines.push(line);
      }
      lines.push("");
    }

    lines.push(divider());
    lines.push(`  ${DIM}/catch <number> to attempt a catch${RESET}`);

    return lines.join("\n");
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const lines: string[] = [];

    if (result.success) {
      lines.push(`  ${GREEN}${BOLD}✦ CAUGHT! ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} joined your collection!`);
      for (const line of renderCreatureLines(c.slots)) {
        lines.push(line);
      }
      lines.push("");
      lines.push(`  ${DIM}+${result.xpEarned} XP   -${result.energySpent} Energy${RESET}`);
      lines.push("");
      lines.push(divider());
    } else if (result.fled) {
      lines.push(`  ${RARITY_COLOR["mythic"]}${BOLD}✦ FLED ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} fled into the void!`);
      lines.push(`  ${DIM}The creature is gone.${RESET}`);
      lines.push("");
      lines.push(`  ${DIM}-${result.energySpent} Energy${RESET}`);
      lines.push("");
      lines.push(divider());
    } else {
      lines.push(`  ${RARITY_COLOR["legendary"]}${BOLD}✦ ESCAPED ✦${RESET}`);
      lines.push("");
      lines.push(`  ${BOLD}${c.name}${RESET} slipped away!`);
      for (const line of renderCreatureLines(c.slots)) {
        lines.push(line);
      }
      lines.push("");
      lines.push(`  ${DIM}-${result.energySpent} Energy   ${result.attemptsRemaining} attempts remaining${RESET}`);
      lines.push("");
      lines.push(divider());
    }

    return lines.join("\n");
  }

  renderMergePreview(preview: MergePreview): string {
    const { target, food, slotChances } = preview;
    const lines: string[] = [];

    lines.push(`  Feed ${BOLD}${food.name}${RESET} ${DIM}(Lv ${food.generation})${RESET} into ${BOLD}${target.name}${RESET} ${DIM}(Lv ${target.generation})${RESET}?`);
    lines.push(`  ${DIM}${food.name} will be consumed.${RESET}`);
    lines.push("");

    lines.push(`  ${BOLD}Target: ${target.name}${RESET}`);
    for (const line of renderCreatureLines(target.slots)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Food: ${food.name}${RESET}`);
    for (const line of renderCreatureLines(food.slots)) {
      lines.push(line);
    }
    lines.push("");

    lines.push(`  ${BOLD}Upgrade chances:${RESET}`);
    // Sort by chance descending
    const sorted = [...slotChances].sort((a, b) => b.chance - a.chance);
    for (const sc of sorted) {
      const slotLabel = sc.slotId.padEnd(5);
      const bar = upgradeBar(sc.chance, sc.currentRarity);
      const pct = `${Math.round(sc.chance * 100)}%`.padStart(3);
      const arrow = `${col(sc.currentRarity, sc.currentRarity)} → ${col(sc.nextRarity, sc.nextRarity)}`;
      lines.push(`    ${col(slotLabel, sc.currentRarity)}  ${bar} ${pct}  ${DIM}${sc.currentRarity} → ${sc.nextRarity}${RESET}`);
    }
    lines.push("");
    lines.push(divider());
    lines.push(`  ${DIM}/merge confirm to proceed${RESET}`);

    return lines.join("\n");
  }

  renderMergeResult(result: MergeResult): string {
    const { target, food, upgradedSlot, previousRarity, newRarity, graftedVariantName } = result;
    const lines: string[] = [];

    lines.push(`  ${GREEN}${BOLD}✦ MERGE SUCCESS ✦${RESET}`);
    lines.push("");

    lines.push(`  ${BOLD}${target.name}${RESET} — ${upgradedSlot} upgraded!`);
    lines.push(`    ${col(previousRarity, previousRarity)} → ${col(newRarity, newRarity)}`);
    lines.push(`    ${DIM}→ ${graftedVariantName} (grafted)${RESET}`);
    lines.push("");

    for (const line of renderCreatureLines(target.slots)) {
      lines.push(line);
    }
    lines.push(variantNamesLine(target.slots));
    lines.push("");

    lines.push(`  ${DIM}${food.name} was consumed.${RESET}`);
    lines.push("");
    lines.push(divider());

    return lines.join("\n");
  }

  renderCollection(collection: CollectionCreature[]): string {
    const lines: string[] = [];

    if (collection.length === 0) {
      return "  No creatures in your collection yet. Use /scan to find some!";
    }

    lines.push(`  ${DIM}Your creatures (${collection.length})${RESET}`);
    lines.push("");

    for (const creature of collection) {
      lines.push(`  ${BOLD}${creature.name}${RESET}  Lv ${creature.generation}`);
      for (const line of renderCreatureLines(creature.slots)) {
        lines.push(line);
      }
      lines.push(variantNamesLine(creature.slots));
      lines.push("");
    }

    lines.push(divider());

    return lines.join("\n");
  }

  renderEnergy(energy: number, maxEnergy: number): string {
    return energyBar(energy, maxEnergy);
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    const nextXp = p.level * 100;
    const lines: string[] = [];

    lines.push(`  ${BOLD}Player Status${RESET}`);
    lines.push("");
    lines.push(`  Level: ${p.level}`);
    lines.push(`  XP:    ${xpBar(p.xp, nextXp)}`);
    lines.push(`  Energy:${GREEN}${"█".repeat(Math.min(10, Math.round((result.energy / MAX_ENERGY) * 10)))}${"░".repeat(10 - Math.min(10, Math.round((result.energy / MAX_ENERGY) * 10)))}${RESET} ${result.energy}/${MAX_ENERGY}`);
    lines.push("");
    lines.push(`  Catches:    ${p.totalCatches}`);
    lines.push(`  Merges:     ${p.totalMerges}`);
    lines.push(`  Collection: ${result.collectionCount} creatures`);
    lines.push(`  Streak:     ${p.currentStreak} days ${DIM}(best: ${p.longestStreak})${RESET}`);
    lines.push(`  Nearby:     ${result.nearbyCount} creatures`);
    lines.push(`  Ticks:      ${p.totalTicks.toLocaleString()}`);
    lines.push(divider());

    return lines.join("\n");
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
