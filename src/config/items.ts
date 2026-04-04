import { ItemDefinition } from "../types";
import { loadConfig } from "./loader";

const config = loadConfig();

export const ITEMS: ItemDefinition[] = config.items;

export function getItemMap(): Map<string, ItemDefinition> {
  const map = new Map<string, ItemDefinition>();
  for (const item of ITEMS) {
    map.set(item.id, item);
  }
  return map;
}
