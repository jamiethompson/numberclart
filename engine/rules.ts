import {
  BOARD_SIZE,
  Board,
  Coord,
  Direction,
  EngineEvent,
  GameResult,
  GameState,
  MAX_STRAIN,
  MAX_VALUE,
  Move,
  Tile,
} from "./types";
import { cloneState } from "./state";
import {
  blockedEvent,
  endEvent,
  fractureEvent,
  mergeEvent,
  moveEvent,
  spawnEvent,
  strainEvent,
} from "./events";
import { randomInt, weightedIndex } from "./random";

const DIR_DELTAS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

const NEIGHBOR_PRIORITY: Direction[] = ["up", "left", "right", "down"];

type PendingFracture = { coord: Coord; value: number; tileId: string };

function inBounds(coord: Coord): boolean {
  return (
    coord.row >= 0 &&
    coord.row < BOARD_SIZE &&
    coord.col >= 0 &&
    coord.col < BOARD_SIZE
  );
}

function coordEquals(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

function moveCoord(coord: Coord, dir: Direction): Coord {
  const delta = DIR_DELTAS[dir];
  return { row: coord.row + delta.dr, col: coord.col + delta.dc };
}

function listEmptyCoords(board: Board): Coord[] {
  const empties: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (!board[r][c]) {
        empties.push({ row: r, col: c });
      }
    }
  }
  return empties;
}

function allocateId(nextTileId: number): { id: string; nextTileId: number } {
  const id = `t${nextTileId}`;
  return { id, nextTileId: nextTileId + 1 };
}

function findMergeNeighbor(
  board: Board,
  coord: Coord,
  value: number,
  mergedIds: Set<string>
): Coord | null {
  for (const dir of NEIGHBOR_PRIORITY) {
    const neighbor = moveCoord(coord, dir);
    if (!inBounds(neighbor)) {
      continue;
    }
    const tile = board[neighbor.row][neighbor.col];
    if (!tile) {
      continue;
    }
    if (tile.value !== value) {
      continue;
    }
    if (mergedIds.has(tile.id)) {
      continue;
    }
    return neighbor;
  }
  return null;
}

function resolveMerges(
  board: Board,
  movedTo: Coord,
  nextTileId: number
): {
  events: EngineEvent[];
  pendingFractures: PendingFracture[];
  nextTileId: number;
} {
  const events: EngineEvent[] = [];
  const pendingFractures: PendingFracture[] = [];
  const mergedIds = new Set<string>();

  for (let value = MAX_VALUE; value >= 1; value -= 1) {
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        const tile = board[r][c];
        if (!tile || tile.value !== value || mergedIds.has(tile.id)) {
          continue;
        }
        const coord = { row: r, col: c };
        const neighborCoord = findMergeNeighbor(
          board,
          coord,
          value,
          mergedIds
        );
        if (!neighborCoord) {
          continue;
        }
        const neighborTile = board[neighborCoord.row][neighborCoord.col];
        if (!neighborTile) {
          continue;
        }

        board[coord.row][coord.col] = null;
        board[neighborCoord.row][neighborCoord.col] = null;
        mergedIds.add(tile.id);
        mergedIds.add(neighborTile.id);

        const newValue = value + 1;
        const idResult = allocateId(nextTileId);
        const newId = idResult.id;
        nextTileId = idResult.nextTileId;

        const place =
          coordEquals(coord, movedTo) || coordEquals(neighborCoord, movedTo)
            ? movedTo
            : coord;

        events.push(mergeEvent(place, [tile.id, neighborTile.id], newId, newValue));

        if (newValue > MAX_VALUE) {
          pendingFractures.push({ coord: place, value: newValue, tileId: newId });
        } else {
          board[place.row][place.col] = {
            id: newId,
            value: newValue,
            strain: 0,
          };
          mergedIds.add(newId);
        }
      }
    }
  }

  return { events, pendingFractures, nextTileId };
}

