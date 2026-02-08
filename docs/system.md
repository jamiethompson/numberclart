# Numberclart System Documentation

This document is the holistic, evolving description of Numberclart’s architecture and operation. It is intended for human developers and should be updated as the project advances through phases.

## Source of Truth
The authoritative specs are the original Numberclart design/mechanics document, the reference turn walkthrough, the tech stack and architecture decisions, and the current development phase document. This documentation summarizes and explains those decisions; it does not override them.

## Architecture Overview
Numberclart is a small, opinionated system with strict boundaries:

- **Engine (authoritative logic):** Pure, deterministic rules. Owns the board, tiles, turn lifecycle, and semantic events. No UI, DOM, or platform concerns.
- **UI (thin renderer):** Renders engine state and forwards input as moves. Must not reimplement or shortcut rules.
- **Platform adapters (future phases):** Sound, haptics, and persistence are handled outside the engine and only react to semantic events.

Design priorities are clarity over cleverness, determinism over flexibility, and restraint over extensibility.

## Engine Operation
### Board and Tiles
- Board: fixed 5×5 grid, orthogonal adjacency only.
- Tile: `value` (1–5), `strain` (0–3), stable `id`.

### Initial Seeding
- On game creation, the engine spawns **two tiles** using the same weighted spawn rules as the normal spawn phase.
- Seeding is deterministic and advances RNG state; it does not advance the turn counter.
- Rationale: a non‑inert starting board is required for reliable mobile interaction while keeping the engine authoritative.

### Turn Lifecycle (Authoritative Order)
1. Player Action
2. Merge Resolution
3. Strain Accumulation
4. Fracture Resolution
5. Strain Decay
6. Spawn Phase
7. Game Over Check

No phases are skipped or reordered.

### Merge Rules
- Adjacent equal values merge into `value + 1`.
- A tile merges at most once per turn.
- Merges resolve largest values first with deterministic scan order.
- If a merge would exceed value 5, it fractures immediately.

### Strain and Fracture
- For any adjacent pair with value difference ≥ 3, the higher tile gains +1 strain (capped at 3).
- Fracture triggers at strain 3 or overflow.
- Fracture spawns up to two tiles of `value - 1` in adjacent empty cells, or one tile in the original cell if blocked.
- Fractures resolve deterministically and may cascade.

### Strain Decay and Spawn
- After fractures, all tiles reduce strain by 1 (min 0).
- One new tile spawns in a random empty cell (weighted values 1/2/3).

### Game Over
The game ends when **no legal moves** and **no merges** are possible.

### Determinism
Given the same initial state, move sequence, and RNG seed, the engine must produce identical states and events.

## UI Operation (Phase 2–3)
Phases 2–3 provide a minimal web UI with no polish systems. Responsibilities are limited to rendering and input wiring.

- **Rendering:** Show the 5×5 grid, draw tiles with numeric values, and distinguish empty cells.
- **Input:** Desktop arrow keys and mobile swipe gestures.
- **Move mapping:** Each arrow key press selects the first legal move in top‑to‑bottom, left‑to‑right scan order for that direction.
- **Swipe mapping:** Pointer‑event swipes resolve to a single direction based on dominant axis and a minimum movement threshold.
- **State updates:** UI replaces its state with the engine’s returned state for each successful move.
- **Game over:** Input disabled; board remains visible.

## Decisions and Rationale
- **Pure engine:** Protects determinism and testability; avoids UI/platform entanglement.
- **Vue 3 + Vite + plain CSS:** Lightweight, predictable, minimal configuration, consistent with architecture spec.
- **No UI rule logic:** Prevents drift between engine and UI; keeps all mechanics authoritative in the engine.
- **Minimal Phase 2 styling:** Ensures focus on correctness, not feel or polish.
- **Initial seeding in engine:** Keeps the UI passive while ensuring the game is playable at start.

## Watch‑Outs
- Do not add animations, sound, haptics, or visual polish in Phase 3.
- Do not mutate engine state directly in the UI.
- Do not infer or predict rule outcomes in the UI.
- Blocked moves must not advance the turn.
- Keep event ordering and turn lifecycle strictly aligned with the reference walkthrough.
- Prevent browser scroll and zoom on the play surface.

## Current Phase
Phase 3: Mobile‑First Interaction. The system is intentionally plain. If it feels polished, something is out of scope.
