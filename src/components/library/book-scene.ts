import * as THREE from "three";
import type { CoverCatalog, Reading } from "../../lib/library";
import { bookDesign, wrapBookTitle } from "../../lib/book-design";

type Book = {
  group: THREE.Group;
  textures: THREE.Texture[];
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
};

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  return { element, ctx };
}

function texture(element: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function cloth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff09";
  for (let x = 0; x < width; x += 4) ctx.fillRect(x, 0, 1, height);
  ctx.fillStyle = "#00000009";
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
}

function makeBook(
  reading: Reading,
  cover: string | undefined,
  invalidate: () => void,
  isAlive: () => boolean,
): Book {
  const design = bookDesign(reading);
  const front = canvas(512, 768);
  cloth(front.ctx, 512, 768, design.cloth);
  front.ctx.fillStyle = design.ink;
  front.ctx.strokeStyle = design.ink;
  front.ctx.font = "17px sans-serif";
  front.ctx.fillText("ATHENAEUM", 46, 58);
  front.ctx.fillRect(46, 82, 420, 1);
  let fontSize = 56;
  let lines: string[] = [];
  do {
    front.ctx.font = `${fontSize}px Georgia, serif`;
    lines = wrapBookTitle(
      reading.title,
      (text) => front.ctx.measureText(text).width,
      410,
    );
    if (
      lines.length * fontSize * 1.15 <= 335 &&
      lines.every((line) => front.ctx.measureText(line).width <= 420)
    )
      break;
    fontSize -= 2;
  } while (fontSize > 16);
  lines.forEach((line, i) =>
    front.ctx.fillText(line, 46, 158 + i * fontSize * 1.15),
  );
  front.ctx.font = "21px Georgia, serif";
  wrapBookTitle(
    reading.author,
    (text) => front.ctx.measureText(text).width,
    410,
  ).forEach((line, i) => front.ctx.fillText(line, 46, 556 + i * 27));
  front.ctx.globalAlpha = 0.5;
  for (let i = 0; i < 6; i++) {
    front.ctx.beginPath();
    front.ctx.arc(390, 657, 24 + i * 10, Math.PI, Math.PI * 2);
    front.ctx.stroke();
  }
  front.ctx.globalAlpha = 1;
  front.ctx.fillRect(46, 704, 420, 1);
  front.ctx.font = "15px sans-serif";
  front.ctx.fillText(reading.type.toUpperCase(), 46, 737);
  const frontMap = texture(front.element);

  const spine = canvas(96, 1536);
  cloth(spine.ctx, 96, 1536, design.cloth);
  spine.ctx.translate(48, 768);
  spine.ctx.rotate(Math.PI / 2);
  spine.ctx.fillStyle = design.ink;
  spine.ctx.fillRect(-692, -28, 2, 56);
  spine.ctx.fillRect(690, -28, 2, 56);
  spine.ctx.textAlign = "center";
  spine.ctx.textBaseline = "middle";
  let spineSize = 60;
  do {
    spine.ctx.font = `${spineSize}px Georgia, serif`;
    if (spine.ctx.measureText(reading.title).width <= 1270) break;
    spineSize--;
  } while (spineSize > 17);
  spine.ctx.fillText(reading.title, 0, 0);
  const spineMap = texture(spine.element);

  const pages = canvas(128, 128);
  pages.ctx.fillStyle = "#e2dcc9";
  pages.ctx.fillRect(0, 0, 128, 128);
  pages.ctx.fillStyle = "#b8b19c";
  for (let y = 0; y < 128; y += 4) pages.ctx.fillRect(0, y, 128, 1);
  const pageMap = texture(pages.element);
  const paper = new THREE.MeshStandardMaterial({
    map: pageMap,
    roughness: 0.95,
  });
  const binding = new THREE.MeshStandardMaterial({
    color: design.cloth,
    roughness: 0.8,
  });
  const face = new THREE.MeshStandardMaterial({
    map: frontMap,
    roughness: 0.7,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    map: spineMap,
    roughness: 0.8,
  });
  const blockGeo = new THREE.BoxGeometry(238, 356, design.thickness - 5);
  const boardGeo = new THREE.BoxGeometry(246, 364, 3);
  const spineGeo = new THREE.BoxGeometry(4, 364, design.thickness);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(blockGeo, paper));
  const frontBoard = new THREE.Mesh(boardGeo, [
    binding,
    binding,
    binding,
    binding,
    face,
    binding,
  ]);
  frontBoard.position.z = design.thickness / 2;
  group.add(frontBoard);
  const backBoard = new THREE.Mesh(boardGeo, binding);
  backBoard.position.z = -design.thickness / 2;
  group.add(backBoard);
  const bindingMesh = new THREE.Mesh(spineGeo, [
    binding,
    spineMat,
    binding,
    binding,
    binding,
    binding,
  ]);
  bindingMesh.position.x = -122;
  group.add(bindingMesh);
  const book: Book = {
    group,
    textures: [frontMap, spineMap, pageMap],
    materials: [paper, binding, face, spineMat],
    geometries: [blockGeo, boardGeo, spineGeo],
  };

  // Only actual book covers are used. Essay previews become consistent title bindings.
  if (cover && reading.type === "Books") {
    const img = new Image();
    img.onload = () => {
      if (!isAlive() || !group.parent) return;
      front.ctx.drawImage(img, 0, 0, 512, 768);
      frontMap.needsUpdate = true;
      invalidate();
    };
    img.src = `${import.meta.env.BASE_URL}library/${cover}`;
  }
  return book;
}

