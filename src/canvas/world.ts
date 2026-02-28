import { PAL } from "./palette";
import {
  drawSun,
  drawMoon,
  drawCloud,
  drawStar,
  drawBird,
  drawPassengerPlane,
  drawDragon,
  drawWitch,
  drawCat,
  drawDog,
  drawOakTree,
  drawPineTree,
  drawBirchTree,
  drawFlowerBush,
  drawShop,
  drawGrassBlock,
  drawWaterTile,
  drawStreetLight,
  drawLightGlow,
  drawHorseWithRider,
  drawNPC,
} from "./sprites";
import { InputState, createInputState, attachInputHandlers } from "./input";

const MAX_PARTICLES = 60;
const GRID_SIZE = 32;
const GROUND_ROW_COUNT = 4;
const WATER_ROW_COUNT = 2;
const NPC_COUNT = 6;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface CloudData {
  x: number;
  y: number;
  speed: number;
  scale: number;
}

interface StarData {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  phase: number;
}

interface BirdData {
  x: number;
  y: number;
  speed: number;
  flapSpeed: number;
  flapPhase: number;
  scale: number;
}

interface AirplaneData {
  x: number;
  y: number;
  speed: number;
  scale: number;
  bobPhase: number;
}

interface ShopData {
  x: number;
  variant: number;
  scale: number;
  centerX: number;
}

interface NPCData {
  x: number;
  speed: number;
  facing: number;
  walkFrame: number;
  scale: number;
  skinColor: string;
  shirtColor: string;
  targetX: number;
  idleTimer: number;
  atShop: boolean;
}

interface DragonData {
  x: number;
  y: number;
  speed: number;
  facing: number;
  flapPhase: number;
  flapSpeed: number;
  scale: number;
  active: boolean;
  cooldown: number;
}

interface WitchData {
  x: number;
  y: number;
  speed: number;
  facing: number;
  scale: number;
  active: boolean;
  cooldown: number;
  state: "flying" | "descending" | "landed" | "ascending";
  targetShopX: number;
  landY: number;
  idleTimer: number;
  flyY: number;
}

interface CatData {
  x: number;
  y: number;
  scale: number;
  color: string;
  sleeping: boolean;
  facing: number;
}

interface DogData {
  x: number;
  y: number;
  scale: number;
  color: string;
  facing: number;
  tailPhase: number;
  speed: number;
  idleTimer: number;
  followOffset: number;
  followTargetIdx: number;
  retargetCooldown: number;
}

interface TreeData {
  x: number;
  scale: number;
  type: "oak" | "pine" | "birch" | "bush";
}

interface StreetLightData {
  x: number;
  scale: number;
}

interface HorseRiderData {
  x: number;
  speed: number;
  facing: number;
  walkFrame: number;
  scale: number;
  horseColor: string;
  riderShirt: string;
  riderSkin: string;
  targetX: number;
  idleTimer: number;
}

export interface WorldState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  input: InputState;
  particles: Particle[];
  clouds: CloudData[];
  stars: StarData[];
  birds: BirdData[];
  airplanes: AirplaneData[];
  trees: TreeData[];
  shops: ShopData[];
  npcs: NPCData[];
  dragon: DragonData;
  witches: WitchData[];
  cats: CatData[];
  dogs: DogData[];
  horses: HorseRiderData[];
  streetLights: StreetLightData[];
  groundSpeckles: { row: number; col: number; dx: number; dy: number }[];
  groundY: number;
  scrollY: number;
  nightMode: boolean;
  performanceMode: boolean;
  soundEnabled: boolean;
  animFrame: number;
  detach: (() => void) | null;
  musicPlayer: MusicPlayer | null;
  onShopClick?: (variant: number) => void;
}

// ── MP3 MUSIC PLAYER ─────────────────────────────────────────────

const TRACK_URLS = [
  import.meta.env.BASE_URL + "music/1.mp3",
  import.meta.env.BASE_URL + "music/2.mp3",
];

const FADE_MS = 3000;
const TARGET_VOL = 0.5;
const FADE_STEP_MS = 50;

class MusicPlayer {
  private tracks: string[];
  private currentIdx: number;
  private activeAudio: HTMLAudioElement | null;
  private fadingOut: HTMLAudioElement | null;
  private fadeInterval: number | null;
  playing: boolean;

  constructor() {
    this.tracks = [...TRACK_URLS];
    this.currentIdx = Math.floor(Math.random() * this.tracks.length);
    this.activeAudio = null;
    this.fadingOut = null;
    this.fadeInterval = null;
    this.playing = false;
  }

  private createAudio(src: string, volume: number): HTMLAudioElement {
    const a = new Audio();
    a.volume = volume;
    a.preload = "auto";
    a.src = src;
    return a;
  }

  private shuffle() {
    let next = Math.floor(Math.random() * this.tracks.length);
    while (next === this.currentIdx && this.tracks.length > 1) {
      next = Math.floor(Math.random() * this.tracks.length);
    }
    this.currentIdx = next;
  }

