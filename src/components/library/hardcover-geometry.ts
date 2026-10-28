import * as THREE from "three";

// A single cross-section gives every binding the same physical construction.
// Units match the existing 246 × 364 cover and variable page-block thickness.
export function hingeDepth(x: number) {
  const distance = Math.abs(x + 111) / 4;
  return distance < 1 ? .95 * (1 + Math.cos(Math.PI * distance)) / 2 : 0;
}

export function spineBulge(z: number, thickness: number) {
  return 2.5 * Math.sqrt(Math.max(0, 1 - (z / (thickness / 2 + 1)) ** 2));
}

function extrudeProfile(points: THREE.Vector2[], bevel: number) {
  const shape = new THREE.Shape(points);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 364 - bevel * 2,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  // Profile (x,z), extrusion along the book's height, outward winding intact.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 182 - bevel, 0);
  return geometry;
}

let boardTemplate: THREE.BufferGeometry | undefined;

export function hardcoverBoard() {
  // The profile is identical for all readings. Build it once; independent
  // attribute buffers let each visible book dispose its GPU resources safely.
  boardTemplate ??= buildBoard();
  return boardTemplate.clone();
}

function buildBoard() {
  const points: THREE.Vector2[] = [];
  const add = (x: number, z: number) => points.push(new THREE.Vector2(x, z));
  // Bevel adds .5 around this core; final extents remain ±123, ±182, ±1.5.
  add(-122.5, 1);
  add(-116, 1);
  for (let i = 0; i <= 24; i++) {
    const x = -115 + i / 3;
    add(x, 1 - hingeDepth(x));
  }
  add(-106, 1);
  add(122.5, 1);
  add(122.5, -1);
  add(-122.5, -1);
  const geometry = extrudeProfile(points, .5);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const faces: number[][] = [[], []];
  geometry.clearGroups();
  for (let i = 0; i < position.count; i += 3) {
    // Printed artwork follows the recessed surface. Endpapers and board edges
    // retain the cloth material instead of stretching the cover over them.
    const printed = normal.getZ(i) > .15 && Math.abs(normal.getY(i)) < .95;
    faces[printed ? 1 : 0].push(i, i + 1, i + 2);
    for (let j = i; j < i + 3; j++) uv.setXY(j, (position.getX(j) + 123) / 246, (position.getY(j) + 182) / 364);
  }
  // Keep it to two draw calls regardless of how many groove/bevel segments
  // alternate between cloth and printed material.
  geometry.setIndex([...faces[0], ...faces[1]]);
  geometry.addGroup(0, faces[0].length, 0);
  geometry.addGroup(faces[0].length, faces[1].length, 1);
  return geometry;
}

export function hardcoverSpine(thickness: number) {
  const points: THREE.Vector2[] = [];
  const half = thickness / 2 + 1;
  for (let i = 0; i <= 40; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 40;
    const z = half * Math.sin(angle);
    points.push(new THREE.Vector2(-124 - spineBulge(z, thickness), z));
  }
  points.push(new THREE.Vector2(-121, half), new THREE.Vector2(-121, -half));
  const geometry = extrudeProfile(points, 0);
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  // Same projected UVs as the old spine; title proportions and orientation stay
  // stable. A rounded backing now provides the changing edge light naturally.
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getZ(i) / thickness + .5, (position.getY(i) + 182) / 364);
  geometry.clearGroups();
  return geometry;
}

export function curveSpineLettering(geometry: THREE.BufferGeometry, thickness: number) {
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) positions.setZ(i, positions.getZ(i) + spineBulge(positions.getX(i), thickness));
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}
