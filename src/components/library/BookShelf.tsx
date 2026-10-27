import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { CoverCatalog, Reading } from "../../lib/library";
import { bookDesign } from "../../lib/book-design";

function ShelfBook({
  reading,
  index,
  cover,
  active,
  onSelect,
}: {
  reading: Reading;
  index: number;
  cover?: string;
  active: boolean;
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
    if (!active) return;
    const frame = requestAnimationFrame(() =>
      button.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [active]);
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!active || event.button !== 0) return;
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
        data-turn={turn}
        data-pitch={pitch}
        style={
          {
            "--book-turn": `${turn}rad`,
            "--book-pitch": `${pitch}rad`,
          } as CSSProperties
        }
        aria-expanded={active}
        aria-controls={`details-${reading.id}`}
        aria-label={`${active ? "Put back" : "Explore"} ${reading.title}`}
        title={reading.title}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
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
          }
          if (active && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
            setTurn(
              (value) => value + (event.key === "ArrowLeft" ? -0.3 : 0.3),
            );
            event.preventDefault();
          }
        }}
      >
        <span className="binding-fallback" aria-hidden="true">
          <span className="binding-spine">{reading.title}</span>
          <span className="binding-cover">
            {reading.type === "Books" && cover && !imageFailed ? (
              <img
                src={`${import.meta.env.BASE_URL}library/${cover}`}
                alt=""
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <>
                <small>ATHENAEUM</small>
                <strong>{reading.title}</strong>
                <em>{reading.author}</em>
                <small>{reading.type}</small>
              </>
            )}
          </span>
        </span>
      </button>
      {!active && (
        <span className="shelf-mobile-title" aria-hidden="true">
          {reading.title}
        </span>
      )}
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
        </div>
        <p className="book-gesture">Drag to turn · Select again to put back</p>
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
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (active && !readings.some((reading) => reading.id === active))
      setActive(null);
  }, [readings, active]);
  useEffect(() => {
    setReady(false);
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
          setReady(true);
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
      className={`book-shelf${ready && !flat && !unavailable ? " has-webgl" : ""}`}
    >
      <div ref={canvasHost} aria-hidden="true" />
      <ol className="shelf-stack">
        {readings.map((reading, index) => (
          <ShelfBook
            key={reading.id}
            reading={reading}
            index={index}
            cover={covers[reading.id]?.images[0]}
            active={active === reading.id}
            onSelect={() =>
              setActive((value) => (value === reading.id ? null : reading.id))
            }
          />
        ))}
      </ol>
    </div>
  );
}
