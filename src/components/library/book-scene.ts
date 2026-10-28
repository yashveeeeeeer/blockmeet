import * as THREE from "three";
import type { CoverCatalog, Reading } from "../../lib/library";
import { bookDesign, wrapBookTitle } from "../../lib/book-design";
import { bookPointerTilt } from "../../lib/shelf-motion";
import { raisedLettering, bookPixelRatio } from "./book-relief";

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
  map.anisotropy = 8;
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
  // Fine leather grain comes from the material, avoiding a regular printed
  // crosshatch that aliases when a cover is nearly edge-on.
}

// A small, locally generated studio reflection shared by all foil accents.
// Keeping it off the printed surfaces protects their colors and typography.
function foilStudio(renderer: THREE.WebGLRenderer) {
  const studio = canvas(512, 256);
  studio.ctx.fillStyle = "#696c73";
  studio.ctx.fillRect(0, 0, 512, 256);
  for (const [x, width] of [
    [60, 100],
    [310, 45],
  ]) {
    const light = studio.ctx.createLinearGradient(x, 0, x + width, 0);
    light.addColorStop(0, "#696c73");
    light.addColorStop(0.5, "#ffffff");
    light.addColorStop(1, "#696c73");
    studio.ctx.fillStyle = light;
    studio.ctx.fillRect(x, 0, width, 256);
  }
  const map = texture(studio.element);
  map.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromEquirectangular(map);
  generator.dispose();
  map.dispose();
  return environment;
}

