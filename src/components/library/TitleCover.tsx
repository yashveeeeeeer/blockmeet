import { useLayoutEffect, useRef } from "react";
import type { Reading } from "../../lib/library";

// Measure the actual card, not the viewport: a wide screen can still have narrow
// grid columns. Each text block has its own reserved space inside the binding.
export default function TitleCover({
  reading,
  enabled,
}: {
  reading: Reading;
  enabled: boolean;
}) {
  const titleSlot = useRef<HTMLSpanElement>(null);
  const authorSlot = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const slots = [titleSlot.current, authorSlot.current].filter(
      (slot): slot is HTMLSpanElement => !!slot,
    );
    const fit = () => {
      for (const slot of slots) {
        const text = slot.firstElementChild as HTMLElement;
        if (!slot.clientWidth || !slot.clientHeight) continue;
        const maximum =
          slot === titleSlot.current
            ? Math.min(26, slot.clientWidth * 0.16)
            : 13;
        let low = 5;
        let high = maximum;
        // Binary search in half-pixel steps; no truncation or split words.
        while (high - low > 0.25) {
          const size = (low + high) / 2;
          text.style.fontSize = `${size}px`;
          if (
            text.scrollHeight <= slot.clientHeight &&
            text.scrollWidth <= slot.clientWidth
          )
            low = size;
          else high = size;
        }
        text.style.fontSize = `${Math.floor(low * 2) / 2}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    slots.forEach((slot) => observer.observe(slot));
    document.fonts.addEventListener("loadingdone", fit);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, [enabled, reading.title, reading.author]);
  return (
    <>
      <small>ATHENAEUM</small>
      <span ref={titleSlot} className="cover-title-slot">
        <strong>{reading.title}</strong>
      </span>
      <span ref={authorSlot} className="cover-author-slot">
        <em>{reading.author}</em>
      </span>
      <small>{reading.type}</small>
    </>
  );
}
