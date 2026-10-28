import * as THREE from "three";
import { threadPaths } from "./thread-paths.ts";

// Three twisted filaments form each soft, slightly irregular satin stitch.
export function stitchedLettering(mask: HTMLCanvasElement, width: number, height: number) {
  const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
  const sides = 12, steps = 8;
  for (const stitch of threadPaths(mask, width, height)) {
    const base = positions.length / 3;
    const dx = stitch.x2 - stitch.x1, dy = stitch.y2 - stitch.y1;
    const length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
    const radius = .29 + stitch.shade * .045;
    for (let step = 0; step <= steps; step++) {
      const t = step / steps, arch = Math.sin(Math.PI * t);
      const bend = stitch.bend * arch;
      const x = stitch.x1 + dx * t + nx * bend, y = stitch.y1 + dy * t + ny * bend;
      const heightZ = .12 + (.68 + stitch.shade * .2) * Math.pow(arch, .6);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const twist = angle * 3 + t * length * 2.1;
        const fiber = radius * (1 + .18 * Math.cos(twist)) * (.7 + .3 * arch);
        const across = Math.cos(angle) * fiber;
        positions.push(x - width / 2 + nx * across, height / 2 - y - ny * across, heightZ + Math.sin(angle) * fiber);
        uvs.push(x / width, 1 - y / height);
        const tone = .7 + stitch.shade * .18 + .1 * Math.cos(twist);
        colors.push(tone, tone, tone);
        if (step < steps) {
          const a = base + step * sides + side, b = base + step * sides + (side + 1) % sides;
          indices.push(a, a + sides, b, b, a + sides, b + sides);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
