import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import savedCSV from "../../public/library/readings.csv?raw";
import savedCovers from "../../public/library/covers.json?raw";
import { fetchReadings, filterReadings, readingsFromCSV, type CoverCatalog, type Reading } from "../lib/library";
import "./library.css";

const covers: CoverCatalog = JSON.parse(savedCovers);
const snapshot = readingsFromCSV(savedCSV);
const CACHE_KEY = "blockmeet-library-csv-v1";
const BASE = import.meta.env.BASE_URL;

function initialReadings() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? readingsFromCSV(cached) : snapshot;
  } catch { return snapshot; }
}

function ReadingCard({ reading, index }: { reading: Reading; index: number }) {
  const [failed, setFailed] = useState(false);
  const image = covers[reading.id]?.images[0];
  const contents = <>
    <div className="library-cover">
      {image && !failed ? (
        <img src={`${BASE}library/${image}`} alt="" loading={index < 6 ? "eager" : "lazy"}
          decoding="async" width="240" height="360" onError={() => setFailed(true)} />
      ) : (
        <div className="library-title-page" aria-hidden="true"><span>{reading.title}</span></div>
      )}
      {reading.url && <span className="library-open" aria-hidden="true">↗</span>}
    </div>
    <h2>{reading.title}</h2>
  </>;
  return <li className="library-card">
    {reading.url ? <a href={reading.url} target="_blank" rel="noopener noreferrer"
      aria-label={`${reading.title}${reading.author ? ` by ${reading.author}` : ""} (opens in a new tab)`}>{contents}</a>
      : <div>{contents}</div>}
  </li>;
}

export default function LibraryPage() {
  const [readings, setReadings] = useState<Reading[]>(initialReadings);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [savedMode, setSavedMode] = useState(false);
  const [reload, setReload] = useState(0);
  const [day, setDay] = useState(false);
  const [crt, setCrt] = useState(false);
  const [eink, setEink] = useState(false);

  useEffect(() => {
    document.title = "Athenaeum · BLOCKMeet";
    window.scrollTo(0, 0);
    return () => { document.title = "BLOCKMeet"; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;
    async function refresh() {
      try {
        const { csv, readings: latest } = await fetchReadings(controller.signal);
        if (!active) return;
        setReadings(latest);
        setSavedMode(false);
        try { localStorage.setItem(CACHE_KEY, csv); } catch { /* storage can be disabled */ }
      } catch {
        if (active) setSavedMode(true);
      } finally { window.clearTimeout(timeout); }
    }
    void refresh();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [reload]);

  const categories = useMemo(() => ["All", ...[...new Set(readings.map(reading => reading.type))].sort((a, b) => a === "Books" ? -1 : b === "Books" ? 1 : a.localeCompare(b))], [readings]);
  const activeCategory = categories.includes(category) ? category : "All";
  const shown = useMemo(() => filterReadings(readings, activeCategory, query), [readings, activeCategory, query]);
  const clear = () => { setCategory("All"); setQuery(""); };

  return <div className={`library-page ${day ? "library-day" : ""} ${crt ? "crt-effect" : ""} ${eink ? "eink-effect" : ""}`}>
    <a className="skip-link" href="#library-shelves">Skip to the library</a>
    <div className="library-shell">
      <header className="library-topbar">
        <Link to="/" className="library-back">← <span>BACK TO WORLD</span></Link>
        <div className="library-display" aria-label="Display settings">
          <button type="button" aria-label="Toggle day/night" aria-pressed={day} onClick={() => setDay(value => !value)}>{day ? "DAY" : "NIGHT"}</button>
          <button type="button" aria-label="Toggle CRT scanlines" aria-pressed={crt} onClick={() => setCrt(value => !value)}>CRT</button>
          <button type="button" aria-label="Toggle e-ink" aria-pressed={eink} onClick={() => setEink(value => !value)}>E-INK</button>
        </div>
      </header>

      <main>
        <section className="library-heading" aria-labelledby="library-title">
          <div>
            <h1 id="library-title">ATHENAEUM<span aria-hidden="true">.</span></h1>
            <p className="library-intro">A home for books, essays, and things worth reading.</p>
          </div>
        </section>

        <div className="library-tools">
          <div className="library-categories" role="group" aria-label="Filter by reading type">
            {categories.map(name => <button key={name} type="button" aria-pressed={activeCategory === name}
              onClick={() => setCategory(name)}>{name}<span>{name === "All" ? readings.length : readings.filter(reading => reading.type === name).length}</span></button>)}
          </div>
          <div className="library-search">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5" /><path d="m12 12 5 5" /></svg>
            <input type="search" aria-label="Search the library" placeholder="Find a title or author…" value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
          </div>
        </div>

        <div className="library-shelf-label" role="status" aria-live="polite">
          <span>{query ? `SEARCH RESULTS · ${shown.length}` : `${activeCategory === "All" ? "ON THE SHELVES" : activeCategory.toUpperCase()} · ${shown.length}`}</span>
          <span className="library-shelf-hint">Pick something. Get lost in it.</span>
        </div>

        <section id="library-shelves" aria-label="Reading collection" tabIndex={-1}>
          {shown.length > 0 ? <ul className="library-grid">{shown.map((reading, index) => <ReadingCard key={reading.id} reading={reading} index={index} />)}</ul> :
            <div className="library-empty"><h2>{readings.length ? "Nothing on this shelf yet." : "A library waiting to grow."}</h2>
              <p>{readings.length ? "Try another title, author, or shelf." : "The next good read will find a home here."}</p>
              {readings.length > 0 && <button type="button" onClick={clear}>Show all readings</button>}
            </div>}
        </section>
      </main>

      {savedMode && <p className="library-sync-note" role="status">Showing the saved library. <button type="button" onClick={() => setReload(value => value + 1)}>Try refreshing</button></p>}
    </div>
  </div>;
}
