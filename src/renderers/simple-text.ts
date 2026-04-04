import {
  Renderer,
  ScanResult,
  CatchResult,
  MergeResult,
  StatusResult,
  Notification,
  CollectionCreature,
  RARITY_STARS,
  CreatureTrait,
} from "../types";
import { MAX_ENERGY } from "../engine/energy";
import { MESSAGES } from "../config/constants";
import { formatMessage } from "../config/loader";

const BOX_WIDTH = 36;
const INNER_WIDTH = BOX_WIDTH - 2;

function pad(content: string): string {
  const padding = Math.max(0, INNER_WIDTH - content.length);
  return `| ${content}${" ".repeat(padding)}|`;
}

function padDouble(content: string): string {
  const padding = Math.max(0, INNER_WIDTH - content.length);
  return `| ${content}${" ".repeat(padding)}|`;
}

function hline(char = "-"): string {
  return `+${char.repeat(BOX_WIDTH - 2)}+`;
}

function rarityStars(rarity: string): string {
  const count = RARITY_STARS[rarity as keyof typeof RARITY_STARS] ?? 1;
  return "★".repeat(count) + "·".repeat(8 - count);
}

function traitArtLine(traits: CreatureTrait[]): string {
  return traits.map((t) => t.mergeModifier.type === "volatile" ? "⚡" : t.mergeModifier.type === "catalyst" ? "◈" : "·").join("");
}

