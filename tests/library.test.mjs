import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCSV, readingsFromCSV, filterReadings, safeURL, fetchReadings } from "../src/lib/library.ts";

test("Google Sheets CSV preserves quoted commas, multiline notes, BOM and escaped quotes", () => {
  assert.deepEqual(parseCSV('\uFEFFTitle,Notes\r\n"SQL, Volume 1","Line one\n""Line two"""\r\n'), [
    ["Title", "Notes"], ["SQL, Volume 1", 'Line one\n"Line two"'],
  ]);
  assert.throws(() => parseCSV('Title\n"unfinished'));
});

test("new rows and categories are supported without dates, statuses or unsafe links", () => {
  const csv = 'Added,Status,Title,Type,Author,Link\n2026-09-29,Done,First,Book,A,https://example.org\n,,Second,Web page,B,javascript:alert(1)\n,,Third,Course,C,\n,,,,,\n';
  const readings = readingsFromCSV(csv);
  assert.equal(readings.length, 3);
  assert.deepEqual(readings.map(row => row.type), ["Books", "Web pages", "Courses"]);
  assert.equal(readings[1].url, "");
  assert.equal("date" in readings[0], false);
  assert.equal("status" in readings[0], false);
  assert.equal(filterReadings(readings, "Books", "first a").length, 1);
  assert.equal(filterReadings(readings, "All", "not on shelf").length, 0);
  assert.equal(safeURL("data:text/html,<script>"), "");
  assert.throws(() => readingsFromCSV("<html>Sign in</html>"));
});

test("duplicate rows keep one card; same titles by different authors stay distinct", () => {
  const rows = readingsFromCSV("Title,Author\nBook,A\nBook,A\nBook,B\n");
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].id, rows[1].id);
});

test("live updates add new rows and reject failures before replacing the saved collection", async () => {
  const signal = new AbortController().signal;
  const current = readingsFromCSV("Title,Type\nExisting,Book");
  let displayed = current;
  for (const fetcher of [
    async () => new Response("Unavailable", { status: 503 }),
    async () => new Response("<html>Sign in</html>"),
    async () => { throw new TypeError("Network error"); },
  ]) {
    await assert.rejects(async () => { displayed = (await fetchReadings(signal, fetcher)).readings; });
    assert.equal(displayed, current);
  }
  const updated = await fetchReadings(signal, async (_url, options) => {
    assert.equal(options.signal, signal);
    assert.equal(options.cache, "no-store");
    return new Response("Title,Type\nExisting,Book\nNew reading,Web page");
  });
  assert.equal(updated.readings.length, 2);
  assert.equal(updated.readings[1].type, "Web pages");
  const empty = await fetchReadings(signal, async () => new Response("Title,Type\n"));
  assert.equal(empty.readings.length, 0);
});

test("saved reading list is complete and cover assets exist", async () => {
  const root = new URL("../public/library/", import.meta.url);
  const readings = readingsFromCSV(await readFile(new URL("readings.csv", root), "utf8"));
  assert.ok(Array.isArray(readings));
  const catalog = JSON.parse(await readFile(new URL("covers.json", root), "utf8"));
  for (const reading of readings) {
    const cover = catalog[reading.id];
    assert.ok(cover, `Missing catalog record for ${reading.title}`);
    if (reading.type === "Books" && !cover.images.length) assert.ok(cover.attempts.length >= 2, reading.title);
    for (const image of cover.images) assert.ok((await readFile(new URL(image, root))).length > 1500);
  }
});