  private crossfadeToNext() {
    if (!this.playing) return;
    this.shuffle();

    const outgoing = this.activeAudio;
    const incoming = this.createAudio(this.tracks[this.currentIdx], 0);

    incoming.addEventListener("ended", () => this.crossfadeToNext(), { once: true });
    incoming.play().catch(() => {});

    this.activeAudio = incoming;
    this.fadingOut = outgoing;

    if (this.fadeInterval != null) clearInterval(this.fadeInterval);

    const steps = FADE_MS / FADE_STEP_MS;
    const fadeOutStep = outgoing ? outgoing.volume / steps : 0;
    const fadeInStep = TARGET_VOL / steps;
    let tick = 0;

    this.fadeInterval = window.setInterval(() => {
      tick++;
      if (outgoing && outgoing.volume > fadeOutStep) {
        outgoing.volume = Math.max(0, outgoing.volume - fadeOutStep);
      }
      if (incoming.volume < TARGET_VOL) {
        incoming.volume = Math.min(TARGET_VOL, incoming.volume + fadeInStep);
      }
      if (tick >= steps) {
        if (this.fadeInterval != null) clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (outgoing) {
          outgoing.pause();
          outgoing.removeAttribute("src");
        }
        this.fadingOut = null;
        incoming.volume = TARGET_VOL;
      }
    }, FADE_STEP_MS);
  }

  start() {
    if (this.playing) return;
    if (!this.activeAudio) {
      const a = this.createAudio(this.tracks[this.currentIdx], TARGET_VOL);
      a.addEventListener("ended", () => this.crossfadeToNext(), { once: true });
      this.activeAudio = a;
    }
    this.activeAudio.play().then(() => {
      this.playing = true;
    }).catch(() => {});
  }

  stop() {
    this.playing = false;
    if (this.fadeInterval != null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
    }
    if (this.fadingOut) {
      this.fadingOut.pause();
      this.fadingOut.removeAttribute("src");
      this.fadingOut = null;
    }
  }

  destroy() {
    this.stop();
    if (this.activeAudio) {
      this.activeAudio.removeAttribute("src");
      this.activeAudio = null;
    }
  }
}

// ── HELPERS ──────────────────────────────────────────────────────

const NPC_SKIN_COLORS = ["#ffcc99", "#e8b88a", "#c68e6a", "#8d5524", "#ffdbac"];
const NPC_SHIRT_COLORS = [
  "#e94560", "#4ecca3", "#5b86e5", "#f5c542",
  "#a855f7", "#ff6b35", "#06b6d4", "#84cc16",
];

const CAT_COLORS = ["#4a4a4a", "#e8a050", "#f5f5f0", "#8a6a3a", "#c0c0c0"];
const DOG_COLORS = ["#c48440", "#8a6a3a", "#f0e0c0", "#5a4a3a", "#d4a060"];

export function isNightTime(): boolean {
  const h = new Date().getHours();
  return h < 6 || h >= 19;
}

function createClouds(width: number, height: number): CloudData[] {
  const clouds: CloudData[] = [];
  const count = Math.max(4, Math.floor(width / 300));
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: Math.random() * width * 1.5 - width * 0.25,
      y: 40 + Math.random() * (height * 0.25),
      speed: 0.2 + Math.random() * 0.4,
      scale: 0.8 + Math.random() * 1.2,
    });
  }
  return clouds;
}

