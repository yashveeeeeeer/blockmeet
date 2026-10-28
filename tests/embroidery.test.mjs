import test from "node:test";
import assert from "node:assert/strict";
import { stitchedLettering } from "../src/components/library/embroidery.ts";
import { threadPaths } from "../src/components/library/thread-paths.ts";

function mask(filled) {
  const width = 128, height = 128;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data[(y * width + x) * 4 + 3] = filled(x, y) ? 255 : 0;
  return { width, height, getContext: () => ({ getImageData: () => ({ data }) }) };
}

test("empty lettering produces no strands", () => {
  const geometry = stitchedLettering(mask(() => false), 128, 128);
  assert.equal(geometry.getAttribute("position").count, 0);
  assert.equal(geometry.index.count, 0);
  geometry.dispose();
});

test("satin bundles turn across horizontal and vertical letter strokes", () => {
  const vertical = threadPaths(mask((x, y) => x > 50 && x < 58 && y > 20 && y < 100), 128, 128);
  const horizontal = threadPaths(mask((x, y) => y > 50 && y < 58 && x > 20 && x < 100), 128, 128);
  const across = (threads) => threads.reduce((sum, s) => sum + Math.abs(s.x2 - s.x1), 0);
  const down = (threads) => threads.reduce((sum, s) => sum + Math.abs(s.y2 - s.y1), 0);
  assert.ok(across(vertical) > down(vertical) * 3);
  assert.ok(down(horizontal) > across(horizontal) * 3);
  assert.deepEqual(vertical, threadPaths(mask((x, y) => x > 50 && x < 58 && y > 20 && y < 100), 128, 128));
});

test("raised threads preserve separate glyphs and their counters", () => {
  // Two strokes separated by a broad counter: no strand may bridge the hole.
  const geometry = stitchedLettering(mask((x, y) =>
    y > 20 && y < 100 && ((x > 10 && x < 30) || (x > 80 && x < 100))), 128, 128);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  assert.ok(positions.count > 0);
  let raised = false;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + 64;
    assert.ok(x < 31 || x > 79, "threads must not cross the empty counter");
    assert.ok(Number.isFinite(positions.getZ(i)));
    raised ||= positions.getZ(i) > 1;
    assert.ok(Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) < 0.001);
    assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1);
  }
  assert.ok(raised, "stitches must have real relief above the printed surface");
  for (const index of geometry.index.array) assert.ok(index < positions.count);
  geometry.dispose();
});
