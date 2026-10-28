type Defer = (task: () => void) => () => void;

const idle: Defer = (task) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 1000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 100);
  return () => window.clearTimeout(id);
};

// Prioritize the first screen, then warm the remaining small renders two at a
// time. Reuse the actual DOM images so decoding is not repeated in a second
// Image object, and retain them when they leave the viewport.
export function warmShelfPreviews(images: HTMLImageElement[], defer: Defer = idle) {
  // Bound background traffic if the sheet grows; subsequent rows still use
  // native lazy loading. This covers the entire current 42-reading library.
  const queue = images.filter(image => image.loading === "lazy" && !image.complete).slice(0, 64);
  const pending = new Map<HTMLImageElement, () => void>();
  let cancelled = false;
  let cancelIdle = () => {};
  const pump = () => {
    if (cancelled) return;
    while (pending.size < 2 && queue.length) {
      const image = queue.shift()!;
      if (image.complete) continue;
      const done = () => {
        remove();
        pending.delete(image);
        if (!cancelled) { cancelIdle(); cancelIdle = defer(pump); }
      };
      const remove = () => {
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
      };
      pending.set(image, remove);
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
      image.fetchPriority = "low";
      image.loading = "eager";
    }
  };
  cancelIdle = defer(pump);
  return () => {
    cancelled = true;
    cancelIdle();
    pending.forEach(remove => remove());
    pending.clear();
  };
}
