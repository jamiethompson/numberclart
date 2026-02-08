import { createEmptyBoard } from "../state";
import { Board, Coord, GameState, Tile } from "../types";

export type PlacedTile = { coord: Coord; tile: Tile };

export function makeState(
  placements: PlacedTile[],
  options?: {
    rngState?: number;
    turnCount?: number;
    gameOver?: boolean;
    nextTileId?: number;
  }
): GameState {
  const board = createEmptyBoard();
  for (const placement of placements) {
    board[placement.coord.row][placement.coord.col] = { ...placement.tile };
  }

  return {
    board,
    rngState: options?.rngState ?? 1,
    turnCount: options?.turnCount ?? 0,
    gameOver: options?.gameOver ?? false,
    nextTileId: options?.nextTileId ?? inferNextTileId(placements),
  };
}

function inferNextTileId(placements: PlacedTile[]): number {
  let max = 0;
  for (const placement of placements) {
    const match = /^t(\d+)$/.exec(placement.tile.id);
    if (match) {
      const value = Number(match[1]);
      if (value > max) {
        max = value;
      }
    }
  }
  return max + 1;
}

export function collectBoardValues(board: Board): number[][] {
  return board.map((row) => row.map((tile) => (tile ? tile.value : 0)));
}
