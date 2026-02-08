import { createInitialState } from "./state";
import { applyMove, getLegalMoves } from "./rules";
import { GameState } from "./types";

export function createGame(seed?: number): GameState {
  return createInitialState(seed);
}

export { applyMove, getLegalMoves };
export * from "./types";