function makeBook(
  reading: Reading,
  cover: string | undefined,
  invalidate: () => void,
  isAlive: () => boolean,
  foilEnvironment: THREE.Texture,
  leatherGrain: THREE.Texture,
): Book {
  const design = bookDesign(reading);
  const generated = !(cover && reading.type === "Books");
  const front = canvas(1024, 1536);
  front.ctx.scale(2, 2);
  const frontMask = canvas(1024, 1536);
  frontMask.ctx.scale(2, 2);
  frontMask.ctx.fillStyle = "white";
  const frontText = (text: string, x: number, y: number) => {
    front.ctx.fillText(text, x, y);
    frontMask.ctx.font = front.ctx.font;
    frontMask.ctx.fillText(text, x, y);
  };
  cloth(front.ctx, 512, 768, design.cloth);
  front.ctx.fillStyle = design.ink;
  front.ctx.strokeStyle = design.ink;
  front.ctx.font = "17px sans-serif";
  frontText("ATHENAEUM", 46, 58);
  front.ctx.fillRect(46, 82, 420, 2);
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
    frontText(line, 46, 158 + i * fontSize * 1.15),
  );
  front.ctx.font = "21px Georgia, serif";
  wrapBookTitle(
    reading.author,
    (text) => front.ctx.measureText(text).width,
    410,
  ).forEach((line, i) => frontText(line, 46, 556 + i * 27));
  front.ctx.fillRect(46, 704, 420, 2);
  front.ctx.font = "15px sans-serif";
  frontText(reading.type.toUpperCase(), 46, 737);
  const frontMap = texture(front.element);

  const spine = canvas(192, 3072);
  spine.ctx.scale(2, 2);
  const spineMask = canvas(192, 3072);
  spineMask.ctx.scale(2, 2);
  spineMask.ctx.translate(48, 768);
  spineMask.ctx.rotate(Math.PI / 2);
  spineMask.ctx.fillStyle = "white";
  spineMask.ctx.textAlign = "center";
  spineMask.ctx.textBaseline = "middle";
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
  spineMask.ctx.font = spine.ctx.font;
  spineMask.ctx.fillText(reading.title, 0, 0);
  const spineMap = texture(spine.element);

  const pages = canvas(512, 512);
  pages.ctx.fillStyle = "#e2dcc9";
  pages.ctx.fillRect(0, 0, 512, 512);
  pages.ctx.fillStyle = "#c9c2b0";
  for (let y = 0; y < 512; y += 4) pages.ctx.fillRect(0, y, 512, 1);
  const pageMap = texture(pages.element);
  const paper = new THREE.MeshStandardMaterial({
    map: pageMap,
    roughness: 0.95,
  });
  // Satin printed surfaces keep the ink readable even at the specular angle.
  // Reflective finishes live on separate, raised accents, not over the title.
  const coating = {
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    specularIntensity: 0.2,
    metalness: 0,
  };
  const binding = new THREE.MeshPhysicalMaterial({
    ...coating,
    color: design.cloth,
    roughness: 0.8,
    bumpMap: leatherGrain,
    bumpScale: .025,
  });
  const face = new THREE.MeshPhysicalMaterial({
    ...coating,
    map: frontMap,
    roughness: 0.82,
    bumpMap: generated ? leatherGrain : null,
    bumpScale: .025,
  });
  if (generated) {
    // A restrained, angle-dependent tint on the lower cloth and hinge. This
    // multiplies the printed color rather than adding white over the ink.
    face.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float phase = vMapUv.x * 9.0 + vMapUv.y * 5.0 + normal.x * 5.0 + normal.y * 3.0;
        vec3 filmTint = ${design.finish === "iridescent"
          ? "0.77 + 0.23 * cos(phase + vec3(0.0, 2.1, 4.2))"
          : "mix(vec3(0.76, 0.55, 0.25), vec3(1.0, 0.92, 0.68), 0.5 + 0.5 * cos(phase))"};
        float filmArea = max(1.0 - smoothstep(0.22, 0.43, vMapUv.y), 1.0 - smoothstep(0.05, 0.18, vMapUv.x));
        diffuseColor.rgb *= mix(vec3(1.0), filmTint, filmArea * 0.7);`,
      );
    };
    face.customProgramCacheKey = () => `cloth-film-${design.finish}`;
  }
  const spineMat = new THREE.MeshPhysicalMaterial({
    ...coating,
    map: spineMap,
    roughness: 0.8,
    bumpMap: leatherGrain,
    bumpScale: .025,
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
  const film = canvas(32, 256);
  const filmGradient = film.ctx.createLinearGradient(0, 0, 32, 256);
  filmGradient.addColorStop(0, "#181818");
  filmGradient.addColorStop(0.45, "#cccccc");
  filmGradient.addColorStop(1, "#444444");
  film.ctx.fillStyle = filmGradient;
  film.ctx.fillRect(0, 0, 32, 256);
  const filmMap = new THREE.CanvasTexture(film.element); // thickness data, not sRGB
  const rainbow = design.finish === "iridescent";
  const foilColor = canvas(32, 256);
  const foilGradient = foilColor.ctx.createLinearGradient(0, 0, 32, 256);
  const foilColors = rainbow
    ? ["#82dcd5", "#e2acd5", "#b7b4ee", "#f1d795", "#87d5d2"]
    : ["#936229", "#ead28a", "#b98535", "#f2dc9a", "#a77831"];
  foilColors.forEach((color, i) => foilGradient.addColorStop(i / 4, color));
  foilColor.ctx.fillStyle = foilGradient;
  foilColor.ctx.fillRect(0, 0, 32, 256);
  const foilMap = texture(foilColor.element);
  const foil = new THREE.MeshPhysicalMaterial({
    map: foilMap,
    metalness: 0.72,
    roughness: 0.3,
    clearcoat: 0.12,
    clearcoatRoughness: 0.4,
    iridescence: rainbow ? 1 : 0,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [180, 650],
    iridescenceThicknessMap: filmMap,
    envMap: foilEnvironment,
    envMapIntensity: 1.1,
  });
  // Rounded raised ribs along the hinge catch narrow glints as the book turns.
  const ribGeo = new THREE.CylinderGeometry(1.5, 1.5, 348, 16);
  const ribbonGeo = new THREE.BoxGeometry(7, 348, 0.7);
  const frontZ = design.thickness / 2 + 1.5;
  const lettering = new THREE.MeshPhysicalMaterial({
    color: design.ink,
    metalness: 0,
    roughness: .9,
    clearcoat: 0,
    specularIntensity: .12,
    bumpMap: leatherGrain,
    bumpScale: .035,
  });
  const reliefGeometries: THREE.BufferGeometry[] = [];
  if (generated) {
    const geometry = raisedLettering(frontMask.element, 246, 364);
    const relief = new THREE.Mesh(geometry, lettering);
    relief.position.z = frontZ - .02;
    group.add(relief);
    reliefGeometries.push(geometry);
  }
  const spineRelief = raisedLettering(spineMask.element, design.thickness, 364);
  const spineLetters = new THREE.Mesh(spineRelief, lettering);
  spineLetters.rotation.y = -Math.PI / 2;
  spineLetters.position.x = -123.98;
  group.add(spineLetters);
  reliefGeometries.push(spineRelief);
  for (const x of [-118, -109]) {
    const rib = new THREE.Mesh(ribGeo, foil);
    rib.position.set(x, 0, frontZ);
    group.add(rib);
  }
  const ribbon = new THREE.Mesh(ribbonGeo, foil);
  ribbon.position.set(-113.5, 0, frontZ + 0.2);
  group.add(ribbon);
  const ornamentGeometries: THREE.BufferGeometry[] = [];
  // Embossed semicircles sit below the text on our generated title bindings.
  // Publisher artwork retains only the narrow hinge trim at its outer margin.
  if (!(cover && reading.type === "Books")) {
    for (let i = 0; i < 6; i++) {
      const arcGeo = new THREE.TorusGeometry(12 + i * 5, 1.2, 12, 96, Math.PI);
      const arc = new THREE.Mesh(arcGeo, foil);
      arc.position.set(64, -129, frontZ + 0.2);
      group.add(arc);
      ornamentGeometries.push(arcGeo);
    }
  }
  const book: Book = {
    group,
    textures: [frontMap, spineMap, pageMap, filmMap, foilMap],
    materials: [paper, binding, face, spineMat, foil, lettering],
    geometries: [
      blockGeo,
      boardGeo,
      spineGeo,
      ribGeo,
      ribbonGeo,
      ...ornamentGeometries,
      ...reliefGeometries,
    ],
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
  renderer.setPixelRatio(bookPixelRatio(innerWidth, innerHeight, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Roll off bright reflections instead of clipping pale cover artwork to white.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.setClearColor(0x000000, 0);
  const foilEnvironment = foilStudio(renderer);
  const grain = canvas(256, 256);
  const grainData = grain.ctx.createImageData(256, 256);
  let noise = 9217;
  for (let i = 0; i < 256 * 256; i++) {
    noise ^= noise << 13; noise ^= noise >>> 17; noise ^= noise << 5;
    const value = 120 + ((noise >>> 0) % 17);
    grainData.data.set([value, value, value, 255], i * 4);
  }
  grain.ctx.putImageData(grainData, 0, 0);
  const leatherGrain = new THREE.CanvasTexture(grain.element);
  leatherGrain.wrapS = leatherGrain.wrapT = THREE.RepeatWrapping;
  leatherGrain.repeat.set(4, 6);
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
  // A nearby studio light produces a broad, moving highlight across the flat
  // boards. Directional light alone gives an almost uniform reflection.
  const gloss = new THREE.PointLight(0xfff6e8, 35000, 0, 2);
  gloss.position.set(-120, -30, 480);
  scene.add(gloss);
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
  const openRotation = new THREE.Quaternion();
  let pointerBook: string | null = null;
  let pointerTilt = { yaw: 0, pitch: 0, roll: 0 };
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
    const pixelRatio = bookPixelRatio(innerWidth, innerHeight, window.devicePixelRatio);
    if (width !== innerWidth || height !== innerHeight || renderer.getPixelRatio() !== pixelRatio) {
      width = innerWidth;
      height = innerHeight;
      renderer.setPixelRatio(pixelRatio);
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
      const open = Number(row.dataset.openAmount ?? (expanded ? 1 : 0));
      const transitioning = open > 0 && open < 1;
      const hovered = row.matches(":hover") || row === document.activeElement;
      const turn = Number(row.dataset.turn || 0);
      const pitch = Number(row.dataset.pitch || 0);
      target.setFromEuler(new THREE.Euler(
        -0.08, 1.34 - (hovered ? 0.12 : 0), Math.PI / 2, "ZXY",
      ));
      // Pointer tilt is additive: it never changes the user's drag/keyboard pose.
      const tilt = id === pointerBook && !reduceMotion.matches ? pointerTilt : { yaw: 0, pitch: 0, roll: 0 };
      openRotation.setFromEuler(new THREE.Euler(
        0.07 + pitch + tilt.pitch,
        -0.3 + turn + tilt.yaw,
        -0.04 + tilt.roll,
        "YXZ",
      ));
      target.slerp(openRotation, open);
      if (!book) {
        const reading = byId.get(id)!;
        book = makeBook(
          reading,
          covers[id]?.images[0],
          schedule,
          () => alive,
          foilEnvironment.texture,
          leatherGrain,
        );
        const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        book.textures.forEach((map) => { map.anisotropy = anisotropy; });
        book.group.quaternion.copy(target);
        books.set(id, book);
        scene.add(book.group);
      }
      book.group.visible = true;
      // Layout, turn, and scale use the same progress. Only direct manipulation
      // and hover use damping, so they stay responsive after the shelf settles.
      if (reduceMotion.matches || transitioning) book.group.quaternion.copy(target);
      else if (book.group.quaternion.angleTo(target) > 0.002) {
        book.group.quaternion.slerp(target, blend);
        unsettled = true;
      }
      const closedScale = Math.min((rect.width - 64) / 364, 1.65);
      const openHeight = transitioning ? Number(row.dataset.openHeight || rect.height) : rect.height;
      const openScale = Math.min((rect.width - 24) / 285, (openHeight - 16) / 390, 1.65);
      const scale = THREE.MathUtils.lerp(closedScale, openScale, open);
      book.group.scale.setScalar(Math.max(0.3, scale));
      const offset = ((bookDesign(byId.get(id)!).seed % 5) - 2) * 4 * (1 - open);
      book.group.position.set(
        rect.left + rect.width / 2 - width / 2 + offset,
        height / 2 -
          rect.top -
          rect.height / 2 +
          (hovered ? 5 * (1 - open) : 0),
        // Clear adjacent volumes while the diagonal cover spans two shelf rows.
        Math.sin(Math.PI * open) * 600,
      );
    }
    // Bound GPU memory even after browsing a very large sheet.
    for (const [id, book] of books)
      if (!book.group.visible && books.size > 6) {
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
    attributeFilter: ["data-expanded", "data-open-amount", "data-turn", "data-pitch"],
  });
  const contextLost = (event: Event) => {
    event.preventDefault();
    failed();
  };
  const resetPointer = () => {
    if (pointerBook === null) return;
    pointerBook = null;
    pointerTilt = { yaw: 0, pitch: 0, roll: 0 };
    schedule();
  };
  const followPointer = (event: PointerEvent) => {
    // Touch and pen retain direct manipulation; mouse dragging takes precedence.
    if (event.pointerType !== "mouse" || reduceMotion.matches) {
      resetPointer();
      return;
    }
    if (event.buttons !== 0) return;
    const selected = rows.find((row) => row.dataset.expanded === "true");
    if (!selected) { resetPointer(); return; }
    // Let the opening choreography finish before adding pointer-driven motion.
    if (Number(selected.dataset.openAmount) < 1) return;
    pointerBook = selected.dataset.bookId!;
    pointerTilt = bookPointerTilt(event.clientX, event.clientY, innerWidth, innerHeight);
    schedule();
  };
  const leaveWindow = (event: PointerEvent) => {
    if (!event.relatedTarget) resetPointer();
  };
  window.addEventListener("pointermove", followPointer, { passive: true });
  window.addEventListener("pointerout", leaveWindow);
  window.addEventListener("blur", resetPointer);
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
    window.removeEventListener("pointermove", followPointer);
    window.removeEventListener("pointerout", leaveWindow);
    window.removeEventListener("blur", resetPointer);
    books.forEach(disposeBook);
    foilEnvironment.dispose();
    leatherGrain.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
