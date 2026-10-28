import { Shape, Path, Vector2, ExtrudeGeometry } from "three";

export type ReliefInput = { columns: number; rows: number; alpha: Uint8Array; width: number; height: number };
export type ReliefText = { text: string; font: string; x: number; y: number };
export type ReliefPaint = { columns: number; rows: number; width: number; height: number; runs: ReliefText[]; spine?: boolean };
type Edge = { end: number; direction: number };

// Sub-pixel simplification removes the staircase around curved raster glyphs.
// Keep the deviation below one texture pixel, including at the largest zoom.
function simplify(points: Vector2[]): Vector2[] {
  if (points.length < 4) return points;
  const first = points[0], last = points[points.length - 1];
  const dx = last.x - first.x, dy = last.y - first.y;
  const length = dx * dx + dy * dy;
  let furthest = 0, distance = .65 * .65;
  for (let i = 1; i < points.length - 1; i++) {
    const t = length ? Math.max(0, Math.min(1, ((points[i].x-first.x)*dx + (points[i].y-first.y)*dy) / length)) : 0;
    const d = (points[i].x-first.x-t*dx)**2 + (points[i].y-first.y-t*dy)**2;
    if (d > distance) { distance = d; furthest = i; }
  }
  return furthest ? [...simplify(points.slice(0, furthest + 1)).slice(0, -1), ...simplify(points.slice(furthest))] : [first, last];
}

// Trace the glyph outlines instead of making two triangles for every ink pixel.
// This keeps high-resolution type contours with far less geometry on the GPU.
export function buildRelief({ columns, rows, alpha, width, height }: ReliefInput) {
  const stride = columns + 1;
  const edges = new Map<number, Edge[]>();
  const filled = (x: number, y: number) => x >= 0 && x < columns && y >= 0 && y < rows && alpha[y * columns + x] > 100;
  const add = (x: number, y: number, endX: number, endY: number, direction: number) => {
    const start = y * stride + x;
    const edge = { end: endY * stride + endX, direction };
    const list = edges.get(start);
    if (list) list.push(edge); else edges.set(start, [edge]);
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    if (!filled(x, y)) continue;
    if (!filled(x, y - 1)) add(x,y,x+1,y,0);
    if (!filled(x + 1, y)) add(x+1,y,x+1,y+1,1);
    if (!filled(x, y + 1)) add(x+1,y+1,x,y+1,2);
    if (!filled(x - 1, y)) add(x,y+1,x,y,3);
  }
  const loops: { points: Vector2[]; area: number }[] = [];
  while (edges.size) {
    const start = edges.keys().next().value!;
    let current = start, previousDirection = -1;
    const points: Vector2[] = [];
    do {
      const choices = edges.get(current);
      if (!choices?.length) break;
      let choice = 0;
      if (choices.length > 1 && previousDirection >= 0) {
        const rank = (direction: number) => [1,0,3,2][(direction - previousDirection + 4) % 4];
        for (let i = 1; i < choices.length; i++) if (rank(choices[i].direction) < rank(choices[choice].direction)) choice = i;
      }
      const edge = choices.splice(choice, 1)[0];
      if (!choices.length) edges.delete(current);
      // Only corners are needed along a straight run of boundary pixels.
      if (edge.direction !== previousDirection) points.push(new Vector2(current % stride, Math.floor(current / stride)));
      previousDirection = edge.direction;
      current = edge.end;
    } while (current !== start);
    if (points.length < 3) continue;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i+1) % points.length];
      area += a.x * b.y - b.x * a.y;
    }
    const middle = Math.floor(points.length / 2);
    const contour = [...simplify(points.slice(0, middle + 1)).slice(0, -1), ...simplify([...points.slice(middle), points[0]]).slice(0, -1)];
    loops.push({ points: contour.length >= 3 ? contour : points, area });
  }
  const contains = (points: Vector2[], point: Vector2) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside = !inside;
    }
    return inside;
  };
  const world = (points: Vector2[]) => points.map(p => new Vector2(p.x / columns * width - width / 2, height / 2 - p.y / rows * height));
  const outlines = loops.filter(loop => loop.area > 0).map(loop => ({ ...loop, shape: new Shape(world(loop.points)) }));
  for (const hole of loops.filter(loop => loop.area < 0)) {
    const owner = outlines.filter(loop => contains(loop.points, hole.points[0])).sort((a,b) => a.area-b.area)[0];
    owner?.shape.holes.push(new Path(world(hole.points)));
  }
  const geometry = new ExtrudeGeometry(outlines.map(loop => loop.shape), {
    steps: 1, depth: .35, bevelEnabled: true, bevelThickness: .15, bevelSize: .08, bevelSegments: 1,
  });
  geometry.translate(0, 0, .15);
  const position = geometry.getAttribute("position").array as Float32Array;
  const normal = geometry.getAttribute("normal").array as Float32Array;
  const uv = new Float32Array(position.length / 3 * 2);
  const index = new Uint32Array(position.length / 3);
  for (let i = 0; i < index.length; i++) {
    position[i*3+2] = Math.max(0, position[i*3+2]);
    index[i] = i;
    uv[i*2] = position[i*3] / width + .5;
    uv[i*2+1] = position[i*3+1] / height + .5;
  }
  geometry.dispose();
  return { position, uv, index, normal };
}
