export type Stitch = { x1: number; y1: number; x2: number; y2: number; bend: number; shade: number };

// Follow the local direction across each letter stroke, so stitches turn around
// bowls and serifs instead of laying a single diagonal pattern over every glyph.
export function threadPaths(mask: HTMLCanvasElement, width: number, height: number, spacing = .62): Stitch[] {
  const pixels = mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height).data;
  const scaleX = mask.width / width, scaleY = mask.height / height;
  const inside = (x: number, y: number) => {
    const px = Math.floor(x * scaleX), py = Math.floor(y * scaleY);
    return px >= 0 && px < mask.width && py >= 0 && py < mask.height && pixels[(py * mask.width + px) * 4 + 3] > 160;
  };
  const gridWidth = Math.ceil(width / spacing);
  const occupied = new Uint8Array(gridWidth * Math.ceil(height / spacing));
  // Average edge directions locally. A nearest-edge ray alone produces tiny
  // stitches at glyph boundaries; this tensor keeps a whole bundle aligned.
  const sample = .5, columns = Math.ceil(width / sample) + 1, rows = Math.ceil(height / sample) + 1;
  const xx = new Float32Array(columns * rows), xy = new Float32Array(columns * rows), yy = new Float32Array(columns * rows);
  for (let y = 1; y < rows; y++) {
    let sumXX = 0, sumXY = 0, sumYY = 0;
    for (let x = 1; x < columns; x++) {
      const px = x * sample, py = y * sample;
      const gx = +inside(px + sample, py) - +inside(px - sample, py);
      const gy = +inside(px, py + sample) - +inside(px, py - sample);
      sumXX += gx * gx; sumXY += gx * gy; sumYY += gy * gy;
      const i = y * columns + x;
      xx[i] = xx[i - columns] + sumXX;
      xy[i] = xy[i - columns] + sumXY;
      yy[i] = yy[i - columns] + sumYY;
    }
  }
  const directionAt = (x: number, y: number) => {
    const left = Math.max(0, Math.floor((x - 5) / sample)), right = Math.min(columns - 1, Math.ceil((x + 5) / sample));
    const top = Math.max(0, Math.floor((y - 5) / sample)), bottom = Math.min(rows - 1, Math.ceil((y + 5) / sample));
    const sum = (data: Float32Array) => data[bottom * columns + right] - data[top * columns + right] - data[bottom * columns + left] + data[top * columns + left];
    return .5 * Math.atan2(2 * sum(xy), sum(xx) - sum(yy));
  };
  const cell = (x: number, y: number) => Math.floor(y / spacing) * gridWidth + Math.floor(x / spacing);
  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const ray = (x: number, y: number, dx: number, dy: number) => {
    let length = 0;
    while (length < 12 && inside(x + dx * (length + .25), y + dy * (length + .25))) length += .25;
    return length;
  };
  const result: Stitch[] = [];
  for (let y = spacing; y < height; y += spacing) {
    for (let x = spacing; x < width; x += spacing) {
      const px = x + (noise(x, y) - .5) * .28;
      const py = y + (noise(y, x) - .5) * .28;
      if (!inside(px, py) || occupied[cell(px, py)]) continue;
      const angle = directionAt(px, py) + (noise(px, py) - .5) * .045;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const before = ray(px, py, -dx, -dy), after = ray(px, py, dx, dy);
      const best = before + after;
      if (best < .5) continue;
      const x1 = px - dx * before, y1 = py - dy * before;
      const x2 = px + dx * after, y2 = py + dy * after;
      for (let along = 0; along <= best; along += .2) {
        for (const offset of [-spacing * .35, 0, spacing * .35]) {
          const cx = x1 + dx * along - dy * offset, cy = y1 + dy * along + dx * offset;
          if (cx >= 0 && cx < width && cy >= 0 && cy < height) occupied[cell(cx, cy)] = 1;
        }
      }
      result.push({ x1, y1, x2, y2, bend: (noise(px, py) - .5) * .26, shade: noise(py, px) });
    }
  }
  return result;
}
