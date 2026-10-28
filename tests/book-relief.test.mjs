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
    assert.ok(Number.isFinite(normal.getZ(i)) && normal.getZ(i) > 0);
  }
  assert.ok(raised > 0);
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
