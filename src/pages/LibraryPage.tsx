import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import savedCSV from "../../public/library/readings.csv?raw";
import additionsCSV from "../../public/library/additions.csv?raw";
import savedCovers from "../../public/library/covers.json?raw";
import {
  fetchReadings,
  filterReadings,
  mergeReadings,
  readingsFromCSV,
  type CoverCatalog,
} from "../lib/library";
import BookShelf from "../components/library/BookShelf";
import "./library.css";

const covers: CoverCatalog = JSON.parse(savedCovers);
const additions = readingsFromCSV(additionsCSV);
const snapshot = mergeReadings(readingsFromCSV(savedCSV), additions);
const CACHE_KEY = "blockmeet-library-csv-v1";
function initialReadings() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached
      ? mergeReadings(readingsFromCSV(cached), additions)
      : snapshot;
  } catch {
    return snapshot;
  }
}

export default function LibraryPage() {
  const [readings, setReadings] = useState(initialReadings);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [savedMode, setSavedMode] = useState(false);
  const [reload, setReload] = useState(0);
  const [day, setDay] = useState(false);
  const [crt, setCrt] = useState(false);
  const [eink, setEink] = useState(false);
  const [view, setView] = useState<"shelf" | "index">("shelf");
  useEffect(() => {
    document.title = "Athenaeum · BLOCKMeet";
    window.scrollTo(0, 0);
    return () => {
      document.title = "BLOCKMeet";
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;
    async function refresh() {
      try {
        const { csv, readings: latest } = await fetchReadings(
          controller.signal,
        );
        if (!active) return;
        setReadings(mergeReadings(latest, additions));
        setSavedMode(false);
        try {
          localStorage.setItem(CACHE_KEY, csv);
        } catch {
          /* storage may be disabled */
        }
      } catch {
        if (active) setSavedMode(true);
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void refresh();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [reload]);
  const categories = useMemo(
    () => ["All", ...new Set(readings.map((reading) => reading.type))],
    [readings],
  );
  const activeCategory = categories.includes(category) ? category : "All";
  const shown = useMemo(
    () => filterReadings(readings, activeCategory, query),
    [readings, activeCategory, query],
  );
  const clear = () => {
    setCategory("All");
    setQuery("");
  };

  return (
    <div
      className={`library-page${day ? " library-day" : ""}${crt && !eink ? " crt-effect" : ""}${eink ? " library-eink" : ""}`}
    >
      <a className="skip-link" href="#library-shelves">
        Skip to the library
      </a>
      <header className="library-topbar">
        <Link to="/" className="library-back">
          <span aria-hidden="true">←</span> BACK TO WORLD
        </Link>
        <span className="library-wordmark">
          A<span aria-hidden="true"> / </span>
          <span className="wordmark-name">A personal library</span>
        </span>
        <div className="library-display" aria-label="Display settings">
          <button
            type="button"
            aria-label="Toggle day/night"
            aria-pressed={day}
            disabled={eink}
            onClick={() => setDay((value) => !value)}
          >
            {day ? "DAY" : "NIGHT"}
          </button>
          <button
            type="button"
            aria-label="Toggle CRT scanlines"
            aria-pressed={crt}
            disabled={eink}
            onClick={() => setCrt((value) => !value)}
          >
            CRT
          </button>
          <button
            type="button"
            aria-label="Toggle e-ink"
            aria-pressed={eink}
            onClick={() => setEink((value) => !value)}
          >
            E-INK
          </button>
        </div>
      </header>
      <main className="library-layout">
        <aside className="library-sidebar" aria-label="Library controls">
          <div className="library-heading">
            <h1>
              Athenaeum<span>.</span>
            </h1>
            <p>
              Books, essays, and <br />
              things worth keeping.
            </p>
          </div>
          <div
            className="library-categories"
            role="group"
            aria-label="Filter by reading type"
          >
            {categories.map((name) => (
              <button
                key={name}
                aria-pressed={activeCategory === name}
                onClick={() => setCategory(name)}
              >
                <span>{name === "All" ? "All readings" : name}</span>
                <span>
                  {String(
                    name === "All"
                      ? readings.length
                      : readings.filter((reading) => reading.type === name)
                          .length,
                  ).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          <div className="library-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search the library"
              placeholder="Find a title or author"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                ×
              </button>
            )}
          </div>
          <div
            className="library-view"
            role="group"
            aria-label="Collection view"
          >
            <button
              aria-pressed={view === "shelf"}
              onClick={() => setView("shelf")}
            >
              Shelf
            </button>
            <button
              aria-pressed={view === "index"}
              onClick={() => setView("index")}
            >
              Index
            </button>
          </div>
          <p className="library-instruction">
            {view === "shelf"
              ? eink
                ? "Select a cover to explore a reading."
                : "Pick a spine. Turn it over. Find your next idea."
              : "The whole collection, at a glance."}
          </p>
          {savedMode && (
            <p className="library-sync-note">
              Saved collection{" "}
              <button onClick={() => setReload((value) => value + 1)}>
                Refresh ↻
              </button>
            </p>
          )}
        </aside>
        <section
          id="library-shelves"
          className="library-collection"
          aria-label="Reading collection"
          tabIndex={-1}
        >
          <div className="library-collection-heading">
            <span>
              {activeCategory === "All" ? "The collection" : activeCategory}
            </span>
            <span role="status" aria-live="polite">
              {shown.length} {shown.length === 1 ? "reading" : "readings"}
              {query ? " found" : ""}
            </span>
          </div>
          {shown.length ? (
            view === "shelf" ? (
              <BookShelf readings={shown} covers={covers} flat={eink} />
            ) : (
              <ol className="library-index">
                {shown.map((reading, index) => (
                  <li key={reading.id}>
                    <span className="index-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      {reading.url ? (
                        <a
                          href={reading.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {reading.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span>{reading.title}</span>
                      )}
                      {reading.author && <p>{reading.author}</p>}
                    </div>
                    <span className="index-type">{reading.type}</span>
                  </li>
                ))}
              </ol>
            )
          ) : (
            <div className="library-empty">
              <h2>No readings found.</h2>
              <p>Try another title, author, or category.</p>
              <button onClick={clear}>Show all readings</button>
            </div>
          )}
          {shown.length > 0 && (
            <div className="shelf-end" aria-hidden="true">
              · · ·
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
