export const SHELF_MOTION_MS = 800;

// A shared, time-based ease: stationary at either end, with no overshoot.
export function shelfProgress(elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed / SHELF_MOTION_MS));
  return t * t * (3 - 2 * t);
}

export function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}
