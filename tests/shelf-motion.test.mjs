import test from "node:test";
import assert from "node:assert/strict";
import { shelfProgress, interpolate, SHELF_MOTION_MS } from "../src/lib/shelf-motion.ts";

test("shelf motion settles exactly and never overshoots at different frame rates", () => {
  assert.equal(shelfProgress(-1), 0);
  assert.equal(shelfProgress(SHELF_MOTION_MS), 1);
  assert.equal(shelfProgress(SHELF_MOTION_MS * 3), 1);
  for (const fps of [30, 60, 120]) {
    let previous = 0;
    for (let ms = 0; ms <= SHELF_MOTION_MS; ms += 1000 / fps) {
      const progress = shelfProgress(ms);
      assert.ok(progress >= previous && progress <= 1);
      previous = progress;
    }
  }
});

test("reversing a partially open shelf continues from its current geometry", () => {
  const current = interpolate(142, 400, shelfProgress(320));
  assert.equal(interpolate(current, 142, shelfProgress(0)), current);
  assert.equal(interpolate(current, 142, shelfProgress(SHELF_MOTION_MS)), 142);
  assert.ok(interpolate(current, 142, shelfProgress(400)) < current);
});
