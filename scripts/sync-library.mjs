import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { LIBRARY_CSV, readingsFromCSV, safeURL } from "../src/lib/library.ts";

const root = new URL("../public/library/", import.meta.url);
await mkdir(new URL("covers/", root), { recursive: true });
const readJSON = async (name, fallback) => {
  try { return JSON.parse(await readFile(new URL(name, root), "utf8")); }
  catch { return fallback; }
};
const catalog = await readJSON("covers.json", {});
const overrides = await readJSON("cover-overrides.json", {});

async function request(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "BLOCKMeet-Library/1.0 (personal reading library)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

let csv;
try {
  csv = await (await request(LIBRARY_CSV)).text();
  readingsFromCSV(csv); // Validate before replacing the last good snapshot.
} catch (error) {
  console.warn(`Sheet unavailable (${error.message}); keeping the saved library.`);
  csv = await readFile(new URL("readings.csv", root), "utf8");
}
const readings = readingsFromCSV(csv);
const decode = value => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function metadataImages(html, base) {
  const candidates = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));
    if (/^(og:image(:url)?|twitter:image(:src)?)$/i.test(attrs.property || attrs.name || "") && attrs.content) {
      try { candidates.push(new URL(attrs.content, base).href); } catch { /* invalid metadata */ }
    }
  }
  return [...new Set(candidates)].filter(safeURL);
}

async function saveImage(url) {
  const response = await request(url);
  const mime = response.headers.get("content-type")?.split(";")[0];
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/svg+xml": "svg" }[mime];
  if (!ext) throw new Error("Not a supported cover image");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 1500 || bytes.length > 5_000_000) throw new Error("Empty or oversized image");
  if (ext === "svg" && /<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i.test(new TextDecoder().decode(bytes))) throw new Error("SVG contains active or external content");
  const name = `covers/${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${ext}`;
  await writeFile(new URL(name, root), bytes);
  return name;
}

const normalized = text => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function matches(reading, title, authors) {
  const wanted = normalized(reading.title).split(" ").filter(word => word.length > 2 && !["the", "and", "edition"].includes(word));
  const actual = normalized(title);
  const volume = reading.title.match(/\bvolume\s+(\d+)/i)?.[1];
  const edition = reading.title.match(/\b(\d+)(?:st|nd|rd|th)\s+edition/i)?.[1];
  if (volume && !new RegExp(`\\b(?:vol(?:ume)?\\.? ?${volume})\\b`, "i").test(title)) return false;
  if (edition && !new RegExp(`\\b${edition}(?:st|nd|rd|th)\\s+edition`, "i").test(title)) return false;
  const score = wanted.filter(word => actual.includes(word)).length / wanted.length;
  const surname = normalized(reading.author.split(/&|,/)[0]).split(" ").at(-1);
  return score >= 0.6 && (!surname || normalized(authors.join(" ")).includes(surname));
}

async function findCover(reading) {
  const existing = catalog[reading.id];
  const override = overrides[reading.id];
  if (override?.images.length === 0) {
    catalog[reading.id] = { title: reading.title, images: [], attempts: override.attempts };
    return;
  }
  // Successful covers are stable. Retry unresolved entries on later syncs.
  if (existing?.images.length && (!override || existing.attempts.some(attempt => attempt.source === "Verified cover"))) return;
  const entry = { title: reading.title, images: [], attempts: [] };
  const attempt = async (source, lookup) => {
    try {
      const urls = await lookup();
      for (const url of urls) {
        try {
          entry.images.push(await saveImage(url));
          entry.attempts.push({ source, result: `Found: ${url}` });
          return true;
        } catch { /* try the next actual image returned by the source */ }
      }
      entry.attempts.push({ source, result: "No usable cover found" });
    } catch (error) { entry.attempts.push({ source, result: error.message }); }
    return false;
  };

  let found = false;
  if (override?.images.length) found = await attempt("Verified cover", async () => override.images);
  // Use the exact edition's ISBN when the publisher includes it in the URL.
  const oreillyISBN = reading.url.match(/oreilly\.com\/library\/view\/[^/]+\/(\d{13})/)?.[1];
  if (!found && oreillyISBN) found = await attempt("Publisher ISBN cover", async () => [`https://learning.oreilly.com/library/cover/${oreillyISBN}/`]);
  let sourceHTML = "";
  if (!found && reading.url) found = await attempt("Source page metadata", async () => {
    const response = await request(reading.url);
    if (!response.headers.get("content-type")?.includes("text/html")) return [];
    sourceHTML = await response.text();
    return metadataImages(sourceHTML, response.url).filter(url => !/logo|avatar|portrait|profile|mountains-square/i.test(url));
  });

  if (!found && reading.url) found = await attempt("Source page cover illustrations", async () => {
    const images = sourceHTML.match(/<img\b[^>]*>/gi) || [];
    return images.filter(tag => /alt\s*=\s*["'][^"']*cover/i.test(tag)).flatMap(tag => {
      const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      try { return src ? [new URL(decode(src), reading.url).href] : []; } catch { return []; }
    });
  });

  if (!found && reading.type === "Books") found = await attempt("Google Books title and author search", async () => {
    const query = `intitle:${reading.title} inauthor:${reading.author.split("&")[0].trim()}`;
    const data = await (await request(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`)).json();
    return (data.items || []).filter(book => matches(reading, book.volumeInfo.title, book.volumeInfo.authors || []))
      .map(book => book.volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, "https:")).filter(Boolean);
  });

  if (!found && reading.type === "Books") found = await attempt("Open Library title and author search", async () => {
    const query = new URLSearchParams({ title: reading.title.split(":")[0].replace(/,?\s*\d+(st|nd|rd|th) Edition/i, ""), author: reading.author.split("&")[0].trim(), limit: "5", fields: "title,author_name,cover_i" });
    const data = await (await request(`https://openlibrary.org/search.json?${query}`)).json();
    return (data.docs || []).filter(book => book.cover_i && matches(reading, book.title, book.author_name || []))
      .map(book => `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg?default=false`);
  });

  catalog[reading.id] = entry;
  console.log(`${entry.images.length ? "Cover" : "Title page"}: ${reading.title} (${entry.attempts.length} sources)`);
}

// Keep external requests modest, while allowing a slow publisher to time out.
const queue = [...readings];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) await findCover(queue.shift());
}));
const activeCatalog = Object.fromEntries(readings.map(reading => [reading.id, catalog[reading.id]]));
await writeFile(new URL("covers.json", root), JSON.stringify(activeCatalog, null, 2) + "\n");
await writeFile(new URL("readings.csv", root), csv);
console.log(`Saved ${readings.length} readings; ${readings.filter(reading => activeCatalog[reading.id]?.images.length).length} illustrated covers.`);
