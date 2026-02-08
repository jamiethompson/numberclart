import { onBeforeUnmount, onMounted, type Ref } from "vue";
import type { Direction } from "../../engine";

const SWIPE_THRESHOLD = 24;

type SwipeState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  lockedDirection: Direction | null;
};

export function useSwipeInput(
  target: Ref<HTMLElement | null>,
  onDirection: (dir: Direction) => void,
  isEnabled: () => boolean
) {
  const state: SwipeState = {
    pointerId: null,
    startX: 0,
    startY: 0,
    lockedDirection: null,
  };

  const reset = () => {
    state.pointerId = null;
    state.lockedDirection = null;
  };

  const resolveDirection = (dx: number, dy: number): Direction => {
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "down" : "up";
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) {
      return;
    }
    if (!isEnabled()) {
      return;
    }
    if (state.pointerId !== null) {
      return;
    }

    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.lockedDirection = null;

    if (target.value && target.value.setPointerCapture) {
      target.value.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (state.pointerId !== event.pointerId) {
      return;
    }
    if (state.lockedDirection) {
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      return;
    }

    state.lockedDirection = resolveDirection(dx, dy);
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (state.pointerId !== event.pointerId) {
      return;
    }

    const direction = state.lockedDirection;
    if (direction && isEnabled()) {
      onDirection(direction);
    }

    if (target.value && target.value.releasePointerCapture) {
      target.value.releasePointerCapture(event.pointerId);
    }

    reset();
  };

  onMounted(() => {
    const element = target.value;
    if (!element) {
      return;
    }

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerEnd);
    element.addEventListener("pointercancel", handlePointerEnd);
  });

  onBeforeUnmount(() => {
    const element = target.value;
    if (!element) {
      return;
    }

    element.removeEventListener("pointerdown", handlePointerDown);
    element.removeEventListener("pointermove", handlePointerMove);
    element.removeEventListener("pointerup", handlePointerEnd);
    element.removeEventListener("pointercancel", handlePointerEnd);
  });
}
