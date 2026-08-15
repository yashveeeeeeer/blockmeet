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
  drawStreetLight,
  drawLightGlow,
  drawHorseWithRider,
  drawNPC,
  drawNPCOnBridge,
  drawDogOnBridge,
} from "./sprites";
import { InputState, createInputState, attachInputHandlers, getCanvasDpr } from "./input";

const MAX_PARTICLES = 60;
const GRID_SIZE = 32;
const GROUND_ROW_COUNT = 2;
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
  baseY: number;
  scale: number;
  bobPhase: number;
  active: boolean;
  cooldown: number;
  progress: number;
  duration: number;
  facing: 1 | -1;
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
  atLamp: boolean;
  activity: "village" | "bridge" | "dock";
  momentPhase: number;
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

interface ReactionData {
  x: number;
  y: number;
  life: number;
  kind: "heart" | "spark" | "note";
}

interface BridgeVisitorData {
  phase: "waiting" | "approaching" | "pausing" | "returning";
  progress: number;
  timer: number;
  withDog: boolean;
  dogIndex: number;
  lane: -1 | 1;
}

interface JumpingFishData {
  progress: number;
  duration: number;
  startXRatio: number;
  endXRatio: number;
  depthRatio: number;
  jumpHeight: number;
  body: string;
  fin: string;
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
  reactions: ReactionData[];
  bridgeVisitor: BridgeVisitorData;
  jumpingFish: JumpingFishData | null;
  nextFishJumpAt: number;
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

function getGroundY(height: number): number {
  const ratio = window.innerWidth <= 640 ? 0.58 : window.innerWidth <= 900 ? 0.61 : 0.63;
  return height * ratio;
}

function getCharacterScale(): number {
  return window.innerWidth >= 900 ? 1.28 : window.innerWidth >= 641 ? 1.14 : 1;
}

// ── AMBIENT MUSIC PLAYER ─────────────────────────────────────────

const TRACK_URLS = [
  import.meta.env.BASE_URL + "music/1.opus",
  import.meta.env.BASE_URL + "music/2.opus",
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
    a.preload = "none";
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
  const facing: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  const baseY = height * (0.17 + Math.random() * 0.08);
  return [{
    x: facing > 0 ? -220 : width + 220,
    y: baseY,
    baseY,
    scale: 1.05 + Math.random() * 0.18,
    bobPhase: Math.random() * Math.PI * 2,
    active: false,
    cooldown: 4500 + Math.random() * 6500,
    progress: 0,
    duration: 18000 + Math.random() * 6000,
    facing,
  }];
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
  const scaleBoost = getCharacterScale();
  for (let i = 0; i < NPC_COUNT; i++) {
    const activity = i === 0 ? "bridge" : i === 1 ? "dock" : "village";
    const x =
      activity === "bridge"
        ? width * 0.5
        : activity === "dock"
          ? width * 0.87
          : Math.random() * width * 0.8 + width * 0.1;
    const targetShop = shops.length
      ? shops[Math.floor(Math.random() * shops.length)]
      : null;
    npcs.push({
      x,
      speed: 0.3 + Math.random() * 0.4,
      facing: Math.random() > 0.5 ? 1 : -1,
      walkFrame: Math.random() * 100,
      scale: (1.2 + Math.random() * 0.6) * scaleBoost,
      skinColor:
        NPC_SKIN_COLORS[Math.floor(Math.random() * NPC_SKIN_COLORS.length)],
      shirtColor:
        NPC_SHIRT_COLORS[Math.floor(Math.random() * NPC_SHIRT_COLORS.length)],
      targetX: targetShop
        ? targetShop.centerX + (Math.random() - 0.5) * 30
        : Math.random() * width * 0.8 + width * 0.1,
      idleTimer: 0,
      atShop: false,
      atLamp: false,
      activity,
      momentPhase: Math.random() * Math.PI * 2,
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
      landY: getGroundY(height),
      idleTimer: 0,
      flyY,
    });
  }
  return witches;
}

function createCats(shops: ShopData[], groundY: number): CatData[] {
  const cats: CatData[] = [];
  const scaleBoost = getCharacterScale();
  for (const shop of shops) {
    // sleeping cat near each shop
    cats.push({
      x: shop.x - 20 + Math.random() * 30,
      y: groundY,
      scale: (1.2 + Math.random() * 0.4) * scaleBoost,
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
        scale: (1.0 + Math.random() * 0.5) * scaleBoost,
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
  const scaleBoost = getCharacterScale();
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    dogs.push({
      x: Math.random() * width * 0.8 + width * 0.1,
      y: groundY,
      scale: (1.2 + Math.random() * 0.5) * scaleBoost,
      color: DOG_COLORS[Math.floor(Math.random() * DOG_COLORS.length)],
      facing: Math.random() > 0.5 ? 1 : -1,
      tailPhase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 0.25,
      idleTimer: 0,
      followOffset: (Math.random() - 0.5) * 22,
      followTargetIdx:
        npcCount > 2 ? 2 + Math.floor(Math.random() * (npcCount - 2)) : 0,
      retargetCooldown: 8000 + Math.random() * 12000,
    });
  }
  return dogs;
}

function createBridgeVisitor(): BridgeVisitorData {
  return {
    phase: "waiting",
    progress: 0,
    timer: 3500 + Math.random() * 4500,
    withDog: false,
    dogIndex: 0,
    lane: Math.random() > 0.5 ? 1 : -1,
  };
}

function getBridgeVisitorPosition(state: WorldState) {
  const visitor = state.bridgeVisitor;
  if (visitor.phase === "waiting") return null;

  const riverY = getRiverY(state.groundY, state.height);
  const progress = visitor.progress;
  const topY = riverY + 4;
  const bottomY = state.height - Math.max(56, state.height * 0.075);
  const topHalf = Math.max(30, Math.min(62, state.width * 0.055));
  const bottomHalf = Math.max(90, Math.min(260, state.width * 0.22));
  const bridgeHalf = topHalf + (bottomHalf - topHalf) * progress;
  const laneOffset = bridgeHalf * 0.3 * visitor.lane;

  return {
    x: state.width * 0.5 + laneOffset,
    y: topY + (bottomY - topY) * progress,
    scale: 0.58 + progress * 1.05,
  };
}

function updateBridgeVisitor(state: WorldState, dt: number) {
  const visitor = state.bridgeVisitor;
  const npc = state.npcs.find((candidate) => candidate.activity === "bridge");
  if (npc && visitor.phase !== "waiting") npc.walkFrame += dt * 0.012;

  if (visitor.phase === "waiting") {
    visitor.timer -= dt;
    if (visitor.timer <= 0) {
      visitor.phase = "approaching";
      visitor.progress = 0;
      visitor.withDog = state.dogs.length > 0 && Math.random() < 0.58;
      visitor.dogIndex = state.dogs.length
        ? Math.floor(Math.random() * state.dogs.length)
        : 0;
      visitor.lane = Math.random() > 0.5 ? 1 : -1;
    }
    return;
  }

  if (visitor.phase === "approaching") {
    visitor.progress = Math.min(0.72, visitor.progress + dt * 0.0001);
    if (visitor.progress >= 0.72) {
      visitor.phase = "pausing";
      visitor.timer = 1400 + Math.random() * 1600;
    }
    return;
  }

  if (visitor.phase === "pausing") {
    visitor.timer -= dt;
    if (visitor.timer <= 0) visitor.phase = "returning";
    return;
  }

  visitor.progress = Math.max(0, visitor.progress - dt * 0.00009);
  if (visitor.progress <= 0) {
    visitor.phase = "waiting";
    visitor.timer = 5500 + Math.random() * 7500;
    visitor.withDog = false;
  }
}

function updateDogs(state: WorldState, dt: number) {
  const villageNpcIndices = state.npcs
    .map((npc, index) => (npc.activity === "village" ? index : -1))
    .filter((index) => index >= 0);
  if (!villageNpcIndices.length) return;
  const chooseVillageNpc = () =>
    villageNpcIndices[Math.floor(Math.random() * villageNpcIndices.length)];

  const bridgeDogIndex =
    state.bridgeVisitor.phase !== "waiting" && state.bridgeVisitor.withDog
      ? state.bridgeVisitor.dogIndex
      : -1;

  for (const [index, dog] of state.dogs.entries()) {
    if (index === bridgeDogIndex) continue;
    dog.tailPhase += dt * 0.008;

    if (!villageNpcIndices.includes(dog.followTargetIdx)) {
      dog.followTargetIdx = chooseVillageNpc();
    }

    dog.retargetCooldown -= dt;
    if (dog.retargetCooldown <= 0) {
      dog.followTargetIdx = chooseVillageNpc();
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
  const scaleBoost = getCharacterScale();
  for (let i = 0; i < HORSE_RIDER_COUNT; i++) {
    horses.push({
      x: Math.random() * width * 0.6 + width * 0.2,
      speed: 0.5 + Math.random() * 0.3,
      facing: Math.random() > 0.5 ? 1 : -1,
      walkFrame: Math.random() * 100,
      scale: (1.3 + Math.random() * 0.3) * scaleBoost,
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
  const isNight = state.nightMode;
  const maxP = isNight ? 28 : MAX_PARTICLES;
  if (state.particles.length >= maxP) return null;
  const cluster = [0.12, 0.3, 0.65, 0.84][Math.floor(Math.random() * 4)];
  return {
    x: isNight
      ? Math.max(12, Math.min(state.width - 12, state.width * cluster + (Math.random() - 0.5) * state.width * 0.12))
      : Math.random() * state.width,
    y: isNight
      ? state.groundY - 18 - Math.random() * Math.min(105 * state.dpr, state.groundY * 0.2)
      : Math.random() * state.groundY,
    vx: isNight ? (Math.random() - 0.5) * 0.12 : (Math.random() - 0.5) * 0.3,
    vy: isNight ? (Math.random() - 0.5) * 0.08 : -0.2 - Math.random() * 0.3,
    life: 0,
    maxLife: isNight ? 5000 + Math.random() * 5000 : 2000 + Math.random() * 3000,
    size: isNight ? 2 + Math.random() * 2 : 1 + Math.random() * 2,
    color: isNight
      ? Math.random() > 0.38 ? "#f6d365" : "#79ead3"
      : "rgba(255,255,255,0.5)",
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
  type MountainLayer = {
    color: string;
    shadow: string;
    edge: string;
    height: number;
    parallax: number;
    profile: readonly (readonly [number, number])[];
    peaks: readonly number[];
    snow?: readonly number[];
  };

  const rangeHeight = Math.min(groundY * 0.34, w * 0.32);
  const layers = [
    {
      color: night ? "#46557f" : "#a2b7cf",
      shadow: night ? "rgba(24, 31, 62, 0.22)" : "rgba(91, 116, 151, 0.2)",
      edge: night ? "rgba(176, 194, 238, 0.42)" : "rgba(230, 240, 248, 0.66)",
      height: 1,
      parallax: 0.1,
      profile: [
        [0, 0.34], [0.08, 0.52], [0.16, 0.4], [0.28, 1],
        [0.38, 0.54], [0.5, 0.27], [0.61, 0.48], [0.75, 0.84],
        [0.84, 0.46], [0.94, 0.64], [1, 0.42],
      ],
      peaks: [3, 7],
      snow: [3, 7],
    },
    {
      color: night ? "#34466c" : "#7e99b7",
      shadow: night ? "rgba(16, 28, 53, 0.24)" : "rgba(68, 96, 128, 0.2)",
      edge: night ? "rgba(130, 157, 210, 0.3)" : "rgba(186, 207, 226, 0.5)",
      height: 0.72,
      parallax: 0.2,
      profile: [
        [0, 0.38], [0.1, 0.64], [0.19, 0.36], [0.36, 0.78],
        [0.5, 0.2], [0.63, 0.62], [0.72, 0.42], [0.87, 0.74], [1, 0.35],
      ],
      peaks: [1, 3, 5, 7],
    },
    {
      color: night ? "#263b59" : "#5e7f9c",
      shadow: night ? "rgba(11, 29, 45, 0.25)" : "rgba(53, 82, 108, 0.22)",
      edge: night ? "rgba(93, 134, 174, 0.23)" : "rgba(145, 176, 202, 0.42)",
      height: 0.46,
      parallax: 0.3,
      profile: [
        [0, 0.32], [0.12, 0.64], [0.24, 0.3], [0.39, 0.7],
        [0.5, 0.16], [0.6, 0.56], [0.74, 0.3], [0.9, 0.66], [1, 0.28],
      ],
      peaks: [1, 3, 5, 7],
    },
  ] satisfies MountainLayer[];

  for (const layer of layers) {
    const verticalOffset = scrollY * layer.parallax;
    const ridge = layer.profile.map(([ratio, height]) => ({
      x: ratio * w,
      y: groundY - height * rangeHeight * layer.height - verticalOffset,
    }));

    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (const point of ridge) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    for (const peakIndex of layer.peaks) {
      const peak = ridge[peakIndex];
      const shadowNeighbor = ridge[peakIndex + (night ? -1 : 1)];
      const lightNeighbor = ridge[peakIndex + (night ? 1 : -1)];
      if (!peak || !shadowNeighbor || !lightNeighbor) continue;

      ctx.fillStyle = layer.shadow;
      const facetBottomX = peak.x + (shadowNeighbor.x - peak.x) * 0.42;
      const facetBottomY = Math.min(
        groundY - 2,
        Math.max(
          shadowNeighbor.y + 10,
          peak.y + (groundY - peak.y) * 0.72,
        ),
      );
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y);
      ctx.lineTo(shadowNeighbor.x, shadowNeighbor.y);
      ctx.lineTo(facetBottomX, facetBottomY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = layer.edge;
      for (let step = 0; step <= 0.52; step += 0.08) {
        const x = peak.x + (lightNeighbor.x - peak.x) * step;
        const y = peak.y + (lightNeighbor.y - peak.y) * step;
        ctx.fillRect(Math.round(x), Math.round(y), 5, 2);
      }
    }

    for (const snowIndex of layer.snow ?? []) {
      const peak = ridge[snowIndex];
      if (!peak) continue;
      const capWidth = rangeHeight * 0.16;
      const capHeight = rangeHeight * 0.105;
      ctx.fillStyle = night ? "#aebcdb" : "#e7eef4";
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y);
      ctx.lineTo(peak.x - capWidth * 0.52, peak.y + capHeight);
      ctx.lineTo(peak.x - capWidth * 0.18, peak.y + capHeight * 0.7);
      ctx.lineTo(peak.x, peak.y + capHeight * 0.92);
      ctx.lineTo(peak.x + capWidth * 0.16, peak.y + capHeight * 0.58);
      ctx.lineTo(peak.x + capWidth * 0.52, peak.y + capHeight);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = night ? "rgba(92, 114, 161, 0.52)" : "rgba(145, 167, 192, 0.42)";
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y);
      ctx.lineTo(peak.x + capWidth * 0.52, peak.y + capHeight);
      ctx.lineTo(peak.x + capWidth * 0.16, peak.y + capHeight * 0.58);
      ctx.lineTo(peak.x, peak.y + capHeight * 0.92);
      ctx.closePath();
      ctx.fill();
    }
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
  h: number,
  groundY: number,
  time: number,
  speckles: { row: number; col: number; dx: number; dy: number }[],
  night: boolean
) {
  const cols = Math.ceil(w / GRID_SIZE) + 1;
  const riverY = groundY + Math.max(38, h * 0.055);
  const bankSteps = [0, 0, 2, 4, 4, 2, 0, -2, -2, 0, 2, 0];

  // Deep, layered water replaces the old straight two-tile footer strip.
  ctx.fillStyle = night ? "#071c3a" : "#438fbe";
  ctx.fillRect(0, riverY - 4, w, h - riverY + 4);
  ctx.fillStyle = night ? "#0c2b53" : "#529ed0";
  ctx.fillRect(0, riverY + 16, w, h - riverY - 16);

  // Sparse horizontal ripples make the water feel calm rather than noisy.
  for (let row = 0; row < 7; row++) {
    const y = riverY + 14 + row * Math.max(16, (h - riverY) / 8);
    const offset = Math.floor((time * (0.012 + row * 0.002)) % 72);
    ctx.fillStyle = night
      ? `rgba(53, 160, 197, ${0.12 + row * 0.012})`
      : `rgba(168, 224, 244, ${0.18 + row * 0.012})`;
    for (let x = -offset; x < w; x += 86) {
      const rippleWidth = 20 + ((row * 13 + x) % 24);
      ctx.fillRect(x, y, rippleWidth, 3);
    }
  }

  // A stepped, living shoreline with grass, soil, stones, and small plants.
  for (let col = 0; col < cols; col++) {
    const x = col * GRID_SIZE;
    const bankBottom = riverY + bankSteps[col % bankSteps.length] * 2;
    ctx.fillStyle = night ? "#173f35" : "#5d8f48";
    ctx.fillRect(x, groundY, GRID_SIZE + 1, bankBottom - groundY);
    ctx.fillStyle = night ? "#245f48" : "#73ae54";
    ctx.fillRect(x, groundY, GRID_SIZE + 1, 8);
    ctx.fillStyle = night ? "#319066" : "#a0cd68";
    ctx.fillRect(x, groundY, GRID_SIZE + 1, 3);
    ctx.fillStyle = night ? "#102f2b" : "#76543b";
    ctx.fillRect(x, bankBottom - 5, GRID_SIZE + 1, 5);

    if (col % 3 === 0) {
      ctx.fillStyle = night ? "#55747a" : PAL.stone;
      ctx.fillRect(x + 8, bankBottom - 8, 7, 5);
    }
    if (col % 5 === 1) {
      ctx.fillStyle = night ? "#2f7559" : "#5aa96f";
      ctx.fillRect(x + 21, groundY - 8, 3, 8);
      ctx.fillStyle = col % 10 === 1 ? "#e98073" : "#f2c85d";
      ctx.fillRect(x + 18, groundY - 10, 8, 4);
    }
  }

  // A short pixel path widens toward the bridge, guiding the eye to booking.
  for (let step = 0; step < 6; step++) {
    const progress = step / 5;
    const y = groundY + 5 + progress * Math.max(20, riverY - groundY - 13);
    const pathCenter = w / 2 + Math.sin((1 - progress) * Math.PI) * w * 0.018;
    const pathWidth = 18 + progress * Math.min(78, w * 0.09);
    ctx.fillStyle = night ? "#7f6848" : "#c5a56b";
    ctx.fillRect(pathCenter - pathWidth / 2, y, pathWidth, 5);
  }

  for (const sp of speckles) {
    const x = sp.col * GRID_SIZE;
    const y = groundY + sp.row * 18;
    ctx.fillStyle = night ? "#326554" : "#49753d";
    ctx.fillRect(x + sp.dx, y + (sp.dy % 12), 3, 3);
  }

}

function getRiverY(groundY: number, height: number): number {
  return groundY + Math.max(38, height * 0.055);
}

function drawEnchantedBankDetails(
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  time: number,
) {
  if (!state.nightMode) return;

  const { width: w, groundY, dpr } = state;
  const p = Math.max(2, Math.round(1.5 * dpr));
  const clusters = [0.09, 0.22, 0.72, 0.88];

  for (const [index, ratio] of clusters.entries()) {
    const x = w * ratio;
    const pulse = 0.68 + (Math.sin(time * 0.0014 + index * 1.7) + 1) * 0.14;
    const cap = index % 2 === 0 ? "#78ead2" : "#a995ff";
    ctx.save();
    ctx.globalAlpha = pulse * 0.14;
    ctx.fillStyle = cap;
    ctx.fillRect(x - p * 4, groundY - p * 7, p * 9, p * 8);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#c8e9df";
    ctx.fillRect(x, groundY - p * 4, p, p * 4);
    ctx.fillStyle = cap;
    ctx.fillRect(x - p * 2, groundY - p * 5, p * 5, p * 2);
    ctx.fillRect(x - p, groundY - p * 6, p * 3, p);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillRect(x, groundY - p * 5, p, p);
    ctx.restore();
  }
}

function drawDock(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  riverY: number,
  night: boolean,
  time: number
) {
  const dockW = Math.min(210, w * 0.2);
  const dockX = w - w * 0.06 - dockW;
  const dockY = riverY + Math.min(60, (h - riverY) * 0.3);
  const plankH = Math.max(10, h * 0.014);

  ctx.fillStyle = "#2a170e";
  ctx.fillRect(dockX - 5, dockY - 5, dockW + 10, plankH + 10);
  ctx.fillStyle = "#80502e";
  ctx.fillRect(dockX, dockY, dockW, plankH);
  ctx.fillStyle = "#aa7040";
  for (let x = dockX + 5; x < dockX + dockW; x += 22) {
    ctx.fillRect(x, dockY + 2, 3, plankH - 4);
  }
  ctx.fillStyle = "#352116";
  ctx.fillRect(dockX + 8, dockY + plankH, 8, 32);
  ctx.fillRect(dockX + dockW - 16, dockY + plankH, 8, 32);

  // Rope knots and a slack mooring line make the dock feel occupied.
  ctx.fillStyle = "#d0aa6d";
  ctx.fillRect(dockX + 8, dockY - 4, 8, 5);
  ctx.fillRect(dockX + dockW - 16, dockY - 4, 8, 5);

  // A small moored pixel boat and its gentle ripple.
  const boatX = dockX + dockW * 0.55;
  const boatY = dockY + 34 + Math.sin(time * 0.002) * 2;
  ctx.fillStyle = "#25140d";
  ctx.fillRect(boatX, boatY, 54, 7);
  ctx.fillStyle = "#9a5630";
  ctx.fillRect(boatX + 7, boatY + 7, 40, 6);
  ctx.strokeStyle = "#c8a36b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dockX + dockW - 12, dockY + 2);
  ctx.quadraticCurveTo(boatX + 48, boatY - 9, boatX + 45, boatY + 5);
  ctx.stroke();
  ctx.fillStyle = night ? "rgba(90, 211, 214, 0.32)" : "rgba(220, 247, 255, 0.4)";
  ctx.fillRect(boatX - 7, boatY + 18, 68, 3);

  if (night) {
    drawRiverLantern(ctx, dockX + 12, dockY - 5, 1, time);
  }

  drawWaterRings(ctx, boatX + 28, boatY + 17, time, night, 1.1);
}

function drawWaterRings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  night: boolean,
  scale = 1
) {
  const phase = (time * 0.025) % 26;
  ctx.fillStyle = night ? "rgba(92, 205, 224, 0.28)" : "rgba(225, 248, 255, 0.45)";
  for (let ring = 0; ring < 3; ring++) {
    const radius = (phase + ring * 9) % 27;
    const width = Math.max(5, radius * 1.8 * scale);
    ctx.globalAlpha = 1 - radius / 31;
    ctx.fillRect(x - width / 2, y + ring * 5, width, 2);
  }
  ctx.globalAlpha = 1;
}

const FISH_COLORS = [
  { body: "#f2a442", fin: "#d87932" },
  { body: "#8fd9d7", fin: "#4d9fa8" },
  { body: "#e68170", fin: "#ad4f55" },
] as const;

function getNextFishDelay() {
  return 1600 + Math.random() * 4600;
}

function createJumpingFish(): JumpingFishData {
  const color = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
  const startXRatio = 0.81 + Math.random() * 0.035;
  return {
    progress: 0,
    duration: 1350 + Math.random() * 850,
    startXRatio,
    endXRatio: Math.min(0.975, startXRatio + 0.105 + Math.random() * 0.035),
    depthRatio: 0.79 + Math.random() * 0.12,
    jumpHeight: 25 + Math.random() * 13,
    body: color.body,
    fin: color.fin,
  };
}

function drawJumpingFish(
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  time: number,
  dt: number,
) {
  if (state.performanceMode) {
    state.jumpingFish = null;
    state.nextFishJumpAt = time + getNextFishDelay();
    return;
  }

  if (!state.jumpingFish && time >= state.nextFishJumpAt) {
    state.jumpingFish = createJumpingFish();
  }

  const swimmer = state.jumpingFish;
  if (!swimmer) return;

  swimmer.progress = Math.min(1, swimmer.progress + dt / swimmer.duration);
  const progress = swimmer.progress;

  const { width: w, height: h, dpr } = state;
  const riverY = getRiverY(state.groundY, h);
  const startX = w * swimmer.startXRatio;
  const endX = w * swimmer.endXRatio;
  const baseY = Math.min(
    riverY + (h - riverY) * swimmer.depthRatio,
    h - 25 * dpr,
  );
  const jumpHeight = Math.min(swimmer.jumpHeight * dpr, (h - riverY) * 0.18);
  const pixel = Math.max(2, Math.round(1.5 * dpr));
  const x = startX + (endX - startX) * progress;
  const y = baseY - Math.sin(progress * Math.PI) * jumpHeight;
  const angle = -0.58 + progress * 1.16;
  const splashStrength =
    progress < 0.13
      ? 1 - progress / 0.13
      : progress > 0.87
        ? (progress - 0.87) / 0.13
        : 0;

  if (splashStrength > 0) {
    ctx.save();
    ctx.globalAlpha = splashStrength * 0.66;
    ctx.fillStyle = state.nightMode ? "#69cfe2" : "#d5f5ff";
    ctx.fillRect(x - 8 * pixel, baseY + pixel, 16 * pixel, pixel);
    ctx.fillRect(x - 4 * pixel, baseY - 2 * pixel, 2 * pixel, 2 * pixel);
    ctx.fillRect(x + 3 * pixel, baseY - 3 * pixel, 2 * pixel, 2 * pixel);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);

  ctx.fillStyle = swimmer.fin;
  ctx.fillRect(-5 * pixel, -2 * pixel, 2 * pixel, 4 * pixel);
  ctx.fillRect(-4 * pixel, -3 * pixel, 2 * pixel, 2 * pixel);
  ctx.fillRect(-4 * pixel, pixel, 2 * pixel, 2 * pixel);

  ctx.fillStyle = swimmer.body;
  ctx.fillRect(-3 * pixel, -2 * pixel, 5 * pixel, 4 * pixel);
  ctx.fillRect(2 * pixel, -pixel, 2 * pixel, 2 * pixel);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fillRect(-2 * pixel, -2 * pixel, 3 * pixel, pixel);
  ctx.fillStyle = "#13243a";
  ctx.fillRect(2 * pixel, -pixel, pixel, pixel);

  ctx.restore();

  if (progress >= 1) {
    state.jumpingFish = null;
    state.nextFishJumpAt = time + getNextFishDelay();
  }
}

function drawSceneReflections(
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  time: number
) {
  const riverY = getRiverY(state.groundY, state.height);
  const depth = Math.max(50, state.height - riverY);

  const reflect = (x: number, color: string, strength: number, seed: number) => {
    for (let row = 0; row < 7; row++) {
      const y = riverY + 10 + row * Math.max(8, depth * 0.06);
      const shimmer = Math.sin(time * 0.003 + seed + row) * 4;
      const width = 7 + row * 5 + shimmer;
      ctx.fillStyle = color;
      ctx.globalAlpha = strength * (1 - row / 8);
      ctx.fillRect(x - width / 2, y, width, 2 + (row % 2));
    }
  };

  for (const light of state.streetLights) {
    reflect(light.x, "#f6ca58", state.nightMode ? 0.52 : 0.18, light.x);
  }
  for (const npc of state.npcs) {
    if (npc.activity === "village") {
      reflect(npc.x, npc.shirtColor, state.nightMode ? 0.18 : 0.13, npc.momentPhase);
    }
  }
  ctx.globalAlpha = 1;
}

function drawMoonReflection(
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  time: number,
) {
  if (!state.nightMode) return;

  const riverY = getRiverY(state.groundY, state.height);
  const depth = state.height - riverY;
  const moonX = state.width * 0.78;
  const rows = state.performanceMode ? 7 : 12;

  ctx.save();
  for (let row = 0; row < rows; row++) {
    const progress = row / Math.max(1, rows - 1);
    const y = riverY + 12 + progress * depth * 0.72;
    const sway = Math.sin(time * 0.0015 + row * 1.8) * (3 + progress * 8);
    const width = 14 + progress * 48 + Math.sin(time * 0.0022 + row) * 5;
    const alpha = (0.34 - progress * 0.18) * (0.78 + Math.sin(time * 0.001 + row) * 0.18);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = row % 3 === 0 ? "#d7eaff" : "#8fcce2";
    ctx.fillRect(moonX + sway - width / 2, y, width * 0.38, 2 + (row % 2));
    ctx.fillRect(moonX + sway + width * 0.08, y, width * 0.42, 2 + (row % 2));
  }
  ctx.restore();
}

function drawCharacterRim(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  const p = Math.max(2, Math.floor(2 * scale));
  const shimmer = 0.12 + (Math.sin(time * 0.0017 + x * 0.02) + 1) * 0.035;
  ctx.save();
  ctx.globalAlpha = shimmer;
  ctx.fillStyle = "#7ce7dc";
  ctx.fillRect(x - p * 2.2, y - p * 9.2, p * 0.8, p * 8.7);
  ctx.fillRect(x + p * 1.4, y - p * 8.2, p * 0.8, p * 7.7);
  ctx.fillRect(x - p * 1.2, y - p * 10, p * 2.4, p * 0.7);
  ctx.restore();
}

function addReaction(
  state: WorldState,
  x: number,
  y: number,
  kind: ReactionData["kind"]
) {
  state.reactions.push({ x, y, life: 0, kind });
  if (state.reactions.length > 12) state.reactions.shift();
}

function drawReactions(state: WorldState, dt: number) {
  const { ctx } = state;
  for (let index = state.reactions.length - 1; index >= 0; index--) {
    const reaction = state.reactions[index];
    reaction.life += dt;
    if (reaction.life > 1400) {
      state.reactions.splice(index, 1);
      continue;
    }

    const y = reaction.y - reaction.life * 0.018;
    const pulse = reaction.life < 180 ? 1.25 : 1;
    const p = Math.max(3, Math.round(3 * state.dpr * pulse));
    ctx.globalAlpha = Math.min(1, (1400 - reaction.life) / 350);

    if (reaction.kind === "heart") {
      ctx.fillStyle = "#ff718c";
      ctx.fillRect(reaction.x - p * 2, y, p * 2, p);
      ctx.fillRect(reaction.x + p, y, p * 2, p);
      ctx.fillRect(reaction.x - p * 3, y + p, p * 6, p * 2);
      ctx.fillRect(reaction.x - p * 2, y + p * 3, p * 4, p);
      ctx.fillRect(reaction.x - p, y + p * 4, p * 2, p);
    } else if (reaction.kind === "note") {
      ctx.fillStyle = "#f5c542";
      ctx.fillRect(reaction.x, y, p, p * 5);
      ctx.fillRect(reaction.x, y, p * 3, p);
      ctx.fillRect(reaction.x + p * 2, y, p, p * 3);
      ctx.fillRect(reaction.x - p, y + p * 4, p * 2, p * 2);
    } else {
      ctx.fillStyle = "#fff1a8";
      ctx.fillRect(reaction.x - p * 3, y + p, p * 7, p);
      ctx.fillRect(reaction.x, y - p * 2, p, p * 7);
      ctx.fillStyle = "#f5c542";
      ctx.fillRect(reaction.x - p, y, p * 3, p * 3);
    }
  }
  ctx.globalAlpha = 1;
}

function updateInteractionCursor(state: WorldState) {
  const { mouseX: x, mouseY: y } = state.input;
  if (x < 0 || y < 0) {
    state.canvas.style.cursor = "default";
    return;
  }

  const riverY = getRiverY(state.groundY, state.height);
  const visitorPosition = getBridgeVisitorPosition(state);
  const nearNpc = state.npcs.some((npc) => {
    if (npc.activity === "bridge") {
      return visitorPosition
        ? Math.abs(x - visitorPosition.x) < 46 &&
            y > visitorPosition.y - 86 * visitorPosition.scale &&
            y < visitorPosition.y + 20
        : false;
    }
    const npcY = npc.activity === "dock"
        ? riverY + Math.min(60, (state.height - riverY) * 0.3)
        : state.groundY;
    return Math.abs(x - npc.x) < 42 && y > npcY - 76 && y < npcY + 18;
  });
  const bridgeDogIndex =
    visitorPosition && state.bridgeVisitor.withDog
      ? state.bridgeVisitor.dogIndex
      : -1;
  const nearBridgeDog =
    bridgeDogIndex >= 0 && visitorPosition
      ? Math.abs(x - visitorPosition.x) < 58 &&
        y > visitorPosition.y - 64 * visitorPosition.scale &&
        y < visitorPosition.y + 22
      : false;
  const nearAnimal =
    state.cats.some((cat) => Math.abs(x - cat.x) < 32 && Math.abs(y - cat.y) < 38) ||
    nearBridgeDog ||
    state.dogs.some(
      (dog, index) =>
        index !== bridgeDogIndex && Math.abs(x - dog.x) < 38 && Math.abs(y - dog.y) < 42,
    ) ||
    state.horses.some((horse) => Math.abs(x - horse.x) < 58 && Math.abs(y - state.groundY) < 72);
  const nearShop = state.shops.some((shop) => {
    if (shop.variant !== 3) return false;
    const s = Math.floor(4 * shop.scale);
    return x >= shop.x && x <= shop.x + s * 14 && y >= state.groundY - s * 12 && y <= state.groundY;
  });

  state.canvas.style.cursor = nearNpc || nearAnimal || nearShop ? "pointer" : "default";
}

function drawBridge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  riverY: number,
  night: boolean,
  time: number,
  runesActive: boolean,
) {
  const centerX = w / 2;
  const topY = riverY - 8;
  const bottomY = h + 18;
  const topHalf = Math.max(30, Math.min(62, w * 0.055));
  const bottomHalf = Math.max(90, Math.min(260, w * 0.22));

  ctx.fillStyle = "#1d120d";
  ctx.beginPath();
  ctx.moveTo(centerX - topHalf - 7, topY);
  ctx.lineTo(centerX + topHalf + 7, topY);
  ctx.lineTo(centerX + bottomHalf + 12, bottomY);
  ctx.lineTo(centerX - bottomHalf - 12, bottomY);
  ctx.closePath();
  ctx.fill();

  const plankCount = 12;
  for (let index = 0; index < plankCount; index++) {
    const t0 = index / plankCount;
    const t1 = (index + 1) / plankCount;
    const y0 = topY + (bottomY - topY) * t0;
    const y1 = topY + (bottomY - topY) * t1 - 2;
    const half0 = topHalf + (bottomHalf - topHalf) * t0;
    const half1 = topHalf + (bottomHalf - topHalf) * t1;
    ctx.fillStyle = index % 2 === 0 ? "#6f4328" : "#825033";
    ctx.beginPath();
    ctx.moveTo(centerX - half0, y0);
    ctx.lineTo(centerX + half0, y0);
    ctx.lineTo(centerX + half1, y1);
    ctx.lineTo(centerX - half1, y1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(235, 164, 83, 0.2)";
    ctx.fillRect(centerX - half0 + 7, y0 + 3, Math.max(4, half0 * 0.28), 2);
  }

  if (night) {
    const runeRows = [0.3, 0.52, 0.72];
    const activePulse = runesActive
      ? 0.5 + (Math.sin(time * 0.0035) + 1) * 0.15
      : 0.13;
    ctx.save();
    ctx.globalAlpha = activePulse;
    ctx.fillStyle = "#6ee7d5";
    for (const [index, progress] of runeRows.entries()) {
      const y = topY + (bottomY - topY) * progress;
      const half = topHalf + (bottomHalf - topHalf) * progress;
      const p = Math.max(2, Math.round((2 + progress * 3) * (w / Math.max(w, 900))));
      const side = index % 2 === 0 ? -1 : 1;
      const x = centerX + side * half * 0.58;
      ctx.fillRect(x, y - p * 2, p, p);
      ctx.fillRect(x - p, y - p, p, p);
      ctx.fillRect(x + p, y - p, p, p);
      ctx.fillRect(x - p * 2, y, p, p);
      ctx.fillRect(x + p * 2, y, p, p);
      ctx.fillRect(x - p, y + p, p, p);
      ctx.fillRect(x + p, y + p, p, p);
      ctx.fillRect(x, y + p * 2, p, p);
    }
    ctx.restore();
  }

  // Rails and posts exaggerate the perspective toward the foreground.
  for (const side of [-1, 1]) {
    ctx.strokeStyle = "#24140d";
    ctx.lineWidth = Math.max(5, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(centerX + side * (topHalf + 8), topY - 14);
    ctx.lineTo(centerX + side * (bottomHalf + 18), bottomY - 28);
    ctx.stroke();

    for (let index = 0; index < 5; index++) {
      const t = index / 4;
      const y = topY + (bottomY - topY) * t;
      const half = topHalf + (bottomHalf - topHalf) * t;
      const postW = 5 + t * 8;
      const postH = 18 + t * 32;
      ctx.fillStyle = "#2b190f";
      ctx.fillRect(centerX + side * (half + 5) - postW / 2, y - postH, postW, postH + 8);
      ctx.fillStyle = "#8e5730";
      ctx.fillRect(centerX + side * (half + 5) - postW / 2 + 2, y - postH + 3, Math.max(2, postW - 4), postH - 2);
    }
  }

  if (night) {
    drawRiverLantern(ctx, centerX - topHalf - 8, topY - 22, 0.9, time);
    drawRiverLantern(ctx, centerX + topHalf + 8, topY - 22, 0.9, time + 400);
  }
}

function drawRiverLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number
) {
  const glow = 0.18 + (Math.sin(time * 0.005) + 1) * 0.04;
  ctx.fillStyle = `rgba(245, 197, 66, ${glow})`;
  ctx.fillRect(x - 18 * scale, y - 18 * scale, 36 * scale, 36 * scale);
  ctx.fillStyle = "#2a170e";
  ctx.fillRect(x - 7 * scale, y - 8 * scale, 14 * scale, 18 * scale);
  ctx.fillStyle = "#f5c542";
  ctx.fillRect(x - 4 * scale, y - 5 * scale, 8 * scale, 10 * scale);
  ctx.fillStyle = "#fff1a8";
  ctx.fillRect(x - 2 * scale, y - 3 * scale, 3 * scale, 5 * scale);
}

function drawForegroundPlants(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  night: boolean,
  time: number
) {
  for (const side of [-1, 1]) {
    const baseX = side === -1 ? 18 : w - 18;
    for (let index = 0; index < 8; index++) {
      const direction = side === -1 ? 1 : -1;
      const sway = Math.round(Math.sin(time * 0.0018 + index * 0.75) * 2);
      const x = baseX + direction * index * 13 + sway;
      const stemH = 20 + (index % 4) * 9;
      ctx.fillStyle = night ? "#17483f" : "#2d7b55";
      ctx.fillRect(x, h - stemH, 4, stemH);
      ctx.fillRect(x + direction * 4, h - stemH + 5, 8 * direction, 4);
      if (index % 3 === 0) {
        if (night) {
          ctx.save();
          ctx.globalAlpha = 0.14 + (Math.sin(time * 0.0015 + index) + 1) * 0.025;
          ctx.fillStyle = index % 2 === 0 ? "#72e5ce" : "#a792ff";
          ctx.fillRect(x - 7, h - stemH - 9, 18, 14);
          ctx.restore();
        }
        ctx.fillStyle = night
          ? index % 2 === 0 ? "#72e5ce" : "#a792ff"
          : "#f1ce69";
        ctx.fillRect(x - 2, h - stemH - 4, 8, 5);
      }
    }
  }
}

function drawRiverMoments(
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  time: number,
  dt: number
) {
  const riverY = getRiverY(state.groundY, state.height);
  const bridgeNpc = state.npcs.find((npc) => npc.activity === "bridge");
  const dockNpc = state.npcs.find((npc) => npc.activity === "dock");

  updateBridgeVisitor(state, dt);
  const visitorPosition = getBridgeVisitorPosition(state);
  if (bridgeNpc && visitorPosition) {
    bridgeNpc.x = visitorPosition.x;
    const towardCamera = state.bridgeVisitor.phase !== "returning";
    if (state.nightMode) {
      drawCharacterRim(
        ctx,
        visitorPosition.x,
        visitorPosition.y,
        bridgeNpc.scale * visitorPosition.scale,
        time,
      );
    }
    drawNPCOnBridge(
      ctx,
      visitorPosition.x,
      visitorPosition.y,
      bridgeNpc.scale * visitorPosition.scale,
      bridgeNpc.walkFrame,
      bridgeNpc.skinColor,
      bridgeNpc.shirtColor,
      towardCamera
    );

    if (state.bridgeVisitor.withDog) {
      const dog = state.dogs[state.bridgeVisitor.dogIndex];
      if (dog) {
        const dogX = visitorPosition.x - state.bridgeVisitor.lane * (12 + visitorPosition.scale * 8);
        drawDogOnBridge(
          ctx,
          dogX,
          visitorPosition.y + 5 * visitorPosition.scale,
          dog.scale * visitorPosition.scale * 0.86,
          dog.color,
          bridgeNpc.walkFrame,
          towardCamera
        );
      }
    }
  }

  if (dockNpc) {
    const dockW = Math.min(210, state.width * 0.2);
    const dockX = state.width - state.width * 0.06 - dockW;
    const dockY = riverY + Math.min(60, (state.height - riverY) * 0.3);
    dockNpc.x = dockX + dockW * 0.65;
    if (state.nightMode) {
      drawCharacterRim(ctx, dockNpc.x, dockY - 2, dockNpc.scale * 0.92, time);
    }
    drawNPC(
      ctx,
      dockNpc.x,
      dockY - 2,
      dockNpc.scale * 0.92,
      1,
      dockNpc.walkFrame,
      dockNpc.skinColor,
      dockNpc.shirtColor,
      "sit"
    );
    drawWaterRings(ctx, dockNpc.x + 14, dockY + 26, time + 900, state.nightMode, 0.8);
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
      if (!plane.active) continue;
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
    if (!plane.active) {
      plane.cooldown -= dt;
      if (plane.cooldown <= 0) {
        plane.active = true;
        plane.progress = 0;
        plane.facing = Math.random() > 0.5 ? 1 : -1;
        plane.baseY = state.height * (0.17 + Math.random() * 0.08);
        plane.duration = 18000 + Math.random() * 6000;
        plane.scale = 1.05 + Math.random() * 0.18;
        plane.bobPhase = Math.random() * Math.PI * 2;
      }
      continue;
    }

    plane.progress = Math.min(1, plane.progress + dt / plane.duration);
    const eased = plane.progress * plane.progress * (3 - 2 * plane.progress);
    const startX = plane.facing > 0 ? -220 : state.width + 220;
    const endX = plane.facing > 0 ? state.width + 220 : -220;
    plane.x = startX + (endX - startX) * eased;
    const gentleArc = Math.sin(plane.progress * Math.PI) * state.height * 0.018;
    const airDrift = Math.sin(time * 0.0009 + plane.bobPhase) * 3 * state.dpr;
    plane.y = plane.baseY - gentleArc + airDrift;

    if (plane.progress >= 1) {
      plane.active = false;
      plane.cooldown = 22000 + Math.random() * 28000;
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
    if (npc.activity !== "village") {
      npc.walkFrame += dt * 0.002;
      continue;
    }

    if (npc.idleTimer > 0) {
      npc.idleTimer -= dt;
      continue;
    }
    npc.atShop = false;
    npc.atLamp = false;

    const dx = npc.targetX - npc.x;
    const dist = Math.abs(dx);

    if (dist < 8) {
      const nearShop = state.shops.find(
        (s) => Math.abs(s.centerX - npc.x) < 60
      );
      const nearLamp = state.streetLights.find(
        (light) => Math.abs(light.x - npc.x) < 42
      );
      if (nearLamp) {
        npc.idleTimer = 3000 + Math.random() * 4500;
        npc.atLamp = true;
      } else if (nearShop && Math.random() > 0.3) {
        npc.idleTimer = 2000 + Math.random() * 4000;
        npc.atShop = true;
      } else {
        npc.idleTimer = 500 + Math.random() * 1500;
      }

      const visitLamp = state.streetLights.length && Math.random() < 0.35;
      const nextLamp = visitLamp
        ? state.streetLights[Math.floor(Math.random() * state.streetLights.length)]
        : null;
      const nextShop = !nextLamp && state.shops.length && Math.random() > 0.3
          ? state.shops[Math.floor(Math.random() * state.shops.length)]
          : null;
      npc.targetX = nextLamp
        ? nextLamp.x + (Math.random() - 0.5) * 24
        : nextShop
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

  if (Math.random() > (state.nightMode ? 0.965 : 0.7)) {
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
    if (!p.color.startsWith("rgba")) {
      ctx.globalAlpha = alpha * flicker * 0.16;
      ctx.fillStyle = p.color;
      ctx.fillRect(
        Math.floor(p.x - p.size * 2),
        Math.floor(p.y - p.size * 2),
        p.size * 5,
        p.size * 5,
      );
    }
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

  const dpr = getCanvasDpr();
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  const groundY = getGroundY(h);
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
    reactions: [],
    bridgeVisitor: createBridgeVisitor(),
    jumpingFish: null,
    nextFishJumpAt: performance.now() + 700 + Math.random() * 2200,
    groundSpeckles: createGroundSpeckles(w),
    groundY,
    scrollY: 0,
    nightMode: isNightTime(),
    performanceMode: false,
    soundEnabled: false,
    animFrame: 0,
    detach: null,
    musicPlayer: null,
  };

  const noop = () => {};
  const detachInput = attachInputHandlers(canvas, state.input, noop, noop);

  state.detach = () => {
    detachInput();
  };

  return state;
}

export function resizeWorld(state: WorldState) {
  const dpr = getCanvasDpr();
  const w = window.innerWidth * dpr;
  const h = window.innerHeight * dpr;
  state.canvas.width = w;
  state.canvas.height = h;
  state.canvas.style.width = window.innerWidth + "px";
  state.canvas.style.height = window.innerHeight + "px";
  state.width = w;
  state.height = h;
  state.dpr = dpr;
  state.groundY = getGroundY(h);
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
  state.reactions = [];
  state.bridgeVisitor = createBridgeVisitor();
  state.jumpingFish = null;
  state.nextFishJumpAt = performance.now() + 700 + Math.random() * 2200;
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
    drawMoon(ctx, w * 0.8, h * 0.12, 30, time);
  } else {
    drawSun(ctx, w * 0.15, h * 0.12, 28, time);

    updateAirplanes(state, dt, time);
    for (const plane of state.airplanes) {
      if (plane.active) {
        drawPassengerPlane(
          ctx,
          plane.x,
          plane.y,
          plane.scale,
          time,
          plane.facing,
          plane.progress,
        );
      }
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
    cloud.x += cloud.speed * (dt * (state.nightMode ? 0.018 : 0.05));
    if (cloud.x > w + 100) cloud.x = -200;
    drawCloud(
      ctx,
      cloud.x,
      cloud.y - state.scrollY * 0.05,
      cloud.scale,
      state.nightMode,
    );
  }

  drawMountains(ctx, w, groundY, state.scrollY, state.nightMode);
  for (const tree of state.trees) {
    drawTreeByType(ctx, tree, groundY);
  }

  drawGround(ctx, w, h, groundY, time, state.groundSpeckles, state.nightMode);
  drawEnchantedBankDetails(ctx, state, time);
  drawSceneReflections(ctx, state, time);
  drawMoonReflection(ctx, state, time);
  const riverY = getRiverY(groundY, h);
  drawDock(ctx, w, h, riverY, state.nightMode, time);
  drawBridge(
    ctx,
    w,
    h,
    riverY,
    state.nightMode,
    time,
    state.bridgeVisitor.phase !== "waiting",
  );
  drawForegroundPlants(ctx, w, h, state.nightMode, time);

  for (const shop of state.shops) {
    drawShop(ctx, shop.x, groundY, shop.variant, shop.scale, state.nightMode);
  }

  updateInteractionCursor(state);

  if (state.input.clickFired && state.onShopClick) {
    const cx = state.input.lastClickX;
    const cy = state.input.lastClickY;
    let handled = false;
    for (const shop of state.shops) {
      if (shop.variant !== 3) continue;
      const s = Math.floor(4 * shop.scale);
      const shopW = s * 14;
      const shopH = s * 12;
      const baseY = groundY - shopH;
      if (cx >= shop.x && cx <= shop.x + shopW && cy >= baseY && cy <= groundY) {
        state.onShopClick(shop.variant);
        handled = true;
        break;
      }
    }

    if (!handled) {
      for (const npc of state.npcs) {
        const visitorPosition =
          npc.activity === "bridge" ? getBridgeVisitorPosition(state) : null;
        if (npc.activity === "bridge" && !visitorPosition) continue;
        const npcX = visitorPosition?.x ?? npc.x;
        const npcY = visitorPosition?.y ?? (npc.activity === "dock"
            ? riverY + Math.min(60, (h - riverY) * 0.3)
            : groundY);
        const hitScale = visitorPosition?.scale ?? 1;
        if (
          Math.abs(cx - npcX) < 38 * hitScale &&
          cy > npcY - 72 * hitScale &&
          cy < npcY + 18
        ) {
          npc.idleTimer = 1800;
          npc.atLamp = true;
          npc.facing = cx >= npc.x ? 1 : -1;
          addReaction(state, npcX, npcY - 78 * hitScale, "spark");
          handled = true;
          break;
        }
      }
    }

    if (!handled) {
      const visitorPosition = getBridgeVisitorPosition(state);
      if (visitorPosition && state.bridgeVisitor.withDog) {
        const dog = state.dogs[state.bridgeVisitor.dogIndex];
        if (
          dog &&
          Math.abs(cx - visitorPosition.x) < 52 * visitorPosition.scale &&
          cy > visitorPosition.y - 58 * visitorPosition.scale &&
          cy < visitorPosition.y + 22
        ) {
          addReaction(
            state,
            visitorPosition.x,
            visitorPosition.y - 64 * visitorPosition.scale,
            "heart",
          );
          handled = true;
        }
      }
    }

    if (!handled) {
      const cat = state.cats.find(
        (candidate) => Math.abs(cx - candidate.x) < 30 && Math.abs(cy - candidate.y) < 34
      );
      if (cat) {
        cat.sleeping = !cat.sleeping;
        addReaction(state, cat.x, cat.y - 44, "heart");
        handled = true;
      }
    }

    if (!handled) {
      const dog = state.dogs.find(
        (candidate, index) =>
          !(
            state.bridgeVisitor.phase !== "waiting" &&
            state.bridgeVisitor.withDog &&
            index === state.bridgeVisitor.dogIndex
          ) &&
          Math.abs(cx - candidate.x) < 34 &&
          Math.abs(cy - candidate.y) < 38,
      );
      if (dog) {
        dog.idleTimer = 1800;
        dog.tailPhase += Math.PI;
        addReaction(state, dog.x, dog.y - 52, "heart");
        handled = true;
      }
    }

    if (!handled) {
      const horse = state.horses.find(
        (candidate) => Math.abs(cx - candidate.x) < 54 && Math.abs(cy - groundY) < 66
      );
      if (horse) {
        horse.idleTimer = 1800;
        addReaction(state, horse.x, groundY - 78, "note");
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
    if (npc.activity !== "village") continue;
    const pose = npc.atLamp
      ? "wave"
      : npc.atShop || npc.idleTimer > 0
        ? "idle"
        : "walk";
    if (state.nightMode) {
      drawCharacterRim(ctx, npc.x, groundY, npc.scale, time);
    }
    drawNPC(
      ctx,
      npc.x,
      groundY,
      npc.scale,
      npc.facing,
      npc.walkFrame,
      npc.skinColor,
      npc.shirtColor,
      pose
    );
  }

  drawRiverMoments(ctx, state, time, dt);
  drawJumpingFish(ctx, state, time, dt);

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
  const bridgeDogIndex =
    state.bridgeVisitor.phase !== "waiting" && state.bridgeVisitor.withDog
      ? state.bridgeVisitor.dogIndex
      : -1;
  for (const [index, dog] of state.dogs.entries()) {
    if (index === bridgeDogIndex) continue;
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

  drawReactions(state, dt);

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

export function setWorldSoundEnabled(state: WorldState, enabled: boolean) {
  state.soundEnabled = enabled;
  if (enabled) {
    if (!state.musicPlayer) state.musicPlayer = new MusicPlayer();
    state.musicPlayer.start();
  } else if (state.musicPlayer?.playing) {
    state.musicPlayer.stop();
  }
}
