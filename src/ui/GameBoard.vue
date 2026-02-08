<script setup lang="ts">
import Tile from "./Tile.vue";
import type { Board } from "../../engine";

defineProps<{ board: Board }>();
</script>

<template>
  <div class="board" role="grid" aria-label="Numberclart board">
    <template v-for="(row, rowIndex) in board" :key="rowIndex">
      <div
        v-for="(cell, colIndex) in row"
        :key="`${rowIndex}-${colIndex}`"
        class="cell"
        :class="cell ? 'occupied' : 'empty'"
        role="gridcell"
      >
        <Tile v-if="cell" :value="cell.value" />
      </div>
    </template>
  </div>
</template>