function disposeBook(book: Book) {
  book.group.removeFromParent();
  book.textures.forEach((map) => map.dispose());
  book.materials.forEach((material) => material.dispose());
  book.geometries.forEach((geometry) => geometry.dispose());
}

// One canvas for the entire shelf. Off-screen books are evicted; idle scenes do not animate.
export function mountBookScene(
  root: HTMLElement,
  canvasElement: HTMLCanvasElement,
  readings: Reading[],
  covers: CoverCatalog,
  failed: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
  camera.position.z = 1600;
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const key = new THREE.DirectionalLight(0xfff2d9, 2.3);
  key.position.set(-500, 700, 1000);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9ded8, 0.7);
  fill.position.set(500, -200, 600);
  scene.add(fill);
  const books = new Map<string, Book>();
  const rows = [...root.querySelectorAll<HTMLElement>("[data-book-id]")];
  const byId = new Map(readings.map((reading) => [reading.id, reading]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let alive = true;
  let frame = 0;
  let width = 0;
  let height = 0;
  let animating = false;
  let lastFrame = performance.now();
  const target = new THREE.Quaternion();
  const schedule = () => {
    if (alive && !frame && !document.hidden) {
      if (!animating) lastFrame = performance.now();
      frame = requestAnimationFrame(draw);
    }
  };
  function draw() {
    frame = 0;
    if (!alive) return;
    const now = performance.now();
    const blend = 1 - Math.exp(-12 * Math.min((now - lastFrame) / 1000, 0.25));
    lastFrame = now;
    if (width !== innerWidth || height !== innerHeight) {
      width = innerWidth;
      height = innerHeight;
      renderer.setSize(width, height, false);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
    }
    let unsettled = false;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const id = row.dataset.bookId!;
      let book = books.get(id);
      if (rect.bottom < -180 || rect.top > height + 180) {
        if (book) book.group.visible = false;
        continue;
      }
      const expanded = row.dataset.expanded === "true";
      const hovered = row.matches(":hover") || row === document.activeElement;
      const turn = Number(row.dataset.turn || 0);
      const pitch = Number(row.dataset.pitch || 0);
      target.setFromEuler(
        expanded
          ? new THREE.Euler(0.07 + pitch, -0.3 + turn, -0.04, "YXZ")
          : new THREE.Euler(
              -0.08,
              1.34 - (hovered ? 0.12 : 0),
              Math.PI / 2,
              "ZXY",
            ),
      );
      if (!book) {
        const reading = byId.get(id)!;
        book = makeBook(reading, covers[id]?.images[0], schedule, () => alive);
        book.group.quaternion.copy(target);
        books.set(id, book);
        scene.add(book.group);
      }
      book.group.visible = true;
      if (reduceMotion.matches) book.group.quaternion.copy(target);
      else if (book.group.quaternion.angleTo(target) > 0.002) {
        book.group.quaternion.slerp(target, blend);
        unsettled = true;
      }
      const scale = expanded
        ? Math.min((rect.width - 55) / 285, (rect.height - 36) / 390, 1.32)
        : Math.min((rect.width - 64) / 364, 1.65);
      book.group.scale.setScalar(Math.max(0.3, scale));
      const offset = expanded
        ? 0
        : ((bookDesign(byId.get(id)!).seed % 5) - 2) * 4;
      book.group.position.set(
        rect.left + rect.width / 2 - width / 2 + offset,
        height / 2 -
          rect.top -
          rect.height / 2 +
          (hovered && !expanded ? 5 : 0),
        0,
      );
    }
    // Bound GPU memory even after browsing a very large sheet.
    for (const [id, book] of books)
      if (!book.group.visible && books.size > 12) {
        disposeBook(book);
        books.delete(id);
      }
    renderer.render(scene, camera);
    animating = unsettled;
    if (unsettled) schedule();
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(root);
  const mutations = new MutationObserver(schedule);
  mutations.observe(root, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-expanded", "data-turn", "data-pitch"],
  });
  const contextLost = (event: Event) => {
    event.preventDefault();
    failed();
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  document.addEventListener("visibilitychange", schedule);
  reduceMotion.addEventListener("change", schedule);
  root.addEventListener("pointerover", schedule);
  root.addEventListener("pointerout", schedule);
  root.addEventListener("focusin", schedule);
  root.addEventListener("focusout", schedule);
  canvasElement.addEventListener("webglcontextlost", contextLost);
  draw();
  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    mutations.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", schedule);
    reduceMotion.removeEventListener("change", schedule);
    root.removeEventListener("pointerover", schedule);
    root.removeEventListener("pointerout", schedule);
    root.removeEventListener("focusin", schedule);
    root.removeEventListener("focusout", schedule);
    canvasElement.removeEventListener("webglcontextlost", contextLost);
    books.forEach(disposeBook);
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
