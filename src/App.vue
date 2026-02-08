<script setup lang="ts">
import { ref } from "vue";
import GameBoard from "./ui/GameBoard.vue";
import { applyMove, createGame, getLegalMoves, type Direction, type GameState } from "../engine";
import { useKeyboardInput } from "./ui/useKeyboardInput";

const state = ref<GameState>(createGame());

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
</script>

<template>
  <div class="game">
    <GameBoard :board="state.board" />
    <div v-if="state.gameOver" class="status">Game Over</div>
  </div>
</template>
