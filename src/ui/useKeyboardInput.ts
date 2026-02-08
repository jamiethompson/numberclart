import { onBeforeUnmount, onMounted } from "vue";
import type { Direction } from "../../engine";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export function useKeyboardInput(
  onDirection: (dir: Direction) => void,
  isEnabled: () => boolean
) {
  const handleKeydown = (event: KeyboardEvent) => {
    const dir = KEY_MAP[event.key];
    if (!dir) {
      return;
    }

    event.preventDefault();

    if (!isEnabled()) {
      return;
    }

    onDirection(dir);
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
}
