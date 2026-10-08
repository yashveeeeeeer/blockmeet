export const LIBRARY_SHEET = "https://docs.google.com/spreadsheets/d/1_osSnIbsvgJADRjoIj07pE1AOh1BuAOpSfENd58M4QM/edit";
export const LIBRARY_CSV = "https://docs.google.com/spreadsheets/d/1_osSnIbsvgJADRjoIj07pE1AOh1BuAOpSfENd58M4QM/export?format=csv";

export interface Reading {
  id: string;
  title: string;
  author: string;
  type: string;
  url: string;
}

export interface CoverRecord {
  title: string;
  images: string[];
  attempts: { source: string; result: string }[];
}

export type CoverCatalog = Record<string, CoverRecord>;

// Google Sheets quotes cells containing commas, line breaks and double quotes.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("The reading CSV contains an unclosed quoted cell.");
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function safeURL(value: string): string {
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function readingID(title: string, author: string): string {
  const identity = `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
  let hash = 2166136261;
  for (const char of identity) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

export function readingsFromCSV(text: string): Reading[] {
  const [header, ...rows] = parseCSV(text);
  if (!header) throw new Error("The reading CSV is empty.");
  const columns = header.map(value => value.trim().toLowerCase());
  if (!columns.includes("title")) throw new Error("The reading CSV needs a Title column.");
  const get = (row: string[], column: string) => (row[columns.indexOf(column)] || "").trim();
  const readings = new Map<string, Reading>();
  for (const row of rows) {
    const title = get(row, "title");
    if (!title) continue;
    const author = get(row, "author");
    const rawType = get(row, "type").toLowerCase();
    const types: Record<string, string> = {
      book: "Books", books: "Books", essay: "Essays", essays: "Essays",
      article: "Articles", articles: "Articles", webpage: "Web pages",
      "web page": "Web pages", "web pages": "Web pages", website: "Web pages",
      paper: "Papers", papers: "Papers", course: "Courses", courses: "Courses",
    };
    const type = types[rawType] || (rawType ? rawType[0].toUpperCase() + rawType.slice(1) : "Other");
    const id = readingID(title, author);
    readings.set(id, { id, title, author, type, url: safeURL(get(row, "link") || get(row, "url")) });
  }
  return [...readings.values()];
}

export function filterReadings(readings: Reading[], category: string, query: string): Reading[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return readings.filter(reading =>
    (category === "All" || reading.type === category) &&
    terms.every(term => `${reading.title} ${reading.author} ${reading.type}`.toLocaleLowerCase().includes(term))
  );
}

export async function fetchReadings(signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const response = await fetcher(LIBRARY_CSV, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Sheet unavailable");
  const csv = await response.text();
  return { csv, readings: readingsFromCSV(csv) };
}
