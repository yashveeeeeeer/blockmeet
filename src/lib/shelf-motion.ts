export const SHELF_MOTION_MS = 800;

export function bookPointerTilt(x: number, y: number, width: number, height: number) {
  const horizontal = Math.max(-1, Math.min(1, (x / Math.max(1, width)) * 2 - 1));
  const vertical = Math.max(-1, Math.min(1, (y / Math.max(1, height)) * 2 - 1));
  return { yaw: horizontal * 0.14, pitch: vertical * 0.09, roll: -horizontal * 0.02 };
}

// A shared, time-based ease: stationary at either end, with no overshoot.
export function shelfProgress(elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed / SHELF_MOTION_MS));
  return t * t * (3 - 2 * t);
}

export function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export type ShelfRect = { left: number; top: number; width: number; height: number };

export function focusedBookRect(width: number, height: number): ShelfRect {
  const bookWidth = Math.min(760, width - 72);
  const bookHeight = Math.max(160, height - 250);
  return {
    left: (width - bookWidth) / 2,
    top: (height - bookHeight) / 2 - 30,
    width: bookWidth,
    height: bookHeight,
  };
}

export function awayBookRect(home: ShelfRect, index: number, selected: number, viewportHeight: number): ShelfRect {
  // Bound offscreen travel so jumping to a distant tick does not spend most
  // of the transition traversing an invisible, many-screen distance.
  const distance = Math.min(3, Math.abs(index - selected));
  return { ...home, top: index < selected
    ? -Math.max(600, home.height) - distance * 160
    : viewportHeight + 600 + distance * 160 };
}
