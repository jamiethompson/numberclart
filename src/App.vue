<script setup lang="ts">
import { ref } from "vue";
import GameBoard from "./ui/GameBoard.vue";
import { applyMove, createGame, getLegalMoves, type Direction, type GameState } from "../engine";
import { useKeyboardInput } from "./ui/useKeyboardInput";
import { useSwipeInput } from "./ui/useSwipeInput";

const state = ref<GameState>(createGame());
const surfaceRef = ref<HTMLElement | null>(null);

const handleDirection = (dir: Direction) => {
  if (state.value.gameOver) {
    return;
  }

  const legalMoves = getLegalMoves(state.value);
  const move = legalMoves.find((candidate) => candidate.dir === dir);
  if (!move) {
    return;
  }

  const result = applyMove(state.value, move);
  state.value = result.state;

  if (result.events.length > 0) {
    console.log(result.events);
  }
};

useKeyboardInput(handleDirection, () => !state.value.gameOver);
useSwipeInput(surfaceRef, handleDirection, () => !state.value.gameOver);
</script>

<template>
  <div ref="surfaceRef" class="game">
    <GameBoard :board="state.board" />
    <div v-if="state.gameOver" class="status">Game Over</div>
  </div>
</template>