function createStars(width: number, height: number): StarData[] {
  const stars: StarData[] = [];
  const count = Math.floor((width * height) / 8000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.6,
      brightness: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.001 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createBirds(width: number, height: number): BirdData[] {
  const birds: BirdData[] = [];
  const count = 3;
  for (let i = 0; i < count; i++) {
    birds.push({
      x: Math.random() * width,
      y: 80 + Math.random() * (height * 0.15),
      speed: 0.4 + Math.random() * 0.4,
      flapSpeed: 0.004 + Math.random() * 0.002,
      flapPhase: Math.random() * Math.PI * 2,
      scale: 2.0 + Math.random() * 0.8,
    });
  }
  return birds;
}

function createAirplanes(width: number, height: number): AirplaneData[] {
  const planes: AirplaneData[] = [];
  const count = 2;
  for (let i = 0; i < count; i++) {
    planes.push({
      x: Math.random() * width,
      y: height * (0.15 + Math.random() * 0.14),
      speed: 0.75 + Math.random() * 0.45,
      scale: 1.15 + Math.random() * 0.35,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }
  return planes;
}

function createTrees(width: number): TreeData[] {
  const trees: TreeData[] = [];
  const count = Math.max(5, Math.floor(width / 180));
  const types: TreeData["type"][] = ["oak", "pine", "birch", "bush"];
  for (let i = 0; i < count; i++) {
    trees.push({
      x: 50 + (i * (width - 100)) / count + Math.random() * 40 - 20,
      scale: 1.8 + Math.random() * 0.8,
      type: types[Math.floor(Math.random() * types.length)],
    });
  }
  return trees;
}

function createShops(width: number): ShopData[] {
  const shops: ShopData[] = [];
  const count = Math.min(4, Math.max(2, Math.floor(width / 400)));
  const spacing = width / (count + 1);
  for (let i = 0; i < count; i++) {
    const sc = 1.7 + Math.random() * 0.4;
    const shopW = 14 * 4 * sc;
    const sx =
      spacing * (i + 1) - shopW / 2 + (Math.random() - 0.5) * 40;
    shops.push({
      x: sx,
      variant: i,
      scale: sc,
      centerX: sx + shopW / 2,
    });
  }
  return shops;
}

function createNPCs(width: number, shops: ShopData[]): NPCData[] {
  const npcs: NPCData[] = [];
  for (let i = 0; i < NPC_COUNT; i++) {
    const x = Math.random() * width * 0.8 + width * 0.1;
    const targetShop = shops.length
      ? shops[Math.floor(Math.random() * shops.length)]
      : null;
    npcs.push({
      x,
      speed: 0.3 + Math.random() * 0.4,
      facing: Math.random() > 0.5 ? 1 : -1,
      walkFrame: Math.random() * 100,
      scale: 1.2 + Math.random() * 0.6,
      skinColor:
        NPC_SKIN_COLORS[Math.floor(Math.random() * NPC_SKIN_COLORS.length)],
      shirtColor:
        NPC_SHIRT_COLORS[Math.floor(Math.random() * NPC_SHIRT_COLORS.length)],
      targetX: targetShop
        ? targetShop.centerX + (Math.random() - 0.5) * 30
        : Math.random() * width * 0.8 + width * 0.1,
      idleTimer: 0,
      atShop: false,
    });
  }
  return npcs;
}

function createDragon(_width: number, height: number): DragonData {
  return {
    x: -200,
    y: height * 0.35,
    speed: 0.8 + Math.random() * 0.5,
    facing: 1,
    flapPhase: 0,
    flapSpeed: 0.006,
    scale: 1.8 + Math.random() * 0.6,
    active: false,
    cooldown: 8000 + Math.random() * 15000,
  };
}

function createWitches(_width: number, height: number): WitchData[] {
  const witches: WitchData[] = [];
  for (let i = 0; i < 2; i++) {
    const flyY = height * 0.15 + Math.random() * height * 0.18;
    witches.push({
      x: -150,
      y: flyY,
      speed: 0.7 + Math.random() * 0.4,
      facing: 1,
      scale: 1.3 + Math.random() * 0.4,
      active: false,
      cooldown: 6000 + Math.random() * 10000 + i * 8000,
      state: "flying",
      targetShopX: 0,
      landY: height * 0.72,
      idleTimer: 0,
      flyY,
    });
  }
  return witches;
}

function createCats(shops: ShopData[], groundY: number): CatData[] {
  const cats: CatData[] = [];
  for (const shop of shops) {
    // sleeping cat near each shop
    cats.push({
      x: shop.x - 20 + Math.random() * 30,
      y: groundY,
      scale: 1.2 + Math.random() * 0.4,
      color: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
      sleeping: true,
      facing: Math.random() > 0.5 ? 1 : -1,
    });
  }
  // a couple extra sitting cats
  for (let i = 0; i < 2; i++) {
    const shop = shops[Math.floor(Math.random() * shops.length)];
    if (shop) {
      cats.push({
        x: shop.centerX + (Math.random() - 0.5) * 100,
        y: groundY,
        scale: 1.0 + Math.random() * 0.5,
        color: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
        sleeping: false,
        facing: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }
  return cats;
}

function createDogs(width: number, groundY: number, npcCount: number): DogData[] {
  const dogs: DogData[] = [];
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    dogs.push({
      x: Math.random() * width * 0.8 + width * 0.1,
      y: groundY,
      scale: 1.2 + Math.random() * 0.5,
      color: DOG_COLORS[Math.floor(Math.random() * DOG_COLORS.length)],
      facing: Math.random() > 0.5 ? 1 : -1,
      tailPhase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 0.25,
      idleTimer: 0,
      followOffset: (Math.random() - 0.5) * 22,
      followTargetIdx: npcCount > 0 ? Math.floor(Math.random() * npcCount) : 0,
      retargetCooldown: 8000 + Math.random() * 12000,
    });
  }
  return dogs;
}

function updateDogs(state: WorldState, dt: number) {
  const npcCount = state.npcs.length;
  if (!npcCount) return;

  for (const dog of state.dogs) {
    dog.tailPhase += dt * 0.008;

    if (dog.followTargetIdx >= npcCount) {
      dog.followTargetIdx = Math.floor(Math.random() * npcCount);
    }

    dog.retargetCooldown -= dt;
    if (dog.retargetCooldown <= 0) {
      dog.followTargetIdx = Math.floor(Math.random() * npcCount);
      dog.retargetCooldown = 8000 + Math.random() * 12000;
    }

    const owner = state.npcs[dog.followTargetIdx];
    const targetX = owner.x - owner.facing * 18 + dog.followOffset;
    const dx = targetX - dog.x;
    const dist = Math.abs(dx);
    dog.facing = dx >= 0 ? 1 : -1;

    if (dog.idleTimer > 0) {
      dog.idleTimer -= dt;
      if (dog.idleTimer < 0) dog.idleTimer = 0;
      // wag tail faster when sitting near human
      dog.tailPhase += dt * 0.004;
      continue;
    }

    if (dist < 20 && Math.random() < dt * 0.00025) {
      dog.idleTimer = 1200 + Math.random() * 2500;
      continue;
    }

    const speedMult = dist > 120 ? 0.09 : 0.05;
    dog.x += dog.facing * dog.speed * dt * speedMult;

    if (dog.x < 10) dog.x = 10;
    if (dog.x > state.width - 10) dog.x = state.width - 10;
  }
}

function createStreetLights(width: number, shops: ShopData[]): StreetLightData[] {
  const lights: StreetLightData[] = [];
  const count = Math.max(4, Math.floor(width / 250));
  const spacing = width / (count + 1);

  for (let i = 0; i < count; i++) {
    const lx = spacing * (i + 1);
    const tooClose = shops.some(
      (s) => Math.abs(s.centerX - lx) < 80
    );
    if (!tooClose) {
      lights.push({
        x: lx,
        scale: 1.4 + Math.random() * 0.3,
      });
    }
  }
  return lights;
}

const HORSE_COLORS = ["#8b5a2b", "#4a3a2a", "#c49060"];
const HORSE_RIDER_COUNT = 2;

function createHorses(width: number): HorseRiderData[] {
  const horses: HorseRiderData[] = [];
  for (let i = 0; i < HORSE_RIDER_COUNT; i++) {
    horses.push({
      x: Math.random() * width * 0.6 + width * 0.2,
      speed: 0.5 + Math.random() * 0.3,
      facing: Math.random() > 0.5 ? 1 : -1,
      walkFrame: Math.random() * 100,
      scale: 1.3 + Math.random() * 0.3,
      horseColor: HORSE_COLORS[Math.floor(Math.random() * HORSE_COLORS.length)],
      riderShirt:
        NPC_SHIRT_COLORS[Math.floor(Math.random() * NPC_SHIRT_COLORS.length)],
      riderSkin:
        NPC_SKIN_COLORS[Math.floor(Math.random() * NPC_SKIN_COLORS.length)],
      targetX: Math.random() * width * 0.6 + width * 0.2,
      idleTimer: 0,
    });
  }
  return horses;
}

function updateHorses(state: WorldState, dt: number) {
  for (const h of state.horses) {
    if (h.idleTimer > 0) {
      h.idleTimer -= dt;
      continue;
    }

    const dx = h.targetX - h.x;
    const dist = Math.abs(dx);

    if (dist < 12) {
      h.idleTimer = 1500 + Math.random() * 3000;
      h.targetX = Math.random() * state.width * 0.6 + state.width * 0.2;
      h.facing = h.targetX > h.x ? 1 : -1;
      continue;
    }

    h.facing = dx > 0 ? 1 : -1;
    h.x += h.facing * h.speed * dt * 0.06;
    h.walkFrame += dt * 0.012;

    if (h.x < 20) {
      h.x = 20;
      h.targetX = state.width * 0.5;
    }
    if (h.x > state.width - 20) {
      h.x = state.width - 20;
      h.targetX = state.width * 0.5;
    }
  }
}

function spawnParticle(state: WorldState): Particle | null {
  const maxP = state.performanceMode ? MAX_PARTICLES / 3 : MAX_PARTICLES;
  if (state.particles.length >= maxP) return null;
  const isNight = state.nightMode;
  return {
    x: Math.random() * state.width,
    y: Math.random() * state.groundY,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.2 - Math.random() * 0.3,
    life: 0,
    maxLife: 2000 + Math.random() * 3000,
    size: isNight ? 2 + Math.random() * 2 : 1 + Math.random() * 2,
    color: isNight ? PAL.gold : "rgba(255,255,255,0.5)",
  };
}

// ── DRAWING ──────────────────────────────────────────────────────

function drawSkyGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  night: boolean
) {
  const top = night ? PAL.nightSkyTop : PAL.skyTop;
  const mid = night ? PAL.nightSkyMid : PAL.skyMid;
  const bottom = night ? PAL.nightSkyBottom : PAL.skyBottom;

  const skyH = h * 0.7;
  const grad = ctx.createLinearGradient(0, 0, 0, skyH);
  grad.addColorStop(0, top);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, skyH + 1);
}

function drawMountains(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  scrollY: number,
  night: boolean
) {
  const layers = [
    {
      color: night ? "#1a1a3a" : PAL.mountainFar,
      y: groundY - 80,
      amp: 60,
      freq: 0.003,
      parallax: 0.1,
    },
    {
      color: night ? "#222244" : PAL.mountainMid,
      y: groundY - 40,
      amp: 45,
      freq: 0.005,
      parallax: 0.2,
    },
    {
      color: night ? "#2a2a4e" : PAL.mountainNear,
      y: groundY - 10,
      amp: 30,
      freq: 0.008,
      parallax: 0.3,
    },
  ];

  for (const layer of layers) {
    const offset = scrollY * layer.parallax;
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 4) {
      const y =
        layer.y -
        Math.abs(Math.sin((x + offset) * layer.freq)) * layer.amp -
        Math.abs(Math.sin((x + offset) * layer.freq * 2.3 + 1)) *
          layer.amp *
          0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
  }
}

function createGroundSpeckles(w: number): { row: number; col: number; dx: number; dy: number }[] {
  const cols = Math.ceil(w / GRID_SIZE) + 1;
  const speckles: { row: number; col: number; dx: number; dy: number }[] = [];
  for (let row = 1; row < GROUND_ROW_COUNT; row++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() > 0.8) {
        speckles.push({
          row,
          col,
          dx: Math.floor(Math.random() * (GRID_SIZE - 4)),
          dy: Math.floor(Math.random() * (GRID_SIZE - 4)),
        });
      }
    }
  }
  return speckles;
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  time: number,
  speckles: { row: number; col: number; dx: number; dy: number }[]
) {
  const cols = Math.ceil(w / GRID_SIZE) + 1;
  for (let row = 0; row < GROUND_ROW_COUNT; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * GRID_SIZE;
      const y = groundY + row * GRID_SIZE;
      if (row === 0) {
        drawGrassBlock(ctx, x, y, GRID_SIZE);
      } else {
        ctx.fillStyle = row < 2 ? PAL.dirt : PAL.stone;
        ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
        ctx.fillStyle = row < 2 ? PAL.dirtDark : PAL.stoneDark;
        ctx.fillRect(x, y + GRID_SIZE - 2, GRID_SIZE, 2);
      }
    }
  }

  for (const sp of speckles) {
    const x = sp.col * GRID_SIZE;
    const y = groundY + sp.row * GRID_SIZE;
    ctx.fillStyle = sp.row < 2 ? PAL.dirtDark : PAL.stoneDark;
    ctx.fillRect(x + sp.dx, y + sp.dy, 3, 3);
  }

  const waterY = groundY + GROUND_ROW_COUNT * GRID_SIZE;
  for (let row = 0; row < WATER_ROW_COUNT; row++) {
    for (let col = 0; col < cols; col++) {
      drawWaterTile(
        ctx,
        col * GRID_SIZE,
        waterY + row * GRID_SIZE,
        GRID_SIZE,
        time,
        col
      );
    }
  }
}

function updateBirds(
  birds: BirdData[],
  airplanes: AirplaneData[],
  width: number,
  height: number,
  dt: number,
  time: number
) {
  const planeHalfWBase = 60;
  const planeHalfHBase = 14;
  for (const b of birds) {
    b.x += b.speed * dt * 0.04;
    b.flapPhase = time * b.flapSpeed;
    b.y += Math.sin(time * 0.0008 + b.flapPhase) * 0.15;

    // Hard bird-avoidance: enforce a strict no-fly buffer around each airplane.
    for (const plane of airplanes) {
      const planeHalfW = planeHalfWBase * plane.scale;
      const planeHalfH = planeHalfHBase * plane.scale;
      const safeX = planeHalfW + 42 + b.scale * 10;
      const safeY = planeHalfH + 22 + b.scale * 7;

      const dx = b.x - plane.x;
      const dy = b.y - plane.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < safeX && absDy < safeY) {
        // Soft steer first.
        const pushX = dx >= 0 ? 1 : -1;
        const pushY = dy >= 0 ? 1 : -1;
        b.x += pushX * (safeX - absDx + 3);
        b.y += pushY * (safeY - absDy + 3);

        // Hard correction to guarantee no overlap ever.
        const stillDx = Math.abs(b.x - plane.x);
        const stillDy = Math.abs(b.y - plane.y);
        if (stillDx < safeX && stillDy < safeY) {
          b.y = plane.y + (dy >= 0 ? safeY + 4 : -(safeY + 4));
          b.x = plane.x + (dx >= 0 ? safeX + 6 : -(safeX + 6));
        }
      }
    }

    const minY = 46;
    const maxY = Math.max(minY + 40, height * 0.38);
    if (b.y < minY) b.y = minY;
    if (b.y > maxY) b.y = maxY;
    if (b.x > width + 100) {
      b.x = -100;
      b.y = 60 + Math.random() * width * 0.1;
    }
  }
}

