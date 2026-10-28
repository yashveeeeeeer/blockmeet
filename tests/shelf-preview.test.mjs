import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shelfFingerprint, shelfPreview } from '../src/lib/shelf-preview.ts';

test('new or edited readings fall back instead of showing a stale preview', () => {
  const reading = { id: 'abc', title: 'Example', author: 'Author', type: 'Books', url: 'https://example.com' };
  const catalog = { abc: { fingerprint: shelfFingerprint(reading, 'covers/book.jpg'), image: 'shelf-previews/abc.webp' } };
  assert.equal(shelfPreview(catalog, reading, 'covers/book.jpg'), 'shelf-previews/abc.webp');
  for (const changed of [{ ...reading, title: 'New title' }, { ...reading, author: 'New author' }, { ...reading, type: 'Essays' }, { ...reading, id: 'new' }]) assert.equal(shelfPreview(catalog, changed, 'covers/book.jpg'), undefined);
  assert.equal(shelfPreview(catalog, reading, 'covers/new.jpg'), undefined);
  assert.equal(shelfPreview({}, reading), undefined);
  assert.equal(shelfPreview(catalog, { ...reading, url: 'https://example.org' }, 'covers/book.jpg'), 'shelf-previews/abc.webp');
  catalog.abc.revision = 'newrender';
  assert.equal(shelfPreview(catalog, reading, 'covers/book.jpg'), 'shelf-previews/abc.webp?v=newrender');
});

test('all cached shelf previews are small valid local WebP assets', () => {
  const base = new URL('../public/library/', import.meta.url);
  const catalog = JSON.parse(readFileSync(new URL('shelf-previews.json', base), 'utf8'));
  assert.ok(Object.keys(catalog).length >= 42);
  for (const [id, preview] of Object.entries(catalog)) {
    assert.equal(preview.image, `shelf-previews/${id}.webp`);
    assert.equal(JSON.parse(preview.fingerprint).length, 4);
    const path = new URL(preview.image, base);
    const buffer = readFileSync(path);
    assert.equal(preview.revision, createHash('sha256').update(buffer).digest('hex').slice(0, 12));
    assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
    assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
    assert.ok(statSync(path).size < 100_000, 'shelf previews must remain inexpensive to load');
  }
});
