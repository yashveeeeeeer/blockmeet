import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { CoverCatalog, Reading } from "../../lib/library";
import { bookDesign } from "../../lib/book-design";
import TitleCover from "./TitleCover";
import useShelfMotion from "./useShelfMotion";
import previewJSON from "../../../public/library/shelf-previews.json?raw";
import { shelfPreview, type ShelfPreviewCatalog } from "../../lib/shelf-preview";
import { SHELF_MOTION_MS } from "../../lib/shelf-motion";

const previews: ShelfPreviewCatalog = JSON.parse(previewJSON);
const mobileQuery = "(max-width: 760px), (pointer: coarse)";
let sceneModule: Promise<typeof import("./book-scene")> | undefined;
const loadScene = () => sceneModule ??= import("./book-scene");

function ShelfBook({
  reading,
  cover,
  active,
  flat,
  directLink,
  onSelect,
  mobile,
  eager,
}: {
  reading: Reading;
  cover?: string;
  active: boolean;
  flat: boolean;
  directLink: boolean;
  onSelect: () => void;
  mobile: boolean;
  eager: boolean;
}) {
  const [turn, setTurn] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [decodedPreview, setDecodedPreview] = useState<string>();
  const preview = mobile ? shelfPreview(previews, reading, cover) : undefined;
  const previewLoaded = !!preview && decodedPreview === preview;
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
      <button
        ref={button}
        className="shelf-book"
        data-book-id={reading.id}
        data-expanded={active}
        data-open-amount={active ? 1 : 0}
        data-turn={turn}
        data-pitch={pitch}
        data-preview-ready={previewLoaded && preview ? "true" : undefined}
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
        {mobile && !flat && preview && <img className="shelf-preview" style={{ visibility: previewLoaded ? undefined : "hidden" }} src={`${import.meta.env.BASE_URL}library/${preview}`} alt="" aria-hidden="true" width="1050" height="315" loading={eager ? "eager" : "lazy"} decoding="async" onLoad={async (event) => {
          // Loading can finish before async decoding. Keep the immediate spine
          // visible until the replacement has pixels ready to paint.
          const image = event.currentTarget;
          try { await image.decode(); setDecodedPreview(preview); }
          catch { setDecodedPreview(undefined); }
        }} onError={() => setDecodedPreview(undefined)} />}
        {!flat && <svg className="shelf-initial-spine" viewBox="0 0 600 142" aria-hidden="true">
          <path d="M30 8H600L570 100H0Z" fill={design.cloth} />
          <path d="M0 100H570V140H0Z" fill={design.cloth} />
          <path d="M570 100L600 8V48L570 140Z" fill="#d5d0bf" />
          <path d="M0 101H570" stroke={design.ink} opacity=".2" />
          <text x="285" y="127" textAnchor="middle" fill={design.ink} fontFamily="Georgia, serif" fontSize={Math.min(25, 950 / reading.title.length)}>{reading.title}</text>
        </svg>}
        {coverContent}
      </button>
      {flat && <span className="shelf-mobile-title" aria-hidden="true">
        {reading.title}
      </span>}
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
  const [mobile, setMobile] = useState(() => matchMedia(mobileQuery).matches);
  const [sceneSelection, setSceneSelection] = useState<string | null>(null);
  useEffect(() => {
    const query = matchMedia(mobileQuery);
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  // Keep the one interactive book alive until its closing motion has finished.
  useEffect(() => {
    if (active) { setSceneSelection(active); return; }
    const timer = window.setTimeout(() => setSceneSelection(null), SHELF_MOTION_MS + 50);
    return () => window.clearTimeout(timer);
  }, [active]);
  const sceneReadings = useMemo(() => mobile ? readings.filter(reading => reading.id === sceneSelection) : readings, [mobile, readings, sceneSelection]);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [rendered, setRendered] = useState<{
    readings: Reading[];
    covers: CoverCatalog;
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const ready = rendered?.readings === sceneReadings && rendered?.covers === covers;
  const useFlat = flat || unavailable;
  const captureMotion = useShelfMotion(root, active, useFlat, readings);
  const loading = !useFlat && !ready && (!mobile || !!sceneSelection);
  const focused = !!active && !useFlat;
  const railCurrent = active || visibleId || readings[0]?.id;
  const previousActive = useRef<string | null>(null);
  const select = (id: string | null) => {
    if (id === active) return;
    captureMotion();
    setActive(id);
  };
  useEffect(() => {
    if (active || useFlat || (!mobile && !ready)) return;
    if (mobile) {
      // Native image scrolling needs no RAF loop or per-frame layout reads.
      const observer = new IntersectionObserver((entries) => {
        if (root.current?.hasAttribute("data-focus-view")) return;
        const current = entries.filter(entry => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - innerHeight / 2) - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - innerHeight / 2))[0];
        if (current) setVisibleId((current.target as HTMLElement).dataset.bookId || null);
      }, { rootMargin: `${-innerHeight * .4}px 0px ${-innerHeight * .4}px 0px` });
      root.current?.querySelectorAll(".shelf-book").forEach(book => observer.observe(book));
      return () => observer.disconnect();
    }
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
  }, [active, useFlat, ready, readings, mobile]);
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
    if (flat || unavailable || !sceneReadings.length) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let canvas: HTMLCanvasElement | undefined;
    loadScene()
      .then(({ mountBookScene }) => {
        if (cancelled || !root.current || !canvasHost.current) return;
        canvas = document.createElement("canvas");
        canvas.className = "shelf-canvas";
        canvasHost.current.append(canvas);
        try {
          dispose = mountBookScene(root.current, canvas, sceneReadings, covers, () =>
            setUnavailable(true),
            () => { if (!cancelled) setRendered({ readings: sceneReadings, covers }); },
            mobile,
          );
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
  }, [sceneReadings, covers, flat, unavailable, mobile]);
  return (
    <div
      ref={root}
      className={`book-shelf${mobile ? " mobile-shelf" : ""}${useFlat ? " is-flat" : ready ? " has-webgl" : " is-loading"}`}
      aria-busy={loading}
      role={focused ? "dialog" : undefined}
      aria-modal={focused ? true : undefined}
      aria-label={focused ? readings.find((reading) => reading.id === active)?.title : undefined}
    >
      <div className="shelf-focus-backdrop" aria-hidden="true" />
      <div ref={canvasHost} aria-hidden="true" />
      {!useFlat && (ready || mobile) && (
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
      <ol className="shelf-stack">
        {readings.map((reading, index) => (
          <ShelfBook
            key={reading.id}
            reading={reading}
            mobile={mobile}
            eager={index < 6}
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
