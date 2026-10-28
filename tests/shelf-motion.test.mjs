import test from "node:test";
import assert from "node:assert/strict";
import { shelfProgress, interpolate, SHELF_MOTION_MS, focusedBookRect, awayBookRect, bookPointerTilt } from "../src/lib/shelf-motion.ts";

test("pointer tilt is neutral at center and bounded consistently across viewports", () => {
  for (const [width, height] of [[390, 844], [1280, 720]]) {
    const center = bookPointerTilt(width / 2, height / 2, width, height);
    assert.equal(Math.abs(center.yaw) + Math.abs(center.pitch) + Math.abs(center.roll), 0);
    assert.deepEqual(bookPointerTilt(width, height, width, height), { yaw: 0.14, pitch: 0.09, roll: -0.02 });
    assert.deepEqual(bookPointerTilt(width * 2, height * 2, width, height), bookPointerTilt(width, height, width, height));
    assert.deepEqual(bookPointerTilt(0, 0, width, height), { yaw: -0.14, pitch: -0.09, roll: 0.02 });
  }
});

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

test("focused covers stay horizontally centered on desktop and mobile", () => {
  for (const [width, height] of [[390, 844], [1280, 720], [1440, 1000]]) {
    const rect = focusedBookRect(width, height);
    assert.equal(rect.left + rect.width / 2, width / 2);
    assert.ok(rect.left >= 36);
    assert.ok(rect.top > 0 && rect.top + rect.height < height - 100);
  }
});

test("every other book leaves the viewport in sheet order, including end selections", () => {
  const home = { left: 100, top: 200, width: 900, height: 142 };
  for (const selected of [0, 20, 41]) {
    for (let index = 0; index < 42; index++) {
      if (index === selected) continue;
      const rect = awayBookRect(home, index, selected, 844);
      assert.ok(index < selected ? rect.top + rect.height < -400 : rect.top > 1244);
      assert.deepEqual({ ...rect, top: home.top }, home);
    }
  }
});

test("reversing a partially open shelf continues from its current geometry", () => {
  const current = interpolate(142, 400, shelfProgress(320));
  assert.equal(interpolate(current, 142, shelfProgress(0)), current);
  assert.equal(interpolate(current, 142, shelfProgress(SHELF_MOTION_MS)), 142);
  assert.ok(interpolate(current, 142, shelfProgress(400)) < current);
});