function mergeModifierSummary(traits: CreatureTrait[]): string {
  const total = traits.reduce((sum, t) => sum + t.mergeModifier.value, 0);
  const sign = total >= 0 ? "+" : "";
  const volatileCount = traits.filter((t) => t.mergeModifier.type === "volatile").length;
  const stableCount = traits.filter((t) => t.mergeModifier.type === "stable").length;
  const label = volatileCount > stableCount ? "volatile" : stableCount > volatileCount ? "stable" : "mixed";
  return `${sign}${total.toFixed(2)} (${label})`;
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return MESSAGES.scan.empty;
    }

    let out = hline() + "\n";
    out += pad(formatMessage(MESSAGES.scan.header, { count: result.nearby.length })) + "\n";
    out += pad(formatMessage(MESSAGES.scan.energy, { energy: result.energy, maxEnergy: MAX_ENERGY })) + "\n";
    if (result.batch) {
      out += pad(`Attempts left: ${result.batch.attemptsRemaining}`) + "\n";
    }
    out += hline() + "\n";

    for (const entry of result.nearby) {
      const c = entry.creature;
      const traits = c.traits;
      const rate = Math.round(entry.catchRate * 100);
      const mergeSummary = mergeModifierSummary(traits);

      out += pad(`[${entry.index + 1}] ${rarityStars(traits[0]?.rarity ?? "common")}`) + "\n";
      out += pad(`    ${traitArtLine(traits)}`) + "\n";
      out += pad(`    Rate: ${rate}%  Cost: ${entry.energyCost}E`) + "\n";
      out += pad(`    Merge: ${mergeSummary}`) + "\n";
      out += hline("-") + "\n";
    }

    out += pad(MESSAGES.scan.footer);
    return out;
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const traitLine = traitArtLine(c.traits);

    if (result.success) {
      let out = hline("=") + "\n";
      out += padDouble(MESSAGES.catch.successHeader) + "\n";
      out += hline("=") + "\n";
      out += padDouble(formatMessage(MESSAGES.catch.captured, { name: c.id })) + "\n";
      out += padDouble(formatMessage(MESSAGES.catch.xpGained, { xp: result.xpEarned })) + "\n";
      out += padDouble(formatMessage(MESSAGES.catch.energySpent, { energy: result.energySpent })) + "\n";
      out += padDouble(`Traits: ${traitLine}`) + "\n";
      out += hline("=");
      return out;
    }

    if (result.fled) {
      let out = hline("=") + "\n";
      out += padDouble(MESSAGES.catch.fledHeader) + "\n";
      out += hline("=") + "\n";
      out += padDouble(formatMessage(MESSAGES.catch.fledMessage, { name: c.id })) + "\n";
      out += padDouble(formatMessage(MESSAGES.catch.energySpent, { energy: result.energySpent })) + "\n";
      out += hline("=");
      return out;
    }

    let out = hline("=") + "\n";
    out += padDouble(MESSAGES.catch.escapedHeader) + "\n";
    out += hline("=") + "\n";
    out += padDouble(formatMessage(MESSAGES.catch.escapedMessage, { name: c.id })) + "\n";
    out += padDouble(formatMessage(MESSAGES.catch.energySpent, { energy: result.energySpent })) + "\n";
    out += padDouble(formatMessage(MESSAGES.catch.escapedHint, { attempts: result.attemptsRemaining })) + "\n";
    out += hline("=");
    return out;
  }

  renderMerge(result: MergeResult): string {
    if (!result.success) {
      let out = hline("=") + "\n";
      out += padDouble(MESSAGES.merge.failed) + "\n";
      out += padDouble(formatMessage(MESSAGES.merge.mergeRate, { rate: Math.round(result.mergeRate * 100) })) + "\n";
      out += hline("=");
      return out;
    }

    const child = result.child!;
    let out = hline("=") + "\n";
    out += padDouble(MESSAGES.merge.successHeader) + "\n";
    out += hline("=") + "\n";
    out += padDouble(formatMessage(MESSAGES.merge.childBorn, { gen: child.generation })) + "\n";
    out += padDouble(formatMessage(MESSAGES.merge.mergeRate, { rate: Math.round(result.mergeRate * 100) })) + "\n";
    out += padDouble(`Traits: ${traitArtLine(child.traits)}`) + "\n";
    if (result.synergyBonuses.length > 0) {
      out += padDouble(`Synergies: +${result.synergyBonuses.reduce((s, b) => s + b.bonus, 0).toFixed(2)}`) + "\n";
    }
    out += hline("=");
    return out;
  }

  renderCollection(collection: CollectionCreature[]): string {
    if (collection.length === 0) {
      return MESSAGES.collection.empty;
    }

    let out = hline() + "\n";
    out += pad(formatMessage(MESSAGES.collection.header, { count: collection.length })) + "\n";
    out += hline() + "\n";

    for (const creature of collection) {
      const gen = formatMessage(MESSAGES.collection.generation, { gen: creature.generation });
      out += pad(`ID: ${creature.id.slice(0, 12)}  ${gen}`) + "\n";
      out += pad(`Traits: ${traitArtLine(creature.traits)}`) + "\n";
      out += pad(`Merge: ${mergeModifierSummary(creature.traits)}`) + "\n";
      out += hline("-") + "\n";
    }

    return out.trimEnd();
  }

  renderEnergy(energy: number, maxEnergy: number): string {
    const filled = Math.round((energy / maxEnergy) * 10);
    const bar = "#".repeat(filled) + "-".repeat(10 - filled);
    return `Energy: [${bar}] ${energy}/${maxEnergy}`;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    const nextLevelXP = p.level * 100;
    const xpBar = Math.round((p.xp / nextLevelXP) * 10);
    const xpBarStr = "#".repeat(xpBar) + "-".repeat(10 - xpBar);

    let out = hline() + "\n";
    out += pad(MESSAGES.status.header) + "\n";
    out += hline() + "\n";
    out += pad(formatMessage(MESSAGES.status.level, { level: p.level })) + "\n";
    out += pad(formatMessage(MESSAGES.status.xp, { bar: xpBarStr, xp: p.xp, nextXp: nextLevelXP })) + "\n";
    out += pad(formatMessage(MESSAGES.status.energy, { energy: result.energy, maxEnergy: MAX_ENERGY })) + "\n";
    out += pad(formatMessage(MESSAGES.status.catches, { count: p.totalCatches })) + "\n";
    out += pad(formatMessage(MESSAGES.status.merges, { count: p.totalMerges })) + "\n";
    out += pad(formatMessage(MESSAGES.status.collection, { count: result.collectionCount })) + "\n";
    out += pad(formatMessage(MESSAGES.status.streak, { streak: p.currentStreak, best: p.longestStreak })) + "\n";
    out += pad(formatMessage(MESSAGES.status.nearby, { count: result.nearbyCount })) + "\n";
    out += pad(formatMessage(MESSAGES.status.ticks, { count: p.totalTicks })) + "\n";
    out += hline();
    return out;
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