function applyStrain(board: Board): EngineEvent[] {
  const increments = new Map<string, { coord: Coord; inc: number }>();

  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const tile = board[r][c];
      if (!tile) {
        continue;
      }

      const right = { row: r, col: c + 1 };
      if (right.col < BOARD_SIZE) {
        const neighbor = board[right.row][right.col];
        if (neighbor) {
          const diff = Math.abs(tile.value - neighbor.value);
          if (diff >= 3) {
            const higher = tile.value > neighbor.value ? tile : neighbor;
            const higherCoord = tile.value > neighbor.value ? { row: r, col: c } : right;
            const entry = increments.get(higher.id) ?? {
              coord: higherCoord,
              inc: 0,
            };
            entry.inc += 1;
            increments.set(higher.id, entry);
          }
        }
      }

      const down = { row: r + 1, col: c };
      if (down.row < BOARD_SIZE) {
        const neighbor = board[down.row][down.col];
        if (neighbor) {
          const diff = Math.abs(tile.value - neighbor.value);
          if (diff >= 3) {
            const higher = tile.value > neighbor.value ? tile : neighbor;
            const higherCoord = tile.value > neighbor.value ? { row: r, col: c } : down;
            const entry = increments.get(higher.id) ?? {
              coord: higherCoord,
              inc: 0,
            };
            entry.inc += 1;
            increments.set(higher.id, entry);
          }
        }
      }
    }
  }

  const events: EngineEvent[] = [];
  const ordered = Array.from(increments.values()).sort((a, b) => {
    if (a.coord.row !== b.coord.row) {
      return a.coord.row - b.coord.row;
    }
    return a.coord.col - b.coord.col;
  });

  for (const entry of ordered) {
    const tile = board[entry.coord.row][entry.coord.col];
    if (!tile) {
      continue;
    }
    const before = tile.strain;
    const after = Math.min(MAX_STRAIN, before + entry.inc);
    if (after > before) {
      tile.strain = after;
      events.push(strainEvent(entry.coord, tile.id, after));
    }
  }

  return events;
}

function resolveFractures(
  board: Board,
  pendingFractures: PendingFracture[],
  nextTileId: number
): { events: EngineEvent[]; nextTileId: number } {
  const overflowQueue = [...pendingFractures].sort((a, b) => {
    if (a.coord.row !== b.coord.row) {
      return a.coord.row - b.coord.row;
    }
    return a.coord.col - b.coord.col;
  });

  const strainQueue: PendingFracture[] = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const tile = board[r][c];
      if (tile && tile.strain >= MAX_STRAIN) {
        strainQueue.push({ coord: { row: r, col: c }, value: tile.value, tileId: tile.id });
      }
    }
  }
  strainQueue.sort((a, b) => {
    if (a.coord.row !== b.coord.row) {
      return a.coord.row - b.coord.row;
    }
    return a.coord.col - b.coord.col;
  });

  const events: EngineEvent[] = [];

  const processFracture = (fracture: PendingFracture) => {
    const { coord, value, tileId } = fracture;
    const tile = board[coord.row][coord.col];
    if (tile && tile.id === tileId) {
      board[coord.row][coord.col] = null;
    }

    const empties: Coord[] = [];
    for (const dir of NEIGHBOR_PRIORITY) {
      const neighbor = moveCoord(coord, dir);
      if (!inBounds(neighbor)) {
        continue;
      }
      if (!board[neighbor.row][neighbor.col]) {
        empties.push(neighbor);
      }
    }

    let spawnCoords: Coord[] = [];
    if (empties.length >= 2) {
      spawnCoords = empties.slice(0, 2);
    } else if (empties.length === 1) {
      spawnCoords = empties;
    } else {
      spawnCoords = [coord];
    }

    const spawns: { at: Coord; tileId: string; value: number }[] = [];
    for (const spawnCoord of spawnCoords) {
      const idResult = allocateId(nextTileId);
      const newId = idResult.id;
      nextTileId = idResult.nextTileId;
      const newValue = value - 1;
      const newTile: Tile = { id: newId, value: newValue, strain: 0 };
      board[spawnCoord.row][spawnCoord.col] = newTile;
      spawns.push({ at: spawnCoord, tileId: newId, value: newValue });
    }

    events.push(fractureEvent(coord, tileId, spawns));
  };

  for (const fracture of overflowQueue) {
    processFracture(fracture);
  }
  for (const fracture of strainQueue) {
    processFracture(fracture);
  }

  return { events, nextTileId };
}

function applyStrainDecay(board: Board): void {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const tile = board[r][c];
      if (!tile) {
        continue;
      }
      tile.strain = Math.max(0, tile.strain - 1);
    }
  }
}