function updateAirplanes(state: WorldState, dt: number, time: number) {
  for (const plane of state.airplanes) {
    plane.x += plane.speed * dt * 0.05;
    plane.y += Math.sin(time * 0.0006 + plane.bobPhase) * 0.08;
    if (plane.x > state.width + 220) {
      plane.x = -220;
      plane.y = state.height * (0.14 + Math.random() * 0.16);
      plane.speed = 0.75 + Math.random() * 0.45;
      plane.scale = 1.15 + Math.random() * 0.35;
      plane.bobPhase = Math.random() * Math.PI * 2;
    }
  }
}

function updateDragon(state: WorldState, dt: number, time: number) {
  const d = state.dragon;

  if (!d.active) {
    d.cooldown -= dt;
    if (d.cooldown <= 0) {
      d.active = true;
      d.facing = Math.random() > 0.5 ? 1 : -1;
      d.x = d.facing > 0 ? -250 : state.width + 250;
      d.y = state.height * 0.28 + Math.random() * state.height * 0.15;
      d.speed = 0.6 + Math.random() * 0.4;
      d.scale = 1.6 + Math.random() * 0.8;
      d.flapSpeed = 0.005 + Math.random() * 0.003;
    }
    return;
  }

  d.x += d.facing * d.speed * dt * 0.06;
  d.flapPhase = time * d.flapSpeed;
  d.y += Math.sin(time * 0.0006) * 0.3;

  const outOfBounds =
    (d.facing > 0 && d.x > state.width + 300) ||
    (d.facing < 0 && d.x < -300);

  if (outOfBounds) {
    d.active = false;
    d.cooldown = 12000 + Math.random() * 20000;
  }
}

