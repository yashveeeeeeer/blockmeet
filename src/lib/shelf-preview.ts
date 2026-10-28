import type { Reading } from "./library";

export type ShelfPreviewCatalog = Record<string, { fingerprint: string; image: string; revision?: string }>;
export function shelfFingerprint(reading: Reading, cover?: string) {
  // Include the binding type and artwork so a changed sheet never shows an old cover.
  return JSON.stringify([reading.title, reading.author, reading.type, cover || ""]);
}
export function shelfPreview(catalog: ShelfPreviewCatalog, reading: Reading, cover?: string) {
  const record = catalog[reading.id];
  if (record?.fingerprint !== shelfFingerprint(reading, cover)) return undefined;
  return record.revision ? `${record.image}?v=${record.revision}` : record.image;
}
