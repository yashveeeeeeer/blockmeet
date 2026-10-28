import type { Reading } from "./library";

const bindings = [
  ["#d7c9a7", "#263c35"],
  ["#315b50", "#f2dfb0"],
  ["#b8ced1", "#243b47"],
  ["#aa533e", "#fff0cf"],
  ["#243e53", "#e8d2a6"],
  ["#bda263", "#243c35"],
  ["#706980", "#fff0d5"],
  ["#d9d4c5", "#3c4540"],
];

export function bookDesign(reading: Reading) {
  const seed = parseInt(reading.id, 36) || 0;
  const [cloth, ink] = bindings[seed % bindings.length];
  return {
    cloth,
    ink,
    seed,
    finish: seed % 2 === 0 ? ("iridescent" as const) : ("gold" as const),
    thickness: reading.type === "Books" ? 35 + (seed % 14) : 27 + (seed % 9),
  };
}

// Wrap measured text instead of clipping long titles or splitting words arbitrarily.
export function wrapBookTitle(
  text: string,
  measure: (text: string) => number,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > width) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}
