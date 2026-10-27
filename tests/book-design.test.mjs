import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bookDesign, wrapBookTitle } from "../src/lib/book-design.ts";
import { readingsFromCSV, mergeReadings } from "../src/lib/library.ts";

test("book bindings are stable when the sheet is filtered or reordered", async () => {
  const root = new URL("../public/library/", import.meta.url);
  const readings = mergeReadings(
    readingsFromCSV(await readFile(new URL("readings.csv", root), "utf8")),
    readingsFromCSV(await readFile(new URL("additions.csv", root), "utf8")),
  );
  const designs = new Map(
    readings.map((reading) => [reading.id, bookDesign(reading)]),
  );
  for (const reading of [...readings].reverse()) {
    assert.deepEqual(bookDesign(reading), designs.get(reading.id));
    const lines = wrapBookTitle(
      reading.title,
      (value) => value.length * 10,
      160,
    );
    assert.equal(lines.join(" "), reading.title.replace(/\s+/g, " ").trim());
    assert.ok(lines.every((line) => line.length > 0));
  }
});

test("cover wrapping retains long words and punctuation, and handles empty text", () => {
  assert.deepEqual(
    wrapBookTitle("", (value) => value.length, 12),
    [],
  );
  assert.deepEqual(
    wrapBookTitle(
      "A very-long-unbroken-title: Volume 1",
      (value) => value.length,
      10,
    ),
    ["A", "very-long-unbroken-title:", "Volume 1"],
  );
});
