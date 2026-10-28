import { useLayoutEffect, useRef, type RefObject } from "react";
import type { Reading } from "../../lib/library";
import { awayBookRect, focusedBookRect, interpolate, shelfProgress, type ShelfRect } from "../../lib/shelf-motion";

type Snapshot = { rect: ShelfRect; open: number };
const positionProperties = ["position", "left", "top", "width", "height"];

// Keep the shelf's document layout while its covers travel in viewport space.
// Closing returns to the same slots without moving the reader's scroll.
export default function useShelfMotion(
  root: RefObject<HTMLDivElement>,
  active: string | null,
  flat: boolean,
  readings: Reading[],
) {
  const home = useRef(new Map<string, ShelfRect>());
  const slots = useRef(new Map<string, number>());
  const pending = useRef<Map<string, Snapshot> | null>(null);
  const frame = useRef(0);
  const unlock = useRef<(() => void) | null>(null);
  const rows = () => [...(root.current?.querySelectorAll<HTMLButtonElement>(".shelf-book") || [])];
  const clearPositions = () => rows().forEach((book) => {
    positionProperties.forEach((property) => book.style.removeProperty(property));
    book.parentElement!.style.removeProperty("height");
  });
  const reset = () => {
    cancelAnimationFrame(frame.current);
    clearPositions();
    rows().forEach((book) => {
      book.parentElement!.inert = false;
      book.parentElement!.querySelector<HTMLElement>(".book-details")?.style.removeProperty("opacity");
    });
    root.current?.removeAttribute("data-focus-view");
    root.current?.style.removeProperty("--focus-progress");
    home.current.clear();
    slots.current.clear();
    unlock.current?.();
    unlock.current = null;
  };
  const capture = () => {
    if (flat) return;
    cancelAnimationFrame(frame.current);
    const books = rows();
    pending.current = new Map(books.map((book) => [book.dataset.bookId!, {
      rect: book.getBoundingClientRect(),
      open: Number(book.dataset.openAmount || 0),
    }]));
    if (!home.current.size)
      books.forEach((book) => {
        home.current.set(book.dataset.bookId!, book.getBoundingClientRect());
        slots.current.set(book.dataset.bookId!, book.parentElement!.getBoundingClientRect().height);
      });
  };

  useLayoutEffect(() => {
    if (flat || (!active && !pending.current)) {
      reset();
      return;
    }
    const books = rows();
    const snapshots = pending.current;
    pending.current = null;
    if (!snapshots) {
      // A refreshed collection must never inherit stale viewport coordinates.
      clearPositions();
      books.forEach((book) => {
        home.current.set(book.dataset.bookId!, book.getBoundingClientRect());
        slots.current.set(book.dataset.bookId!, book.parentElement!.getBoundingClientRect().height);
      });
    }
    const selectedIndex = readings.findIndex((reading) => reading.id === active);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    if (!unlock.current) {
      const overflow = document.body.style.overflow;
      const gutter = document.documentElement.style.scrollbarGutter;
      const surroundings = [...(root.current?.closest("main")?.querySelectorAll<HTMLElement>(".library-masthead, .library-collection-heading") || [])];
      const previousInert = surroundings.map((element) => element.inert);
      document.documentElement.style.scrollbarGutter = "stable";
      document.body.style.overflow = "hidden";
      surroundings.forEach((element) => { element.inert = true; });
      unlock.current = () => {
        document.body.style.overflow = overflow;
        document.documentElement.style.scrollbarGutter = gutter;
        surroundings.forEach((element, i) => { element.inert = previousInert[i]; });
      };
    }
    root.current!.dataset.focusView = "true";
    const fromFocus = Number(root.current!.style.getPropertyValue("--focus-progress") || 0);
    const targets = () => books.map((book, index) => {
      const id = book.dataset.bookId!;
      const original = home.current.get(id) || book.getBoundingClientRect();
      const open = id === active ? 1 : 0;
      const rect = open ? focusedBookRect(innerWidth, innerHeight)
        : active ? awayBookRect(original, index, selectedIndex, innerHeight) : original;
      if (open) book.dataset.openHeight = String(rect.height);
      book.parentElement!.inert = id !== active;
      book.parentElement!.style.height = String(slots.current.get(id) || original.height) + "px";
      return { book, open, rect, from: snapshots?.get(id) || { rect, open } };
    });
    let destinations = targets();
    const returnBook = books.find((book) => (snapshots?.get(book.dataset.bookId!)?.open || 0) > 0);
    const apply = (progress: number) => {
      root.current!.style.setProperty("--focus-progress", String(interpolate(fromFocus, active ? 1 : 0, progress)));
      for (const { book, rect, open, from } of destinations) {
        book.style.position = "fixed";
        for (const property of ["left", "top", "width", "height"] as const)
          book.style[property] = String(interpolate(from.rect[property], rect[property], progress)) + "px";
        book.dataset.openAmount = String(interpolate(from.open, open, progress));
        const details = book.parentElement!.querySelector<HTMLElement>(".book-details");
        if (details) details.style.opacity = String(open ? Math.max(0, (progress - 0.65) / 0.35) : 0);
      }
    };
    const start = performance.now();
    const tick = (now: number) => {
      const progress = reduceMotion.matches || !snapshots ? 1 : shelfProgress(now - start);
      apply(progress);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else if (!active) {
        reset();
        returnBook?.focus({ preventScroll: true });
      }
    };
    const resize = () => {
      cancelAnimationFrame(frame.current);
      clearPositions();
      books.forEach((book) => {
        home.current.set(book.dataset.bookId!, book.getBoundingClientRect());
        slots.current.set(book.dataset.bookId!, book.parentElement!.getBoundingClientRect().height);
      });
      destinations = targets();
      apply(1);
      if (!active) {
        reset();
        returnBook?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("resize", resize);
    tick(start);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, flat, readings, root]);

  useLayoutEffect(() => () => reset(), []);
  return capture;
}
