const UINT32_MAX_PLUS_ONE = 0x100000000;

export type RngResult = { state: number; value: number };

export function nextRng(state: number): RngResult {
  const next = (state * 1664525 + 1013904223) >>> 0;
  return { state: next, value: next / UINT32_MAX_PLUS_ONE };
}

export function randomInt(state: number, maxExclusive: number): {
  state: number;
  value: number;
} {
  const next = nextRng(state);
  const value = Math.floor(next.value * maxExclusive);
  return { state: next.state, value };
}

export function weightedIndex(
  state: number,
  weights: number[]
): { state: number; index: number } {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const next = nextRng(state);
  let threshold = next.value * total;
  for (let i = 0; i < weights.length; i += 1) {
    threshold -= weights[i];
    if (threshold < 0) {
      return { state: next.state, index: i };
    }
  }
  return { state: next.state, index: weights.length - 1 };
}
