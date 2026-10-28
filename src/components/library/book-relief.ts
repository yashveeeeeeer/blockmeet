import * as THREE from "three";

// A shallow height field keeps the original font contours and counters. The
// bevel falls back into the board, rather than outlining text with a shadow.
export function raisedLettering(mask: HTMLCanvasElement, width: number, height: number) {
  const { width: columns, height: rows } = mask;
  const rgba = mask.getContext("2d")!.getImageData(0, 0, columns, rows).data;
  const count = columns * rows;
  const distance = new Float32Array(count);
  const pixelX = width / columns, pixelY = height / rows;
  for (let i = 0; i < count; i++) distance[i] = rgba[i * 4 + 3] > 100 ? 2 : 0;
  for (let y = 1; y < rows; y++) for (let x = 1; x < columns; x++) {
    const i = y * columns + x;
    if (distance[i]) distance[i] = Math.min(distance[i], distance[i - 1] + pixelX, distance[i - columns] + pixelY);
  }
  for (let y = rows - 2; y >= 0; y--) for (let x = columns - 2; x >= 0; x--) {
    const i = y * columns + x;
    if (distance[i]) distance[i] = Math.min(distance[i], distance[i + 1] + pixelX, distance[i + columns] + pixelY);
  }
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const vertices = new Int32Array(count).fill(-1);
  const vertex = (x: number, y: number) => {
    const i = y * columns + x;
    if (vertices[i] >= 0) return vertices[i];
    const t = Math.min(1, distance[i] / .55);
    const z = .65 * t * t * (3 - 2 * t);
    vertices[i] = positions.length / 3;
    positions.push((x + .5) * pixelX - width / 2, height / 2 - (y + .5) * pixelY, z);
    uvs.push((x + .5) / columns, 1 - (y + .5) / rows);
    return vertices[i];
  };
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < columns - 1; x++) {
    const i = y * columns + x;
    if (!(distance[i] || distance[i + 1] || distance[i + columns] || distance[i + columns + 1])) continue;
    const a = vertex(x, y), b = vertex(x + 1, y), c = vertex(x, y + 1), d = vertex(x + 1, y + 1);
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Supersample standard displays, retain Retina detail, and bound framebuffer cost.
export function bookPixelRatio(width: number, height: number, deviceRatio: number) {
  return Math.min(Math.max(1.5, deviceRatio), 2.5, Math.sqrt(8_000_000 / Math.max(1, width * height)));
}
