import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { hardcoverBoard, hardcoverSpine, curveSpineLettering, spineBulge } from '../src/components/library/hardcover-geometry.ts';

function validMesh(geometry, triangleBudget) {
  for (const attribute of ['position', 'normal', 'uv']) {
    for (const value of geometry.getAttribute(attribute).array) assert.ok(Number.isFinite(value));
  }
  assert.ok((geometry.index?.count ?? geometry.getAttribute('position').count) / 3 < triangleBudget);
  geometry.computeBoundingBox();
}

test('hardcover boards have a recessed hinge, soft edges and two material draws', () => {
  const board = hardcoverBoard();
  validMesh(board, 1500);
  assert.equal(board.groups.length, 2);
  assert.deepEqual(board.groups.map(group => group.materialIndex), [0, 1]);
  assert.ok(Math.abs(board.boundingBox.max.x - 123) < .01);
  assert.ok(Math.abs(board.boundingBox.max.y - 182) < .01);
  assert.ok(Math.abs(board.boundingBox.max.z - 1.5) < .01);
  const positions = board.getAttribute('position');
  const trough = [];
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getX(i) + 111) < .05) trough.push(positions.getZ(i));
  }
  assert.ok(trough.length > 0);
  assert.ok(Math.max(...trough) < .6, 'the hinge must be recessed at least .9 below the cover');
  assert.equal(board.groups.reduce((sum, group) => sum + group.count, 0), board.index.count);
  board.dispose();
});

test('thin and thick bindings have rounded spines and lettering follows their surface', () => {
  for (const thickness of [27, 35, 48]) {
    const spine = hardcoverSpine(thickness);
    validMesh(spine, 250);
    assert.ok(Math.abs(spine.boundingBox.min.x + 126.5) < .01);
    assert.ok(Math.abs(spine.boundingBox.max.z - (thickness / 2 + 1)) < .01);
    const lettering = new THREE.PlaneGeometry(thickness * .8, 20, 4, 1);
    const old = Array.from(lettering.getAttribute('position').array);
    curveSpineLettering(lettering, thickness);
    const p = lettering.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      assert.ok(Math.abs(p.getZ(i) - old[i * 3 + 2] - spineBulge(p.getX(i), thickness)) < .00001);
      assert.ok(Number.isFinite(lettering.getAttribute('normal').getZ(i)));
    }
    spine.dispose(); lettering.dispose();
  }
});
