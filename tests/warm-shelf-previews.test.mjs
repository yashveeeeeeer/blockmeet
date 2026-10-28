import test from 'node:test';
import assert from 'node:assert/strict';
import { warmShelfPreviews } from '../src/lib/warm-shelf-previews.ts';

class ImageStub extends EventTarget {
  loading = 'lazy';
  fetchPriority = 'auto';
  complete = false;
  finish(type = 'load') { this.complete = true; this.dispatchEvent(new Event(type)); }
}

function idleQueue() {
  const queue = [];
  return {
    defer(task) { const job = { task, cancelled: false }; queue.push(job); return () => { job.cancelled = true; }; },
    flush() { for (const job of queue.splice(0)) if (!job.cancelled) job.task(); },
  };
}

test('background previews load two at a time without blocking first-screen images', () => {
  const first = new ImageStub(); first.loading = 'eager';
  const cached = new ImageStub(); cached.complete = true;
  const images = Array.from({ length: 4 }, () => new ImageStub());
  const tasks = idleQueue();
  const stop = warmShelfPreviews([first, cached, ...images], tasks.defer);
  assert.ok(images.every(image => image.loading === 'lazy'));
  tasks.flush();
  assert.deepEqual(images.map(image => image.loading), ['eager', 'eager', 'lazy', 'lazy']);
  assert.equal(first.fetchPriority, 'auto');
  assert.equal(cached.fetchPriority, 'auto');
  assert.equal(images[0].fetchPriority, 'low');
  images[0].finish(); tasks.flush();
  assert.deepEqual(images.map(image => image.loading), ['eager', 'eager', 'eager', 'lazy']);
  images[1].finish('error'); tasks.flush();
  assert.equal(images[3].loading, 'eager', 'a broken image must not stall the queue');
  stop();
});

test('cleanup cancels pending work and a large sheet has a finite warming budget', () => {
  const images = Array.from({ length: 80 }, () => new ImageStub());
  const tasks = idleQueue();
  const stop = warmShelfPreviews(images, tasks.defer);
  for (let i = 0; i < 40; i++) {
    tasks.flush();
    images.filter(image => image.loading === 'eager' && !image.complete).forEach(image => image.finish());
  }
  assert.equal(images.filter(image => image.loading === 'eager').length, 64);
  stop();
  const fresh = Array.from({ length: 4 }, () => new ImageStub());
  const cancel = warmShelfPreviews(fresh, tasks.defer);
  tasks.flush(); cancel();
  fresh[0].finish(); fresh[1].finish(); tasks.flush();
  assert.equal(fresh[2].loading, 'lazy');
  const cancelledBeforeStart = warmShelfPreviews(fresh, tasks.defer);
  cancelledBeforeStart(); tasks.flush();
  assert.equal(fresh[2].loading, 'lazy');
});
