import { Coord, Direction, EngineEvent } from "./types";

export function moveEvent(
  from: Coord,
  to: Coord,
  tileId: string
): EngineEvent {
  return { type: "move", from, to, tileId };
}

export function blockedEvent(from: Coord, dir: Direction): EngineEvent {
  return { type: "blocked", from, dir };
}

export function mergeEvent(
  at: Coord,
  fromIds: [string, string],
  newId: string,
  value: number
): EngineEvent {
  return { type: "merge", at, fromIds, newId, value };
}

export function strainEvent(
  at: Coord,
  tileId: string,
  newStrain: number
): EngineEvent {
  return { type: "strain", at, tileId, newStrain };
}

export function fractureEvent(
  at: Coord,
  tileId: string,
  spawns: { at: Coord; tileId: string; value: number }[]
): EngineEvent {
  return { type: "fracture", at, tileId, spawns };
}

export function spawnEvent(
  at: Coord,
  tileId: string,
  value: number
): EngineEvent {
  return { type: "spawn", at, tileId, value };
}

export function endEvent(): EngineEvent {
  return { type: "end" };
}