function getValidShops(shops: ShopData[]): ShopData[] {
  return shops.filter((s) => s.variant !== 2 && s.variant !== 3);
}

function updateWitches(state: WorldState, dt: number, time: number) {
  const validShops = getValidShops(state.shops);

  for (const w of state.witches) {
    w.landY = state.groundY;

    if (!w.active) {
      w.cooldown -= dt;
      if (w.cooldown <= 0) {
        w.active = true;
        w.state = "flying";
        w.facing = Math.random() > 0.5 ? 1 : -1;
        w.x = w.facing > 0 ? -180 : state.width + 180;
        w.flyY = state.height * 0.12 + Math.random() * state.height * 0.2;
        w.y = w.flyY;
        w.speed = 0.6 + Math.random() * 0.4;
        w.scale = 1.3 + Math.random() * 0.4;
        w.idleTimer = 0;

        if (validShops.length > 0 && Math.random() > 0.35) {
          const shop = validShops[Math.floor(Math.random() * validShops.length)];
          w.targetShopX = shop.centerX + (Math.random() - 0.5) * 20;
        } else {
          w.targetShopX = 0;
        }
      }
      continue;
    }

    switch (w.state) {
      case "flying": {
        w.x += w.facing * w.speed * dt * 0.05;
        w.y = w.flyY + Math.sin(time * 0.0008 + w.x * 0.002) * 3;

        if (w.targetShopX > 0) {
          const dxShop = Math.abs(w.x - w.targetShopX);
          if (dxShop < 30) {
            w.state = "descending";
            w.facing = w.targetShopX > w.x ? 1 : -1;
          }
        }

        const outOfBounds =
          (w.facing > 0 && w.x > state.width + 200) ||
          (w.facing < 0 && w.x < -200);
        if (outOfBounds) {
          w.active = false;
          w.cooldown = 10000 + Math.random() * 15000;
        }
        break;
      }
      case "descending": {
        const targetY = w.landY - 10;
        const dy = targetY - w.y;
        w.y += dy * 0.002 * dt;
        w.x += (w.targetShopX - w.x) * 0.001 * dt;

        if (Math.abs(w.y - targetY) < 5) {
          w.y = targetY;
          w.state = "landed";
          w.idleTimer = 3000 + Math.random() * 5000;
        }
        break;
      }
      case "landed": {
        w.idleTimer -= dt;
        if (w.idleTimer <= 0) {
          w.state = "ascending";
          w.facing = Math.random() > 0.5 ? 1 : -1;
        }
        break;
      }
      case "ascending": {
        const dy = w.flyY - w.y;
        w.y += dy * 0.002 * dt;
        w.x += w.facing * w.speed * dt * 0.03;

        if (Math.abs(w.y - w.flyY) < 5) {
          w.y = w.flyY;
          w.state = "flying";
          w.targetShopX = 0;
        }
        break;
      }
    }
  }
}

