import assert from "node:assert/strict";
import { applyMove, createGame } from "../index";
import { spawnPhase } from "../rules";
import { BOARD_SIZE, EngineEvent, GameState } from "../types";
import { makeState } from "./fixtures";

type TestCase = { name: string; fn: () => void };
const tests: TestCase[] = [];

function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

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

test("createGame returns an empty 5x5 board", () => {
  const state = createGame(1);
  assert.equal(state.board.length, BOARD_SIZE);
  assert.equal(state.board[0].length, BOARD_SIZE);
  const tiles = state.board.flat().filter(Boolean);
  assert.equal(tiles.length, 0);
});

test("valid move advances the turn and emits move", () => {
  const state = makeState([
    { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } },
  ]);

  const result = applyMove(state, { from: { row: 0, col: 0 }, dir: "right" });

  assert.equal(result.events[0].type, "move");
  assert.equal(result.state.turnCount, 1);
  assert.equal(result.state.board[0][0], null);
  assert.equal(result.state.board[0][1]?.id, "t1");
});

test("invalid move is blocked and does not advance the turn", () => {
  const state = makeState([
    { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } },
  ]);

  const result = applyMove(state, { from: { row: 0, col: 0 }, dir: "left" });

  assert.equal(result.events[0].type, "blocked");
  assert.equal(result.state.turnCount, state.turnCount);
  assert.equal(result.state.board[0][0]?.id, "t1");
});

test("merge ordering resolves higher values first", () => {
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

  assert.equal(merges.length, 2);
  assert.equal(merges[0].value, 5);
  assert.equal(merges[1].value, 3);
});

test("merge overflow triggers fracture and spawns value-1 tiles", () => {
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

  assert.equal(merges[0].value, 6);
  assert.equal(fractures.length, 1);
  assert.deepEqual(fractures[0].at, { row: 2, col: 2 });
  assert.equal(fractures[0].spawns.length, 2);
  assert.deepEqual(fractures[0].spawns[0].at, { row: 1, col: 2 });
  assert.deepEqual(fractures[0].spawns[1].at, { row: 2, col: 1 });
  assert.equal(fractures[0].spawns[0].value, 5);
  assert.equal(fractures[0].spawns[1].value, 5);
});

test("strain accumulation emits strain event", () => {
  const state = makeState([
    { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 5, strain: 0 } },
    { coord: { row: 0, col: 1 }, tile: { id: "t2", value: 1, strain: 0 } },
    { coord: { row: 4, col: 4 }, tile: { id: "t3", value: 2, strain: 0 } },
  ]);

  const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
  const strainEvents = result.events.filter(
    (event): event is Extract<EngineEvent, { type: "strain" }> => event.type === "strain"
  );

  assert.equal(strainEvents.length, 1);
  assert.deepEqual(strainEvents[0].at, { row: 0, col: 0 });
  assert.equal(strainEvents[0].newStrain, 1);
  assert.equal(result.state.board[0][0]?.strain, 0);
});

test("fracture spawns two tiles when two adjacent empties exist", () => {
  const state = makeState([
    { coord: { row: 2, col: 2 }, tile: { id: "t1", value: 4, strain: 3 } },
    { coord: { row: 4, col: 4 }, tile: { id: "t2", value: 1, strain: 0 } },
  ]);

  const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
  const fractures = result.events.filter(
    (event): event is Extract<EngineEvent, { type: "fracture" }> => event.type === "fracture"
  );

  assert.equal(fractures.length, 1);
  assert.deepEqual(fractures[0].spawns[0].at, { row: 1, col: 2 });
  assert.deepEqual(fractures[0].spawns[1].at, { row: 2, col: 1 });
});

test("fracture spawns one tile when only one adjacent empty exists", () => {
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

  assert.equal(fractures.length, 1);
  assert.equal(fractures[0].spawns.length, 1);
  assert.deepEqual(fractures[0].spawns[0].at, { row: 3, col: 2 });
});

test("fracture spawns in original cell when no adjacent empties exist", () => {
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

  assert.equal(fractures.length, 1);
  assert.equal(fractures[0].spawns.length, 1);
  assert.deepEqual(fractures[0].spawns[0].at, { row: 2, col: 2 });
});

test("strain decay reduces strain by one", () => {
  const state = makeState([
    { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 2 } },
    { coord: { row: 4, col: 4 }, tile: { id: "t2", value: 1, strain: 0 } },
  ]);

  const result = applyMove(state, { from: { row: 4, col: 4 }, dir: "left" });
  assert.equal(result.state.board[0][0]?.strain, 1);
});

test("spawn phase skips when board is full", () => {
  const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      id: `t${row * BOARD_SIZE + col + 1}`,
      value: 1,
      strain: 0,
    }))
  );

  const result = spawnPhase(board, 1, BOARD_SIZE * BOARD_SIZE + 1);
  assert.equal(result.event, null);
  assert.equal(result.rngState, 1);
});

test("determinism: same seed and move yields identical state and events", () => {
  const baseState = makeState([
    { coord: { row: 0, col: 0 }, tile: { id: "t1", value: 2, strain: 0 } },
  ], { rngState: 2, nextTileId: 2 });

  const resultA = applyMove(baseState, { from: { row: 0, col: 0 }, dir: "right" });
  const resultB = applyMove(baseState, { from: { row: 0, col: 0 }, dir: "right" });

  assert.equal(serializeState(resultA.state), serializeState(resultB.state));
  assert.equal(JSON.stringify(resultA.events), JSON.stringify(resultB.events));
});

test("reference turn walkthrough reproduces expected board", () => {
  const state = makeState([
    { coord: { row: 0, col: 1 }, tile: { id: "A", value: 2, strain: 0 } },
    { coord: { row: 1, col: 1 }, tile: { id: "B", value: 5, strain: 1 } },
    { coord: { row: 1, col: 2 }, tile: { id: "C", value: 2, strain: 0 } },
  ], { rngState: 2, nextTileId: 1 });

  const result = applyMove(state, { from: { row: 0, col: 1 }, dir: "right" });

  assert.equal(result.state.board[0][2]?.value, 3);
  assert.equal(result.state.board[1][1]?.value, 5);
  assert.equal(result.state.board[1][1]?.strain, 0);
  assert.equal(result.state.board[2][2]?.value, 1);

  const eventTypes = result.events.map((event) => event.type);
  assert.deepEqual(eventTypes, ["move", "merge", "spawn"]);
});

function run() {
  let failures = 0;
  for (const t of tests) {
    try {
      t.fn();
      console.log(`ok - ${t.name}`);
    } catch (err) {
      failures += 1;
      console.error(`not ok - ${t.name}`);
      console.error(err);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

run();
