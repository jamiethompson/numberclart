export const BOARD_SIZE = 5 as const;
export const MAX_VALUE = 5 as const;
export const MAX_STRAIN = 3 as const;

export type Coord = { row: number; col: number };
export type Direction = "up" | "down" | "left" | "right";
export type Move = { from: Coord; dir: Direction };

export type Tile = {
  id: string;
  value: number;
  strain: number;
};

export type Board = (Tile | null)[][];

export type GameState = {
  board: Board;
  turnCount: number;
  gameOver: boolean;
  rngState: number;
  nextTileId: number;
};

export type EngineEvent =
  | { type: "move"; from: Coord; to: Coord; tileId: string }
  | { type: "blocked"; from: Coord; dir: Direction }
  | {
      type: "merge";
      at: Coord;
      fromIds: [string, string];
      newId: string;
      value: number;
    }
  | { type: "strain"; at: Coord; tileId: string; newStrain: number }
  | {
      type: "fracture";
      at: Coord;
      tileId: string;
      spawns: { at: Coord; tileId: string; value: number }[];
    }
  | { type: "spawn"; at: Coord; tileId: string; value: number }
  | { type: "end" };

export type GameResult = { state: GameState; events: EngineEvent[] };