function updateNPCs(state: WorldState, dt: number) {
  for (const npc of state.npcs) {
    if (npc.idleTimer > 0) {
      npc.idleTimer -= dt;
      npc.atShop = true;
      continue;
    }
    npc.atShop = false;

    const dx = npc.targetX - npc.x;
    const dist = Math.abs(dx);

    if (dist < 8) {
      const nearShop = state.shops.find(
        (s) => Math.abs(s.centerX - npc.x) < 60
      );
      if (nearShop && Math.random() > 0.3) {
        npc.idleTimer = 2000 + Math.random() * 4000;
        npc.atShop = true;
      } else {
        npc.idleTimer = 500 + Math.random() * 1500;
      }

      const nextShop =
        state.shops.length && Math.random() > 0.3
          ? state.shops[Math.floor(Math.random() * state.shops.length)]
          : null;
      npc.targetX = nextShop
        ? nextShop.centerX + (Math.random() - 0.5) * 40
        : Math.random() * state.width * 0.8 + state.width * 0.1;
      npc.facing = npc.targetX > npc.x ? 1 : -1;
      continue;
    }

    npc.facing = dx > 0 ? 1 : -1;
    npc.x += npc.facing * npc.speed * dt * 0.05;
    npc.walkFrame += dt * 0.01;

    if (npc.x < 10) {
      npc.x = 10;
      npc.targetX = state.width * 0.5;
    }
    if (npc.x > state.width - 10) {
      npc.x = state.width - 10;
      npc.targetX = state.width * 0.5;
    }
  }
}

