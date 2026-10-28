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
  const [day, setDay] = useState(false);
  const [crt, setCrt] = useState(false);
  const [eink, setEink] = useState(false);
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
        const merged = mergeReadings(latest, additions);
        // An unchanged sheet must not tear down and rebuild the entire GPU scene.
        setReadings((current) => JSON.stringify(current) === JSON.stringify(merged) ? current : merged);
        try {
          localStorage.setItem(CACHE_KEY, csv);
        } catch {
          /* storage may be disabled */
        }
      } catch {
        /* Keep the saved collection when the sheet is unavailable. */
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
  }, []);
  const categories = useMemo(
    () => ["All", ...new Set(readings.map((reading) => reading.type))],
    [readings],
  );
  const activeCategory = categories.includes(category) ? category : "All";
  const shown = useMemo(
    () => filterReadings(readings, activeCategory, ""),
    [readings, activeCategory],
  );

  return (
    <div
      className={`library-page${day ? " library-day" : ""}${crt && !eink ? " crt-effect" : ""}${eink ? " library-eink" : ""}`}
    >
      <a className="skip-link" href="#library-shelves">
        Skip to the library
      </a>
      <main className="library-layout">
        <header className="library-masthead">
          <div className="library-heading">
            <h1>
              <Link to="/" aria-label="Athenaeum — back to world">
                Athenaeum<span>.</span>
              </Link>
            </h1>
            <p>A personal collection of readings I've finished.</p>
          </div>
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
        <section
          id="library-shelves"
          className="library-collection"
          aria-label="Reading collection"
          tabIndex={-1}
        >
          <div className="library-collection-heading">
            <select
              className="library-category-select"
              aria-label="Filter by reading type"
              value={activeCategory}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name === "All" ? "All readings" : name}
                </option>
              ))}
            </select>
            <span className="sr-only" role="status" aria-live="polite">
              {shown.length} readings
            </span>
          </div>
          {shown.length ? (
            <BookShelf readings={shown} covers={covers} flat={eink} />
          ) : (
            <div className="library-empty">
              <h2>No readings found.</h2>
              <button onClick={() => setCategory("All")}>
                Show all readings
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
