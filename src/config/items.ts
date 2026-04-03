// src/config/items.ts

import { ItemDefinition } from "../types";

export const ITEMS: ItemDefinition[] = [
  {
    id: "bytetrap",
    name: "ByteTrap",
    description: "Basic capture device — gets the job done",
    type: "capture",
    catchMultiplier: 1.0,
  },
  {
    id: "netsnare",
    name: "NetSnare",
    description: "An improved trap with tighter data bindings",
    type: "capture",
    catchMultiplier: 1.5,
  },
  {
    id: "corelock",
    name: "CoreLock",
    description: "Military-grade containment — rarely fails",
    type: "capture",
    catchMultiplier: 2.0,
  },
  {
    id: "shard",
    name: "Shard",
    description: "A crystallized data fragment, needed for basic evolution",
    type: "catalyst",
  },
  {
    id: "prism",
    name: "Prism",
    description: "A prismatic memory core, needed for advanced evolution",
    type: "catalyst",
  },
];

export function getItemMap(): Map<string, ItemDefinition> {
  const map = new Map<string, ItemDefinition>();
  for (const item of ITEMS) {
    map.set(item.id, item);
  }
  return map;
}