function updateParticles(state: WorldState, dt: number) {
  const { particles, input } = state;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }

    if (input.mouseX > 0 && input.mouseY > 0) {
      const dx = input.mouseX - p.x;
      const dy = input.mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && dist > 1) {
        p.vx += (dx / dist) * 0.05;
        p.vy += (dy / dist) * 0.05;
      }
    }

    p.x += p.vx * dt * 0.06;
    p.y += p.vy * dt * 0.06;
    p.vx *= 0.99;
    p.vy *= 0.99;
  }

  if (Math.random() > 0.7) {
    const np = spawnParticle(state);
    if (np) particles.push(np);
  }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  time: number
) {
  for (const p of particles) {
    const alpha = 1 - p.life / p.maxLife;
    const flicker = 0.6 + Math.sin(time * 0.005 + p.x) * 0.4;
    ctx.globalAlpha = alpha * flicker;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ── TREE DRAW DISPATCHER ─────────────────────────────────────────

function drawTreeByType(
  ctx: CanvasRenderingContext2D,
  tree: TreeData,
  groundY: number
) {
  switch (tree.type) {
    case "oak":
      drawOakTree(ctx, tree.x, groundY, tree.scale);
      break;
    case "pine":
      drawPineTree(ctx, tree.x, groundY, tree.scale);
      break;
    case "birch":
      drawBirchTree(ctx, tree.x, groundY, tree.scale);
      break;
    case "bush":
      drawFlowerBush(ctx, tree.x, groundY, tree.scale);
      break;
  }
}

// ── INIT / RESIZE / RENDER / DESTROY ─────────────────────────────

export function initWorld(canvas: HTMLCanvasElement): WorldState | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  const groundY = h * 0.72;
  const shops = createShops(w);

  const state: WorldState = {
    canvas,
    ctx,
    width: w,
    height: h,
    dpr,
    input: createInputState(),
    particles: [],
    clouds: createClouds(w, h),
    stars: createStars(w, h),
    birds: createBirds(w, h),
    airplanes: createAirplanes(w, h),
    trees: createTrees(w),
    shops,
    npcs: createNPCs(w, shops),
    dragon: createDragon(w, h),
    witches: createWitches(w, h),
    cats: createCats(shops, groundY),
    dogs: createDogs(w, groundY, NPC_COUNT),
    horses: createHorses(w),
    streetLights: createStreetLights(w, shops),
    groundSpeckles: createGroundSpeckles(w),
    groundY,
    scrollY: 0,
    nightMode: isNightTime(),
    performanceMode: false,
    soundEnabled: true,
    animFrame: 0,
    detach: null,
    musicPlayer: null,
  };

  const noop = () => {};
  const detachInput = attachInputHandlers(canvas, state.input, noop, noop);

  const startMusicOnGesture = () => {
    if (state.soundEnabled) {
      if (!state.musicPlayer) {
        state.musicPlayer = new MusicPlayer();
      }
      if (!state.musicPlayer.playing) {
        state.musicPlayer.start();
      }
    }
    removeGestureListeners();
  };

  const GESTURE_EVENTS = [
    "click", "keydown", "touchstart", "touchmove",
    "scroll", "wheel", "mousemove", "pointerdown",
  ] as const;

  const removeGestureListeners = () => {
    for (const evt of GESTURE_EVENTS) {
      document.removeEventListener(evt, startMusicOnGesture);
    }
  };

  for (const evt of GESTURE_EVENTS) {
    document.addEventListener(evt, startMusicOnGesture, { once: true, passive: true });
  }

  state.detach = () => {
    detachInput();
    removeGestureListeners();
  };

  return state;
}

export function resizeWorld(state: WorldState) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;
  state.canvas.width = w;
  state.canvas.height = h;
  state.canvas.style.width = window.innerWidth + "px";
  state.canvas.style.height = window.innerHeight + "px";
  state.width = w;
  state.height = h;
  state.dpr = dpr;
  state.groundY = h * 0.72;
  state.clouds = createClouds(w, h);
  state.stars = createStars(w, h);
  state.birds = createBirds(w, h);
  state.airplanes = createAirplanes(w, h);
  state.trees = createTrees(w);
  state.shops = createShops(w);
  state.npcs = createNPCs(w, state.shops);
  state.dragon = createDragon(w, h);
  state.witches = createWitches(w, h);
  state.cats = createCats(state.shops, state.groundY);
  state.dogs = createDogs(w, state.groundY, NPC_COUNT);
  state.horses = createHorses(w);
  state.streetLights = createStreetLights(w, state.shops);
  state.groundSpeckles = createGroundSpeckles(w);
}

