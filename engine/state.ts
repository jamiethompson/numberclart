import { BOARD_SIZE, Board, GameState, Tile } from "./types";

export const DEFAULT_SEED = 1;

export function createEmptyBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    const row: (Tile | null)[] = [];
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      row.push(null);
    }
    board.push(row);
  }
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((tile) => (tile ? { ...tile } : null))
  );
}

export function cloneState(state: GameState): GameState {
  return {
    board: cloneBoard(state.board),
    turnCount: state.turnCount,
    gameOver: state.gameOver,
    rngState: state.rngState,
    nextTileId: state.nextTileId,
  };
}

export function createInitialState(seed?: number): GameState {
  return {
    board: createEmptyBoard(),
    turnCount: 0,
    gameOver: false,
    rngState: seed ?? DEFAULT_SEED,
    nextTileId: 1,
  };
}
