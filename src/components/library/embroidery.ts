import * as THREE from "three";

// Satin stitches follow the glyph mask. Each stitch is a raised, rounded strand
// with a slight twist, not a flat image or a blanket bevel on the cover.
export function stitchedLettering(mask: HTMLCanvasElement, width: number, height: number) {
  const ctx = mask.getContext("2d")!;
  const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const pixelX = width / mask.width;
  const pixelY = height / mask.height;
  const spacing = Math.max(3, Math.round(1.25 / pixelY));
  const radius = 0.39;
  const slope = 0.22;
  const sides = 8;
  const steps = 6;
  const stitch = (start: number, end: number, row: number) => {
    if ((end - start) * pixelX < 0.28) return;
    const base = positions.length / 3;
    const dx = (end - start) * pixelX;
    const dy = -(end - start) * slope * pixelY;
    const length = Math.hypot(dx, dy);
    const crossX = -dy / length;
    const crossY = dx / length;
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const x = start + (end - start) * t;
      const y = row + x * slope;
      const arch = 0.22 + 0.55 * Math.sin(Math.PI * t);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const fiber = radius * (1 + 0.12 * Math.cos(angle * 3 + t * Math.PI * 4));
        const across = Math.cos(angle) * fiber;
        positions.push(
          x * pixelX - width / 2 + crossX * across,
          height / 2 - y * pixelY + crossY * across,
          arch + Math.sin(angle) * fiber,
        );
        uvs.push(x / mask.width, 1 - y / mask.height);
        if (step < steps) {
          const a = base + step * sides + side;
          const b = base + step * sides + (side + 1) % sides;
          indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
    }
  };
  const filled = (x: number, row: number) => {
    const y = Math.round(row + x * slope);
    return y >= 0 && y < mask.height && pixels[(y * mask.width + x) * 4 + 3] > 160;
  };
  for (let row = -Math.ceil(mask.width * slope); row < mask.height; row += spacing) {
    let start = -1;
    for (let x = 0; x <= mask.width; x++) {
      const inside = x < mask.width && filled(x, row);
      if (inside && start < 0) start = x;
      if (!inside && start >= 0) {
        // Break broad strokes into individual stitch lengths.
        const limit = Math.max(2, Math.floor(7 / pixelX));
        for (let at = start; at < x; at += limit)
          stitch(at + 0.25, Math.min(x, at + limit) - 0.25, row);
        start = -1;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