export function renderFrame(state: WorldState, time: number, dt: number) {
  const { ctx, width: w, height: h, groundY } = state;

  ctx.clearRect(0, 0, w, h);

  drawSkyGradient(ctx, w, h, state.nightMode);

  if (state.nightMode) {
    for (const star of state.stars) {
      const twinkle =
        Math.sin(time * star.twinkleSpeed + star.phase) * 0.5 + 0.5;
      drawStar(ctx, star.x, star.y, star.brightness * twinkle);
    }
    drawMoon(ctx, w * 0.8, h * 0.12, 30);
  } else {
    drawSun(ctx, w * 0.15, h * 0.12, 28, time);

    updateAirplanes(state, dt, time);
    for (const plane of state.airplanes) {
      drawPassengerPlane(ctx, plane.x, plane.y, plane.scale, time);
    }

    updateBirds(state.birds, state.airplanes, w, h, dt, time);
    for (const bird of state.birds) {
      drawBird(ctx, bird.x, bird.y, bird.flapPhase, bird.scale);
    }
  }

  // dragon + witches (night only)
  if (state.nightMode) {
    updateDragon(state, dt, time);
    if (state.dragon.active) {
      drawDragon(
        ctx,
        state.dragon.x,
        state.dragon.y,
        state.dragon.scale,
        state.dragon.facing,
        state.dragon.flapPhase,
        true,
        time
      );
    }

    updateWitches(state, dt, time);
    for (const w of state.witches) {
      if (w.active) {
        drawWitch(ctx, w.x, w.y, w.scale, w.facing, time, w.state === "landed");
      }
    }
  }

  for (const cloud of state.clouds) {
    cloud.x += cloud.speed * (dt * 0.05);
    if (cloud.x > w + 100) cloud.x = -200;
    drawCloud(ctx, cloud.x, cloud.y - state.scrollY * 0.05, cloud.scale);
  }

  drawMountains(ctx, w, groundY, state.scrollY, state.nightMode);

  for (const tree of state.trees) {
    drawTreeByType(ctx, tree, groundY);
  }

  drawGround(ctx, w, groundY, time, state.groundSpeckles);

  for (const shop of state.shops) {
    drawShop(ctx, shop.x, groundY, shop.variant, shop.scale);
  }

  if (state.input.clickFired && state.onShopClick) {
    const cx = state.input.lastClickX;
    const cy = state.input.lastClickY;
    for (const shop of state.shops) {
      const s = Math.floor(4 * shop.scale);
      const shopW = s * 14;
      const shopH = s * 12;
      const baseY = groundY - shopH;
      if (cx >= shop.x && cx <= shop.x + shopW && cy >= baseY && cy <= groundY) {
        state.onShopClick(shop.variant);
        break;
      }
    }
    state.input.clickFired = false;
  }

  // street light poles
  for (const sl of state.streetLights) {
    drawStreetLight(ctx, sl.x, groundY, sl.scale, state.nightMode, time);
  }

  updateNPCs(state, dt);
  for (const npc of state.npcs) {
    drawNPC(
      ctx,
      npc.x,
      groundY,
      npc.scale,
      npc.facing,
      npc.walkFrame,
      npc.skinColor,
      npc.shirtColor,
      npc.atShop || npc.idleTimer > 0
    );
  }

  // cats keep existing behavior; only eye glow changes at night.
  for (const cat of state.cats) {
    drawCat(
      ctx,
      cat.x,
      cat.y,
      cat.scale,
      cat.color,
      cat.sleeping,
      cat.facing,
      state.nightMode
    );
  }

  updateDogs(state, dt);
  for (const dog of state.dogs) {
    drawDog(ctx, dog.x, dog.y, dog.scale, dog.color, dog.facing, dog.tailPhase);
  }

  updateHorses(state, dt);
  for (const h of state.horses) {
    drawHorseWithRider(
      ctx,
      h.x,
      groundY,
      h.scale,
      h.facing,
      h.walkFrame,
      h.horseColor,
      h.riderShirt,
      h.riderSkin
    );
  }

  // street light glow (night only, drawn on top of everything)
  if (state.nightMode) {
    for (const sl of state.streetLights) {
      drawLightGlow(ctx, sl.x, groundY, sl.scale, time);
    }
  }

  if (!state.performanceMode) {
    updateParticles(state, dt);
    drawParticles(ctx, state.particles, time);
  }

  if (!state.soundEnabled && state.musicPlayer?.playing) {
    state.musicPlayer.stop();
  }
}

export function destroyWorld(state: WorldState) {
  if (state.detach) state.detach();
  cancelAnimationFrame(state.animFrame);
  if (state.musicPlayer) {
    state.musicPlayer.destroy();
    state.musicPlayer = null;
  }
}
