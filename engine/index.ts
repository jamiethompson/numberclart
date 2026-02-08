import { createInitialState } from "./state";
import { applyMove, getLegalMoves, spawnPhase } from "./rules";
import { GameState } from "./types";

export function createGame(seed?: number): GameState {
  const state = createInitialState(seed);

  let spawn = spawnPhase(state.board, state.rngState, state.nextTileId);
  state.rngState = spawn.rngState;
  state.nextTileId = spawn.nextTileId;

  spawn = spawnPhase(state.board, state.rngState, state.nextTileId);
  state.rngState = spawn.rngState;
  state.nextTileId = spawn.nextTileId;

  return state;
}

export { applyMove, getLegalMoves };
export * from "./types";