// Internal: exported for tests.
export function spawnPhase(
  board: Board,
  rngState: number,
  nextTileId: number
): { event: EngineEvent | null; rngState: number; nextTileId: number } {
  const emptyCoords = listEmptyCoords(board);
  if (emptyCoords.length === 0) {
    return { event: null, rngState, nextTileId };
  }

  const weights = [0.5, 0.35, 0.15];
  const choice = weightedIndex(rngState, weights);
  rngState = choice.state;
  const value = choice.index === 0 ? 1 : choice.index === 1 ? 2 : 3;

  const indexResult = randomInt(rngState, emptyCoords.length);
  rngState = indexResult.state;
  const spawnCoord = emptyCoords[indexResult.value];

  const idResult = allocateId(nextTileId);
  const newId = idResult.id;
  nextTileId = idResult.nextTileId;

  board[spawnCoord.row][spawnCoord.col] = {
    id: newId,
    value,
    strain: 0,
  };

  return {
    event: spawnEvent(spawnCoord, newId, value),
    rngState,
    nextTileId,
  };
}

function hasLegalMoves(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (!board[r][c]) {
        continue;
      }
      for (const dir of NEIGHBOR_PRIORITY) {
        const neighbor = moveCoord({ row: r, col: c }, dir);
        if (!inBounds(neighbor)) {
          continue;
        }
        if (!board[neighbor.row][neighbor.col]) {
          return true;
        }
      }
    }
  }
  return false;
}

function hasPossibleMerges(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const tile = board[r][c];
      if (!tile) {
        continue;
      }
      const right = { row: r, col: c + 1 };
      if (right.col < BOARD_SIZE) {
        const neighbor = board[right.row][right.col];
        if (neighbor && neighbor.value === tile.value) {
          return true;
        }
      }
      const down = { row: r + 1, col: c };
      if (down.row < BOARD_SIZE) {
        const neighbor = board[down.row][down.col];
        if (neighbor && neighbor.value === tile.value) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getLegalMoves(state: GameState): Move[] {
  if (state.gameOver) {
    return [];
  }

  const moves: Move[] = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const tile = state.board[r][c];
      if (!tile) {
        continue;
      }
      for (const dir of NEIGHBOR_PRIORITY) {
        const target = moveCoord({ row: r, col: c }, dir);
        if (!inBounds(target)) {
          continue;
        }
        if (!state.board[target.row][target.col]) {
          moves.push({ from: { row: r, col: c }, dir });
        }
      }
    }
  }

  return moves;
}

export function applyMove(state: GameState, move: Move): GameResult {
  if (state.gameOver) {
    return { state, events: [] };
  }

  const from = move.from;
  const dir = move.dir;

  if (!inBounds(from)) {
    return { state, events: [blockedEvent(from, dir)] };
  }

  const tile = state.board[from.row][from.col];
  if (!tile) {
    return { state, events: [blockedEvent(from, dir)] };
  }

  const target = moveCoord(from, dir);
  if (!inBounds(target)) {
    return { state, events: [blockedEvent(from, dir)] };
  }

  if (state.board[target.row][target.col]) {
    return { state, events: [blockedEvent(from, dir)] };
  }

  const nextState = cloneState(state);
  const events: EngineEvent[] = [];

  const movingTile = nextState.board[from.row][from.col];
  if (!movingTile) {
    return { state, events: [blockedEvent(from, dir)] };
  }

  nextState.board[from.row][from.col] = null;
  nextState.board[target.row][target.col] = movingTile;
  events.push(moveEvent(from, target, movingTile.id));

  const mergeResult = resolveMerges(nextState.board, target, nextState.nextTileId);
  events.push(...mergeResult.events);
  nextState.nextTileId = mergeResult.nextTileId;

  const strainEvents = applyStrain(nextState.board);
  events.push(...strainEvents);

  const fractureResult = resolveFractures(
    nextState.board,
    mergeResult.pendingFractures,
    nextState.nextTileId
  );
  events.push(...fractureResult.events);
  nextState.nextTileId = fractureResult.nextTileId;

  applyStrainDecay(nextState.board);

  const spawnResult = spawnPhase(
    nextState.board,
    nextState.rngState,
    nextState.nextTileId
  );
  nextState.rngState = spawnResult.rngState;
  nextState.nextTileId = spawnResult.nextTileId;
  if (spawnResult.event) {
    events.push(spawnResult.event);
  }

  const gameOver = !hasLegalMoves(nextState.board) && !hasPossibleMerges(nextState.board);
  nextState.gameOver = gameOver;
  if (gameOver) {
    events.push(endEvent());
  }

  nextState.turnCount += 1;

  return { state: nextState, events };
}
