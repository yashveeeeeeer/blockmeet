import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { CoverCatalog, Reading } from "../../lib/library";
import { bookDesign } from "../../lib/book-design";
import TitleCover from "./TitleCover";
import useShelfMotion from "./useShelfMotion";

function ShelfBook({
  reading,
  index,
  cover,
  active,
  flat,
  directLink,
  onSelect,
}: {
  reading: Reading;
  index: number;
  cover?: string;
  active: boolean;
  flat: boolean;
  directLink: boolean;
  onSelect: () => void;
}) {
  const [turn, setTurn] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    turn: number;
    pitch: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const design = bookDesign(reading);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) { setTurn(0); setPitch(0); }
  }, [active]);
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (flat || !active || event.button !== 0) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      turn,
      pitch,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) start.moved = true;
    if (start.moved) {
      setTurn(start.turn + dx * 0.008);
      setPitch(Math.max(-0.7, Math.min(0.7, start.pitch + dy * 0.005)));
    }
  };
  const coverContent = (
    <span className="binding-fallback" aria-hidden="true">
      <span className="binding-cover">
        {reading.type === "Books" && cover && !imageFailed ? (
          <img
            src={`${import.meta.env.BASE_URL}library/${cover}`}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <TitleCover reading={reading} enabled={flat} />
        )}
      </span>
    </span>
  );
  if (directLink) {
    return (
      <li className="shelf-item">
        {reading.url ? (
          <a
            className="shelf-book"
            data-book-id={reading.id}
            href={reading.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${reading.title} (opens in a new tab)`}
            title={reading.title}
          >
            {coverContent}
          </a>
        ) : (
          <div
            className="shelf-book"
            data-book-id={reading.id}
            role="img"
            aria-label={reading.title}
          >
            {coverContent}
          </div>
        )}
        <span className="shelf-mobile-title" aria-hidden="true">
          {reading.title}
        </span>
      </li>
    );
  }
  return (
    <li
      className={`shelf-item${active ? " is-open" : ""}`}
      style={
        {
          "--cloth": design.cloth,
          "--binding-ink": design.ink,
        } as CSSProperties
      }
    >
      <span className="shelf-number" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <button
        ref={button}
        className="shelf-book"
        data-book-id={reading.id}
        data-expanded={active}
        data-open-amount={active ? 1 : 0}
        data-turn={turn}
        data-pitch={pitch}
        aria-expanded={active}
        aria-controls={`details-${reading.id}`}
        aria-label={`${active ? "Put back" : "Explore"} ${reading.title}`}
        title={reading.title}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (!active) {
            setTurn(0);
            setPitch(0);
          }
          onSelect();
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={(event) => {
          suppressClick.current = !!drag.current?.moved;
          drag.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
          suppressClick.current = false;
        }}
        onKeyDown={(event) => {
          if (active && event.key === "Escape") {
            onSelect();
            event.preventDefault();
            event.stopPropagation();
          }
          if (
            !flat &&
            active &&
            ["ArrowLeft", "ArrowRight"].includes(event.key)
          ) {
            setTurn(
              (value) => value + (event.key === "ArrowLeft" ? -0.3 : 0.3),
            );
            event.preventDefault();
          }
        }}
      >
        {coverContent}
      </button>
      <span className="shelf-mobile-title" aria-hidden="true">
        {reading.title}
      </span>
      <span className="shelf-indicator" aria-hidden="true">
        {active ? "−" : "+"}
      </span>
      <div
        id={`details-${reading.id}`}
        className="book-details"
        hidden={!active}
      >
        <div className="book-description">
          <span className="book-type">{reading.type}</span>
          <h2>{reading.title}</h2>
          {reading.author && <p>{reading.author}</p>}
        </div>
        <div className="book-actions">
          {reading.url && (
            <a
              className="reading-link"
              href={reading.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {reading.type === "Books" ? "Visit book" : "Read source"}{" "}
              <span aria-hidden="true">↗</span>
              <span className="sr-only">
                : {reading.title} (opens in a new tab)
              </span>
            </a>
          )}
          {!flat && (
            <div
              className="book-turn-controls"
              aria-label={`Rotate ${reading.title}`}
            >
              <button
                type="button"
                aria-label="Rotate book left"
                onClick={() => setTurn((value) => value - 0.4)}
              >
                ↶
              </button>
              <button
                type="button"
                aria-label="Reset book rotation"
                onClick={() => {
                  setTurn(0);
                  setPitch(0);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                aria-label="Rotate book right"
                onClick={() => setTurn((value) => value + 0.4)}
              >
                ↷
              </button>
            </div>
          )}
          <button
            className="book-close"
            type="button"
            onClick={() => {
              onSelect();
              button.current?.focus({ preventScroll: true });
            }}
          >
            Close book
          </button>
        </div>
        {!flat && (
          <p className="book-gesture">
            Drag to turn · Select again to put back
          </p>
        )}
      </div>
    </li>
  );
}

export default function BookShelf({
  readings,
  covers,
  flat,
}: {
  readings: Reading[];
  covers: CoverCatalog;
  flat: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [rendered, setRendered] = useState<{
    readings: Reading[];
    covers: CoverCatalog;
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const ready = rendered?.readings === readings && rendered?.covers === covers;
  const useFlat = flat || unavailable;
  const captureMotion = useShelfMotion(root, active, useFlat, readings);
  const loading = !useFlat && !ready;
  const focused = !!active && !useFlat;
  const railCurrent = active || visibleId || readings[0]?.id;
  const previousActive = useRef<string | null>(null);
  const select = (id: string | null) => {
    if (id === active) return;
    captureMotion();
    setActive(id);
  };
  useEffect(() => {
    if (active || useFlat || !ready) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (root.current?.hasAttribute("data-focus-view")) {
        frame = requestAnimationFrame(update);
        return;
      }
      const books = [...(root.current?.querySelectorAll<HTMLElement>(".shelf-book") || [])];
      let closest: HTMLElement | undefined;
      let distance = Infinity;
      for (const book of books) {
        const rect = book.getBoundingClientRect();
        const next = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
        if (next < distance) { closest = book; distance = next; }
      }
      setVisibleId(closest?.dataset.bookId || null);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, useFlat, ready, readings]);
  useEffect(() => {
    const ticks = root.current?.querySelector<HTMLElement>(".shelf-rail-ticks");
    const current = ticks?.querySelector<HTMLElement>("[aria-current]");
    if (!ticks || !current) return;
    if (current.offsetTop < ticks.scrollTop) ticks.scrollTop = current.offsetTop;
    else if (current.offsetTop + current.offsetHeight > ticks.scrollTop + ticks.clientHeight)
      ticks.scrollTop = current.offsetTop + current.offsetHeight - ticks.clientHeight;
  }, [railCurrent]);
  useEffect(() => {
    const books = [...(root.current?.querySelectorAll<HTMLButtonElement>(".shelf-book") || [])];
    const selected = books.find((book) => book.dataset.bookId === (active || previousActive.current));
    if (!document.activeElement?.closest(".shelf-rail") || !active)
      selected?.focus({ preventScroll: true });
    previousActive.current = active;
    if (!focused) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        select(null);
      }
      if (event.key !== "Tab") return;
      const controls = [...(root.current?.querySelectorAll<HTMLElement>("button, a[href]") || [])]
        .filter((element) => element.tabIndex >= 0 && !element.closest("[inert], [hidden]") && element.getBoundingClientRect().width > 0);
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey ? index <= 0 : index === controls.length - 1) {
        event.preventDefault();
        controls[event.shiftKey ? controls.length - 1 : 0]?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [active, focused]);
  useEffect(() => {
    if (flat || (active && !readings.some((reading) => reading.id === active)))
      setActive(null);
  }, [readings, active, flat]);
  useEffect(() => {
    setRendered(null);
    if (flat || unavailable) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let canvas: HTMLCanvasElement | undefined;
    import("./book-scene")
      .then(({ mountBookScene }) => {
        if (cancelled || !root.current || !canvasHost.current) return;
        canvas = document.createElement("canvas");
        canvas.className = "shelf-canvas";
        canvasHost.current.append(canvas);
        try {
          dispose = mountBookScene(root.current, canvas, readings, covers, () =>
            setUnavailable(true),
          );
          // mountBookScene has drawn the first frame in its final orientation.
          setRendered({ readings, covers });
        } catch {
          canvas.remove();
          setUnavailable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
      dispose?.();
      canvas?.remove();
    };
  }, [readings, covers, flat, unavailable]);
  return (
    <div
      ref={root}
      className={`book-shelf${useFlat ? " is-flat" : ready ? " has-webgl" : " is-loading"}`}
      aria-busy={loading}
      role={focused ? "dialog" : undefined}
      aria-modal={focused ? true : undefined}
      aria-label={focused ? readings.find((reading) => reading.id === active)?.title : undefined}
    >
      <div className="shelf-focus-backdrop" aria-hidden="true" />
      <div ref={canvasHost} aria-hidden="true" />
      {!useFlat && ready && (
        <nav className="shelf-rail" aria-label="Reading navigation">
          <button className="shelf-rail-back" type="button" aria-label="Back to bookshelf" hidden={!active} onClick={() => select(null)}>←</button>
          <div className="shelf-rail-ticks">
            {readings.map((reading, index) => (
              <button
                key={reading.id}
                type="button"
                className="shelf-rail-tick"
                aria-label={`Open ${reading.title}`}
                aria-current={reading.id === railCurrent ? "true" : undefined}
                tabIndex={reading.id === railCurrent ? 0 : -1}
                onClick={() => select(reading.id)}
                onKeyDown={(event) => {
                  const next = event.key === "ArrowDown" ? Math.min(index + 1, readings.length - 1)
                    : event.key === "ArrowUp" ? Math.max(index - 1, 0)
                    : event.key === "Home" ? 0 : event.key === "End" ? readings.length - 1 : null;
                  if (next === null) return;
                  event.preventDefault();
                  select(readings[next].id);
                  (event.currentTarget.parentElement!.children[next] as HTMLElement).focus({ preventScroll: true });
                }}
              ><span className="shelf-rail-mark" /><span className="shelf-rail-label">{reading.title}</span></button>
            ))}
          </div>
        </nav>
      )}
      {loading && (
        <p className="shelf-loading" role="status">
          Preparing the bookshelf…
        </p>
      )}
      <ol className="shelf-stack" aria-hidden={loading || undefined}>
        {readings.map((reading, index) => (
          <ShelfBook
            key={reading.id}
            reading={reading}
            index={index}
            cover={covers[reading.id]?.images[0]}
            active={!flat && active === reading.id}
            flat={useFlat}
            directLink={flat}
            onSelect={() => select(active === reading.id ? null : reading.id)}
          />
        ))}
      </ol>
    </div>
  );
}
