import test from 'node:test';
import assert from 'node:assert/strict';
import { raisedLettering, bookPixelRatio } from '../src/components/library/book-relief.ts';

function mask(filled) {
  const width = 128, height = 128;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
    data[(y * width + x) * 4 + 3] = filled(x, y) ? 255 : 0;
  return { width, height, getContext: () => ({ getImageData: () => ({ data }) }) };
}

test('raised lettering preserves counters, has shallow relief, and faces outward', () => {
  const geometry = raisedLettering(mask((x, y) => x > 10 && x < 110 && y > 10 && y < 110 && !(x > 35 && x < 85 && y > 35 && y < 85)), 32, 32);
  const positions = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  let raised = 0;
  for (let i = 0; i < positions.count; i++) {
    const x = (positions.getX(i) + 16) * 4, y = (16 - positions.getY(i)) * 4;
    assert.ok(!(x > 38 && x < 82 && y > 38 && y < 82));
    const z = positions.getZ(i);
    assert.ok(z >= 0 && z < .651);
    if (z > .6) raised++;
    assert.ok(Number.isFinite(normal.getZ(i)));
    assert.ok(Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) < .001);
    if (z > .6) assert.ok(normal.getZ(i) > 0);
  }
  assert.ok(raised > 0);
  assert.ok(geometry.index.count / 3 < 200, "a simple ring must not be tessellated per pixel");
  for (let i = 0; i < geometry.index.count; i += 3) {
    const ids = [0,1,2].map(offset => geometry.index.array[i+offset]);
    if (ids.every(id => positions.getZ(id) > .6)) {
      const x = ids.reduce((sum,id) => sum + (positions.getX(id)+16)*4, 0)/3;
      const y = ids.reduce((sum,id) => sum + (16-positions.getY(id))*4, 0)/3;
      assert.ok(!(x > 38 && x < 82 && y > 38 && y < 82), "front triangles must not fill the counter");
    }
  }
  for (const index of geometry.index.array) assert.ok(index < positions.count);
  geometry.dispose();
  const blank = raisedLettering(mask(() => false), 32, 32);
  assert.equal(blank.index.count, 0);
  blank.dispose();
});

test('render resolution improves desktop and Retina detail within the pixel budget', () => {
  assert.equal(bookPixelRatio(1280, 720, 1), 1.5);
  assert.equal(bookPixelRatio(1280, 720, 2), 2);
  assert.equal(bookPixelRatio(390, 844, 3), 2.5);
  for (const [width, height, ratio] of [[1920,1080,2],[3840,2160,2],[7680,4320,3]]) {
    const scale = bookPixelRatio(width, height, ratio);
    assert.ok(width * height * scale * scale <= 8_000_001);
  }
});

test('an opened mobile book caps Retina fill rate without changing desktop quality', () => {
  assert.equal(bookPixelRatio(390, 844, 3, true), 1.5);
  assert.equal(bookPixelRatio(390, 844, 1, true), 1);
  assert.equal(bookPixelRatio(390, 844, 3), 2.5);
  for (const [width, height] of [[390,844], [844,390], [1024,1366]]) {
    const ratio = bookPixelRatio(width, height, 3, true);
    assert.ok(width * height * ratio * ratio <= 1_500_001);
  }
});
