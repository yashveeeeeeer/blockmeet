import { buildRelief, type ReliefPaint } from "./relief-data";

self.onmessage = (event: MessageEvent<ReliefPaint & { id: number }>) => {
  try {
    const { columns, rows, spine, runs } = event.data;
    const canvas = new OffscreenCanvas(columns, rows);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.scale(2, 2);
    if (spine) { ctx.translate(48, 768); ctx.rotate(Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; }
    ctx.fillStyle = "white";
    for (const run of runs) { ctx.font = run.font; ctx.fillText(run.text, run.x, run.y); }
    const pixels = ctx.getImageData(0, 0, columns, rows).data;
    const alpha = new Uint8Array(columns * rows);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
    const data = buildRelief({ ...event.data, alpha });
    self.postMessage({ id: event.data.id, data }, { transfer: [data.position.buffer, data.uv.buffer, data.normal.buffer, data.index.buffer] });
  } catch {
    self.postMessage({ id: event.data.id });
  }
};
