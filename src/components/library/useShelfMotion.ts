import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Reading } from "../../lib/library";
import { interpolate, shelfProgress, SHELF_MOTION_MS } from "../../lib/shelf-motion";

type Snapshot = { height: number; bookHeight: number; open: number };

// Animate the actual layout, so the canvas, hit targets, and neighboring books
// follow the same geometry. Capture the current frame before React changes it;
// this also makes a second selection mid-animation start without a jump.
export default function useShelfMotion(
  root: RefObject<HTMLDivElement>,
  active: string | null,
  flat: boolean,
  readings: Reading[],
) {
  const pending = useRef<Map<string, Snapshot> | null>(null);
  const returnScroll = useRef(0);
  const frame = useRef(0);

  const capture = () => {
    if (flat || !root.current) return;
    cancelAnimationFrame(frame.current);
    if (!active) returnScroll.current = window.scrollY;
    pending.current = new Map(
      [...root.current.querySelectorAll<HTMLElement>(".shelf-book")].map((book) => [
        book.dataset.bookId!,
        {
          height: book.parentElement!.getBoundingClientRect().height,
          bookHeight: book.getBoundingClientRect().height,
          open: Number(book.dataset.openAmount || 0),
        },
      ]),
    );
  };

  useLayoutEffect(() => {
    const snapshots = pending.current;
    pending.current = null;
    const rows = [...(root.current?.querySelectorAll<HTMLElement>(".shelf-book") || [])];
    for (const book of rows) {
      book.style.removeProperty("height");
      book.parentElement!.style.removeProperty("height");
    }
    if (flat || !snapshots) return;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const startScroll = window.scrollY;
    const selected = rows.find((book) => book.dataset.bookId === active);
    const targetScroll = Math.max(0, Math.min(
      selected ? selected.getBoundingClientRect().top + startScroll - 24 : returnScroll.current,
      document.documentElement.scrollHeight - innerHeight,
    ));
    const targets = rows.map((book) => {
      const item = book.parentElement!;
      const open = book.dataset.bookId === active ? 1 : 0;
      const bookHeight = book.getBoundingClientRect().height;
      if (open) book.dataset.openHeight = String(bookHeight);
      return {
        book, item, open, bookHeight,
        height: item.getBoundingClientRect().height,
        from: snapshots.get(book.dataset.bookId!),
        details: item.querySelector<HTMLElement>(".book-details"),
      };
    }).filter(({ from, height, bookHeight, open }) => from && (
      from.height !== height || from.bookHeight !== bookHeight || from.open !== open
    ));
    for (const { details, open, from } of targets) {
      if (details && !open && from?.open) {
        // Keep the outgoing description visible just long enough to fade, but
        // remove its links from keyboard and accessibility navigation at once.
        details.hidden = false;
        details.inert = true;
        details.setAttribute("aria-hidden", "true");
      }
    }
    let scroll = true;
    const stopScroll = () => { scroll = false; };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) stopScroll();
    };
    window.addEventListener("wheel", stopScroll, { passive: true });
    window.addEventListener("touchstart", stopScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = reduceMotion.matches ? 1 : shelfProgress(now - start);
      for (const target of targets) {
        const { book, item, from, details } = target;
        if (!from) continue;
        book.dataset.openAmount = String(interpolate(from.open, target.open, progress));
        if (progress < 1) {
          item.style.height = `${interpolate(from.height, target.height, progress)}px`;
          book.style.height = `${interpolate(from.bookHeight, target.bookHeight, progress)}px`;
          if (details && target.open && from.open < 1)
            details.style.opacity = String(Math.max(0, (progress - 0.8) / 0.2));
          else if (details && !target.open)
            details.style.opacity = String(Math.max(0, 1 - progress * 4));
        } else {
          item.style.removeProperty("height");
          book.style.removeProperty("height");
          details?.style.removeProperty("opacity");
          if (details && !target.open) details.hidden = true;
        }
      }
      if (scroll) window.scrollTo({ top: interpolate(startScroll, targetScroll, progress), behavior: "instant" });
      if (now - start < SHELF_MOTION_MS && progress < 1) frame.current = requestAnimationFrame(tick);
    };
    tick(start);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("wheel", stopScroll);
      window.removeEventListener("touchstart", stopScroll);
      window.removeEventListener("keydown", onKey);
      targets.forEach(({ book, details }) => {
        if (!details) return;
        details.style.removeProperty("opacity");
        details.hidden = book.dataset.expanded !== "true";
        details.inert = false;
        details.removeAttribute("aria-hidden");
      });
    };
  }, [active, flat, readings, root]);

  return capture;
}
