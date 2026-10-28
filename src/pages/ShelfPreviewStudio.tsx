// Development-only asset studio: the mobile shelf reuses these exact 3D renders.
import { useState } from "react";
import * as THREE from "three";
import csv from "../../public/library/readings.csv?raw";
import additions from "../../public/library/additions.csv?raw";
import coverJSON from "../../public/library/covers.json?raw";
import { mergeReadings, readingsFromCSV, type CoverCatalog } from "../lib/library";
import { shelfFingerprint } from "../lib/shelf-preview";
import { disposeBook, foilStudio, makeBook } from "../components/library/book-scene";
import { reliefGeometry } from "../components/library/book-relief";
import { buildRelief, type ReliefPaint } from "../components/library/relief-data";

const readings = mergeReadings(readingsFromCSV(csv), readingsFromCSV(additions));
const covers: CoverCatalog = JSON.parse(coverJSON);

function paintRelief(paint: ReliefPaint) {
  const canvas = new OffscreenCanvas(paint.columns, paint.rows);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(2, 2);
  if (paint.spine) { ctx.translate(48, 768); ctx.rotate(Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; }
  ctx.fillStyle = "white";
  for (const run of paint.runs) { ctx.font = run.font; ctx.fillText(run.text, run.x, run.y); }
  const data = ctx.getImageData(0, 0, paint.columns, paint.rows).data;
  const alpha = new Uint8Array(paint.columns * paint.rows);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  return reliefGeometry(buildRelief({ ...paint, alpha }));
}

export default function ShelfPreviewStudio() {
  const [status, setStatus] = useState("Generate the saved collection as transparent WebP images. This tool is only available locally.");
  const [running, setRunning] = useState(false);
  const [images, setImages] = useState<{ title: string; image: string }[]>([]);
  async function generate() {
    setRunning(true);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(700, 210);
    renderer.setPixelRatio(1.5);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = .9;
    renderer.setClearColor(0, 0);
    const environment = foilStudio(renderer);
    const grain = new THREE.DataTexture(new Uint8Array([128,128,128,255]), 1, 1);
    grain.needsUpdate = true;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-350, 350, 105, -105, 1, 3000);
    camera.position.z = 1600;
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const key = new THREE.DirectionalLight(0xfff2d9, 2.3); key.position.set(-500, 700, 1000); scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9ded8, .7); fill.position.set(500, -200, 600); scene.add(fill);
    const gloss = new THREE.PointLight(0xfff6e8, 35000, 0, 2); gloss.position.set(-120, -30, 480); scene.add(gloss);
    const output: { id: string; fingerprint: string; image: string }[] = [];
    try {
      for (const [index, reading] of readings.entries()) {
        setStatus(`Rendering ${index + 1}/${readings.length}: ${reading.title}`);
        await new Promise(resolve => setTimeout(resolve, 0));
        const cover = covers[reading.id]?.images[0];
        const book = makeBook(reading, cover, () => {}, () => true, environment.texture, grain, (paint, ready) => { ready(paintRelief(paint)); return () => {}; });
        scene.add(book.group);
        try {
          book.group.rotation.set(-.08, 1.34, Math.PI / 2, "ZXY");
          book.group.scale.setScalar(1.65);
          await book.ready;
          await renderer.compileAsync(scene, camera);
          renderer.render(scene, camera);
          const image = renderer.domElement.toDataURL("image/webp", .9);
          output.push({ id: reading.id, fingerprint: shelfFingerprint(reading, cover), image });
          setImages(current => [...current, { title: reading.title, image }]);
        } finally { disposeBook(book); }
      }
      const result = await fetch(`${import.meta.env.BASE_URL}__shelf-previews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(output) });
      if (!result.ok) throw new Error(await result.text());
      setStatus(`Saved ${output.length} shelf previews to public/library. Ready to review on mobile.`);
    } catch (error) { setStatus(String(error)); }
    finally { renderer.dispose(); renderer.forceContextLoss(); environment.dispose(); grain.dispose(); setRunning(false); }
  }
  return <main style={{ padding: 30, background: "#111f1e", color: "#eee", minHeight: "100vh" }}>
    <h1>Mobile shelf preview studio</h1><p role="status">{status}</p>
    <button disabled={running} onClick={() => { setImages([]); void generate(); }}>Generate and save shelf previews</button>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 30 }}>{images.map(image => <figure key={image.title}><img src={image.image} alt={image.title} style={{ width: "100%", imageRendering: "auto" }} /><figcaption>{image.title}</figcaption></figure>)}</div>
  </main>;
}
