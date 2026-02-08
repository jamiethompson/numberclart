import { describe, expect, it } from "vitest";
import { applyMove, createGame } from "../index";
import { spawnPhase } from "../rules";
import { BOARD_SIZE, EngineEvent, GameState } from "../types";
import { makeState } from "./fixtures";

function serializeState(state: GameState): string {
  return JSON.stringify({
    turnCount: state.turnCount,
    gameOver: state.gameOver,
    rngState: state.rngState,
    nextTileId: state.nextTileId,
    board: state.board.map((row) =>
      row.map((tile) => (tile ? { id: tile.id, value: tile.value, strain: tile.strain } : null))
    ),
  });
}

describe("Numberclart engine", () => {
  it("createGame returns an empty 5x5 board", () => {
    const state = createGame(1);
    expect(state.board.length).toBe(BOARD_SIZE);
    expect(state.board[0].length).toBe(BOARD_SIZE);
    const tiles = state.board.flat().filter(Boolean);
    expect(tiles.length).toBe(0);
  });

  it("valid move advances the turn and emits move", () => {
    const state = makeState([
      { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 0, col: 0 }, dir: "right" });

    expect(result.events[0].type).toBe("move");
    expect(result.state.turnCount).toBe(1);
    expect(result.state.board[0][0]).toBeNull();
    expect(result.state.board[0][1]?.id).toBe("t1");
  });

  it("invalid move is blocked and does not advance the turn", () => {
    const state = makeState([
      { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 0, col: 0 }, dir: "left" });

    expect(result.events[0].type).toBe("blocked");
    expect(result.state.turnCount).toBe(state.turnCount);
    expect(result.state.board[0][0]?.id).toBe("t1");
  });

  it("merge ordering resolves higher values first", () => {
    const state = makeState([
      { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } },
      { coord: { row: 0, col: 1 }, tile: { id: "t2", value: 2, strain: 0 } },
      { coord: { row: 1, col: 0 }, tile: { id: "t3", value: 4, strain: 0 } },
      { coord: { row: 1, col: 1 }, tile: { id: "t4", value: 4, strain: 0 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t5", value: 1, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    const merges = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "merge" }> => event.type === "merge"
    );

    expect(merges).toHaveLength(2);
    expect(merges[0].value).toBe(5);
    expect(merges[1].value).toBe(3);
  });

  it("merge overflow triggers fracture and spawns value-1 tiles", () => {
    const state = makeState([
      { coord: { row: 2, col: 2 }, tile: { id: "t1", value: 5, strain: 0 } },
      { coord: { row: 2, col: 3 }, tile: { id: "t2", value: 5, strain: 0 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t3", value: 1, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    const merges = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "merge" }> => event.type === "merge"
    );
    const fractures = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "fracture" }> => event.type === "fracture"
    );

    expect(merges[0].value).toBe(6);
    expect(fractures).toHaveLength(1);
    expect(fractures[0].at).toEqual({ row: 2, col: 2 });
    expect(fractures[0].spawns).toHaveLength(2);
    expect(fractures[0].spawns[0].at).toEqual({ row: 1, col: 2 });
    expect(fractures[0].spawns[1].at).toEqual({ row: 2, col: 1 });
    expect(fractures[0].spawns[0].value).toBe(5);
    expect(fractures[0].spawns[1].value).toBe(5);
  });

  it("strain accumulation emits strain event", () => {
    const state = makeState([
      { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 5, strain: 0 } },
      { coord: { row: 0, col: 1 }, tile: { id: "t2", value: 1, strain: 0 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t3", value: 2, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    const strainEvents = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "strain" }> => event.type === "strain"
    );

    expect(strainEvents).toHaveLength(1);
    expect(strainEvents[0].at).toEqual({ row: 0, col: 0 });
    expect(strainEvents[0].newStrain).toBe(1);
    expect(result.state.board[0][0]?.strain).toBe(0);
  });

  it("fracture spawns two tiles when two adjacent empties exist", () => {
    const state = makeState([
      { coord: { row: 2, col: 2 }, tile: { id: "t1", value: 4, strain: 3 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t2", value: 1, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    const fractures = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "fracture" }> => event.type === "fracture"
    );

    expect(fractures).toHaveLength(1);
    expect(fractures[0].spawns[0].at).toEqual({ row: 1, col: 2 });
    expect(fractures[0].spawns[1].at).toEqual({ row: 2, col: 1 });
  });

  it("fracture spawns one tile when only one adjacent empty exists", () => {
    const state = makeState([
      { coord: { row: 2, col: 2 }, tile: { id: "t1", value: 4, strain: 3 } },
      { coord: { row: 1, col: 2 }, tile: { id: "t2", value: 1, strain: 0 } },
      { coord: { row: 2, col: 1 }, tile: { id: "t3", value: 2, strain: 0 } },
      { coord: { row: 2, col: 3 }, tile: { id: "t4", value: 3, strain: 0 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t5", value: 1, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    const fractures = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "fracture" }> => event.type === "fracture"
    );

    expect(fractures).toHaveLength(1);
    expect(fractures[0].spawns).toHaveLength(1);
    expect(fractures[0].spawns[0].at).toEqual({ row: 3, col: 2 });
  });

  it("fracture spawns in original cell when no adjacent empties exist", () => {
    const state = makeState([
      { coord: { row: 2, col: 2 }, tile: { id: "t1", value: 4, strain: 3 } },
      { coord: { row: 1, col: 2 }, tile: { id: "t2", value: 1, strain: 0 } },
      { coord: { row: 2, col: 1 }, tile: { id: "t3", value: 2, strain: 0 } },
      { coord: { row: 2, col: 3 }, tile: { id: "t4", value: 3, strain: 0 } },
      { coord: { row: 3, col: 2 }, tile: { id: "t5", value: 2, strain: 0 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t6", value: 1, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    const fractures = result.events.filter(
      (event): event is Extract<EngineEvent, { type: "fracture" }> => event.type === "fracture"
    );

    expect(fractures).toHaveLength(1);
    expect(fractures[0].spawns).toHaveLength(1);
    expect(fractures[0].spawns[0].at).toEqual({ row: 2, col: 2 });
  });

  it("strain decay reduces strain by one", () => {
    const state = makeState([
      { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 2 } },
      { coord: { row: 4, col: 4 }, tile: { id: "t2", value: 1, strain: 0 } },
    ]);

    const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
    expect(result.state.board[0][0]?.strain).toBe(1);
  });

  it("spawn phase skips when board is full", () => {
    const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
      Array.from({ length: BOARD_SIZE }, (_, col) => ({
        id: `t${row * BOARD_SIZE + col + 1}`,
        value: 1,
        strain: 0,
      }))
    );

    const result = spawnPhase(board, 1, BOARD_SIZE * BOARD_SIZE + 1);
    expect(result.event).toBeNull();
    expect(result.rngState).toBe(1);
  });

  it("determinism: same seed and move yields identical state and events", () => {
    const baseState = makeState(
      [{ coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } }],
      { rngState: 2, nextTileId: 2 }
    );

    const resultA = applyMove(baseState, { from: { row: 0, col: 0 }, dir: "right" });
    const resultB = applyMove(baseState, { from: { row: 0, col: 0 }, dir: "right" });

    expect(serializeState(resultA.state)).toBe(serializeState(resultB.state));
    expect(JSON.stringify(resultA.events)).toBe(JSON.stringify(resultB.events));
  });

  it("reference turn walkthrough reproduces expected board", () => {
    const state = makeState(
      [
        { coord: { row: 0, col: 1 }, tile: { id: "A", value: 2, strain: 0 } },
        { coord: { row: 1, col: 1 }, tile: { id: "B", value: 5, strain: 1 } },
        { coord: { row: 1, col: 2 }, tile: { id: "C", value: 2, strain: 0 } },
      ],
      { rngState: 2, nextTileId: 1 }
    );

    const result = applyMove(state, { from: { row: 0, col: 1 }, dir: "right" });

    expect(result.state.board[0][2]?.value).toBe(3);
    expect(result.state.board[1][1]?.value).toBe(5);
    expect(result.state.board[1][1]?.strain).toBe(0);
    expect(result.state.board[2][2]?.value).toBe(1);

    const eventTypes = result.events.map((event) => event.type);
    expect(eventTypes).toEqual(["move", "merge", "spawn"]);
  });
});
