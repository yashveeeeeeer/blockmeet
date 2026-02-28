import { PAL } from "./palette";

// ── HELPERS ──────────────────────────────────────────────────────

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
}

// ── SKY ──────────────────────────────────────────────────────────

export function drawSun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number
) {
  const pulse = Math.sin(time * 0.001) * 2;
  ctx.fillStyle = PAL.sunGlow;
  ctx.beginPath();
  ctx.arc(x, y, size + 10 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.sun;
  const s = size;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.fillRect(x - s / 4, y - s * 0.7, s / 2, s * 1.4);
  ctx.fillRect(x - s * 0.7, y - s / 4, s * 1.4, s / 2);
}

export function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.fillStyle = PAL.moonGlow;
  ctx.beginPath();
  ctx.arc(x, y, size + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ddeeff";
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.fillStyle = "#bbccdd";
  ctx.fillRect(x - size / 4, y - size / 4, size / 6, size / 6);
  ctx.fillRect(x + size / 6, y, size / 5, size / 5);
  ctx.fillRect(x - size / 6, y + size / 6, size / 8, size / 8);
}

export function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  const s = Math.floor(8 * scale);
  ctx.fillStyle = PAL.cloud;
  ctx.fillRect(x, y, s * 3, s);
  ctx.fillRect(x + s * 0.5, y - s * 0.6, s * 2, s);
  ctx.fillRect(x + s, y - s, s, s * 0.6);
  ctx.fillStyle = PAL.cloudShadow;
  ctx.fillRect(x, y + s - 2, s * 3, 2);
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brightness: number
) {
  ctx.fillStyle =
    brightness > 0.7 ? PAL.star : brightness > 0.3 ? PAL.starDim : "#666688";
  const size = brightness > 0.7 ? 3 : brightness > 0.3 ? 2 : 1;
  ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
}

// ── BIRD (solid connected pixel art) ─────────────────────────────

export function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flapPhase: number,
  scale: number
) {
  const p = Math.floor(2 * scale);
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const wingAng = Math.sin(flapPhase);
  const wOff = Math.round(wingAng * p * 2);

  ctx.save();
  ctx.translate(bx, by);

  const body = "#2c2c42";
  const bodyH = "#3e3e5e";
  const belly = "#5a5a7e";
  const beak = "#e8a020";
  const eye = "#ffffff";
  const pupil = "#000000";
  const tail = "#222238";
  const wing = "#222238";
  const wingH = "#3a3a56";

  // tail (connected to body)
  ctx.fillStyle = tail;
  ctx.fillRect(-p * 4, -p, p * 2, p);
  ctx.fillRect(-p * 3, 0, p, p);
  ctx.fillRect(-p * 5, -p * 2, p, p);

  // body (solid oval block)
  ctx.fillStyle = body;
  ctx.fillRect(-p * 2, -p, p * 5, p * 3);
  ctx.fillRect(-p, -p * 2, p * 3, p);
  ctx.fillRect(-p, p * 2, p * 4, p);

  // body highlight
  ctx.fillStyle = bodyH;
  ctx.fillRect(-p, -p, p * 3, p);

  // belly
  ctx.fillStyle = belly;
  ctx.fillRect(-p, p, p * 3, p);

  // head (connected to body)
  ctx.fillStyle = body;
  ctx.fillRect(p * 3, -p * 2, p * 3, p * 3);
  ctx.fillStyle = bodyH;
  ctx.fillRect(p * 3, -p * 2, p * 2, p);

  // eye
  ctx.fillStyle = eye;
  ctx.fillRect(p * 4, -p, p * 1.2, p * 1.2);
  ctx.fillStyle = pupil;
  ctx.fillRect(p * 4.5, -p * 0.5, p * 0.5, p * 0.5);

  // beak (connected to head)
  ctx.fillStyle = beak;
  ctx.fillRect(p * 6, -p, p * 2, p);
  ctx.fillRect(p * 6, 0, p * 1.5, p);

  // wing (attached to body, flaps)
  ctx.fillStyle = wing;
  ctx.fillRect(-p, -p * 2 + wOff, p * 4, p);
  ctx.fillRect(0, -p * 3 + wOff, p * 3, p);
  ctx.fillStyle = wingH;
  ctx.fillRect(p, -p * 4 + wOff, p * 2, p);
  ctx.fillRect(p, -p * 3 + wOff, p, p);

  ctx.restore();
}

// ── PASSENGER AIRPLANE (day only) ────────────────────────────────

export function drawPassengerPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number
) {
  const p = Math.max(2, Math.floor(2 * scale));
  const bob = Math.sin(time * 0.002) * p * 0.2;
  const pxX = Math.floor(x);
  const pxY = Math.floor(y + bob);

  ctx.save();
  ctx.translate(pxX, pxY);

  const body = "#f3f5f8";
  const bodyShade = "#d9dee5";
  const stripe = "#cf3a3a";
  const wing = "#b5bcc7";
  const tailWing = "#a8b0bc";
  const windowColor = "#5e89c9";
  const engine = "#7f8896";

  // fuselage
  ctx.fillStyle = body;
  ctx.fillRect(-p * 16, -p * 2, p * 30, p * 4);
  ctx.fillRect(-p * 18, -p, p * 2, p * 2); // nose cap
  ctx.fillRect(p * 14, -p * 1.5, p * 3, p * 3); // tail cone
  ctx.fillStyle = bodyShade;
  ctx.fillRect(-p * 15, p, p * 29, p);

  // red livery stripe
  ctx.fillStyle = stripe;
  ctx.fillRect(-p * 14, -p * 0.4, p * 25, p * 0.8);

  // wings
  ctx.fillStyle = wing;
  ctx.fillRect(-p * 2, -p * 1.2, p * 11, p * 1.2);
  ctx.fillRect(-p * 4, p * 0.2, p * 12, p * 1.3);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(-p * 2, -p * 0.2, p * 11, p * 0.4);

  // engines (under wing)
  ctx.fillStyle = engine;
  ctx.fillRect(p * 1, p * 1.5, p * 2.3, p * 1.5);
  ctx.fillRect(p * 5, p * 1.6, p * 2.3, p * 1.5);

  // tail fin + stabilizer
  ctx.fillStyle = tailWing;
  ctx.fillRect(p * 11.5, -p * 4.2, p * 2.5, p * 3.4);
  ctx.fillRect(p * 10.8, -p * 1.3, p * 4.2, p * 1.1);

  // cockpit glass
  ctx.fillStyle = "#7fa2d9";
  ctx.fillRect(-p * 17.2, -p * 0.8, p * 1.3, p * 1.6);

  // passenger windows
  ctx.fillStyle = windowColor;
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(-p * 11 + i * p * 2.8, -p * 0.7, p * 0.9, p * 0.9);
  }

  // subtle shadow under aircraft
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(-p * 10, p * 3.2, p * 22, p * 0.8);

  ctx.restore();
}

// ── DRAGON (big ~100px, fire at night) ───────────────────────────

export function drawDragon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: number,
  flapPhase: number,
  _night: boolean,
  time: number
) {
  const p = Math.floor(3 * scale);
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  if (facing < 0) ctx.scale(-1, 1);

  const body = "#5c1a1a";
  const bodyL = "#7a2a2a";
  const belly = "#c4956a";
  const wing = "#8b2020";
  const wingL = "#a03030";
  const horn = "#f5c542";
  const eye = "#ff4444";

  // tail
  for (let i = 0; i < 6; i++) {
    const tx = -p * 3 - i * p * 2;
    const ty = Math.sin(i * 0.6 + time * 0.003) * p * 1.5;
    px(ctx, tx, ty, p * 2, body);
    if (i < 2) px(ctx, tx, ty + p, p * 2, belly);
  }
  // tail spike
  px(ctx, -p * 15, -p * 2, p, horn);
  px(ctx, -p * 16, -p * 3, p, horn);

  // body
  ctx.fillStyle = body;
  ctx.fillRect(-p * 3, -p * 3, p * 8, p * 6);
  ctx.fillStyle = bodyL;
  ctx.fillRect(-p * 2, -p * 2, p * 6, p * 4);
  ctx.fillStyle = belly;
  ctx.fillRect(-p, p, p * 5, p * 2);

  // back legs
  px(ctx, -p * 2, p * 3, p * 2, body);
  px(ctx, -p * 2, p * 5, p * 2, body);
  px(ctx, p * 2, p * 3, p * 2, body);
  px(ctx, p * 2, p * 5, p * 2, body);

  // neck
  ctx.fillStyle = body;
  ctx.fillRect(p * 5, -p * 5, p * 3, p * 6);
  ctx.fillStyle = belly;
  ctx.fillRect(p * 6, -p * 2, p * 2, p * 3);

  // head
  ctx.fillStyle = body;
  ctx.fillRect(p * 7, -p * 8, p * 5, p * 4);
  ctx.fillStyle = bodyL;
  ctx.fillRect(p * 8, -p * 7, p * 3, p * 2);

  // snout
  ctx.fillStyle = body;
  ctx.fillRect(p * 12, -p * 7, p * 3, p * 3);
  ctx.fillStyle = belly;
  ctx.fillRect(p * 12, -p * 5, p * 3, p);

  // jaw
  ctx.fillStyle = body;
  ctx.fillRect(p * 10, -p * 4, p * 5, p * 2);

  // nostrils
  px(ctx, p * 14, -p * 7, p, "#3a0a0a");

  // eye
  px(ctx, p * 10, -p * 7, p * 1.5, eye);
  px(ctx, p * 10.5, -p * 6.5, p * 0.5, "#000");

  // horns
  px(ctx, p * 8, -p * 9, p, horn);
  px(ctx, p * 8, -p * 10, p, horn);
  px(ctx, p * 10, -p * 9, p, horn);
  px(ctx, p * 10, -p * 10, p, horn);

  // wings (shoulder-anchored so they stay attached to body)
  const flap = Math.sin(flapPhase) * p * 3;
  const shoulderX = p * 0.8;
  const shoulderY = -p * 4.2;

  // back wing (smaller + darker, behind torso)
  ctx.fillStyle = "#6f1818";
  ctx.fillRect(shoulderX - p * 1.2, shoulderY - p * 1.2 + flap * 0.75, p * 2.2, p * 2);
  ctx.fillRect(shoulderX - p * 3.2, shoulderY - p * 3.6 + flap * 0.95, p * 3.4, p * 2.6);
  ctx.fillRect(shoulderX - p * 5.2, shoulderY - p * 6.4 + flap * 1.1, p * 3.8, p * 2.8);
  ctx.fillStyle = "#8f2828";
  ctx.fillRect(shoulderX - p * 6.2, shoulderY - p * 8 + flap * 1.15, p * 2.8, p * 2.2);

  // shoulder joint cap so wing appears fused to torso
  ctx.fillStyle = bodyL;
  ctx.fillRect(shoulderX - p * 0.4, shoulderY - p * 0.4, p * 1.6, p * 1.6);

  // front wing (main silhouette)
  ctx.fillStyle = wing;
  ctx.fillRect(shoulderX - p * 0.6, shoulderY - p * 1.5 + flap * 0.85, p * 2.4, p * 2.2);
  ctx.fillRect(shoulderX - p * 2.8, shoulderY - p * 4.6 + flap * 1.05, p * 4.2, p * 3);
  ctx.fillRect(shoulderX - p * 5.8, shoulderY - p * 8.2 + flap * 1.2, p * 5.4, p * 3.4);
  ctx.fillStyle = wingL;
  ctx.fillRect(shoulderX - p * 7.2, shoulderY - p * 10 + flap * 1.22, p * 4.4, p * 2.4);

  // membrane ribs from shoulder to wing tips
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(shoulderX - p * 1.1, shoulderY - p * 3 + flap * 0.95, p * 0.7, p * 5.2);
  ctx.fillRect(shoulderX - p * 3.4, shoulderY - p * 6 + flap * 1.1, p * 0.7, p * 5.8);
  ctx.fillRect(shoulderX - p * 5.5, shoulderY - p * 8 + flap * 1.22, p * 0.7, p * 5.6);

  // FIRE (always — dragon only appears at night)
  const fireColors = ["#ff4400", "#ff8800", "#ffcc00", "#ffee66"];
  for (let i = 0; i < 8; i++) {
    const fx = p * 15 + i * p * 1.5;
    const fy =
      -p * 5.5 + Math.sin(time * 0.01 + i * 0.8) * p * 1.5;
    const fs = p * (2.5 - i * 0.2);
    const fc = fireColors[Math.min(i, fireColors.length - 1)];
    ctx.globalAlpha = 1 - i * 0.1;
    px(ctx, fx, fy, fs, fc);
    px(ctx, fx + p, fy - p, fs * 0.6, fc);
    px(ctx, fx - p * 0.5, fy + p, fs * 0.4, fc);
  }
  ctx.globalAlpha = 1;

  // glow
  ctx.fillStyle = "rgba(255,100,0,0.15)";
  ctx.beginPath();
  ctx.arc(p * 20, -p * 5, p * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── WITCH ON BROOM ───────────────────────────────────────────────

export function drawWitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: number,
  time: number,
  landed: boolean
) {
  const p = Math.floor(2.5 * scale);
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  if (facing < 0) ctx.scale(-1, 1);

  const robe = "#2a1a3e";
  const robeL = "#3d2a5e";
  const robeH = "#4e3a70";
  const skin = "#c8e8c0";
  const skinS = "#a8c8a0";
  const hat = "#1a0e2e";
  const hatH = "#2a1e4e";
  const broom = "#7a4a20";
  const broomH = "#9a6a38";
  const broomStraw = "#d4a040";

  const bob = landed ? 0 : Math.sin(time * 0.003) * p;

  if (landed) {
    // broom held at side
    ctx.fillStyle = broom;
    ctx.fillRect(-p * 6, -p * 2, p * 4, p * 0.6);
    ctx.fillRect(-p * 6, -p * 1.5, p * 0.5, p * 5);
    ctx.fillStyle = broomStraw;
    ctx.fillRect(-p * 6.5, p * 3, p * 1.5, p * 2);
    ctx.fillStyle = "#c08830";
    ctx.fillRect(-p * 6.5, p * 4.5, p * 1.5, p * 0.5);

    // standing legs
    ctx.fillStyle = robe;
    ctx.fillRect(-p * 1, 0, p * 1.2, p * 3);
    ctx.fillRect(p * 0.5, 0, p * 1.2, p * 3);

    // shoes
    ctx.fillStyle = "#1a0e2e";
    ctx.fillRect(-p * 1.2, p * 2.5, p * 1.8, p * 0.8);
    ctx.fillRect(p * 0.3, p * 2.5, p * 1.8, p * 0.8);
  } else {
    // broom stick
    ctx.fillStyle = broom;
    ctx.fillRect(-p * 8, p * 0.5 + bob, p * 18, p * 0.8);
    ctx.fillStyle = broomH;
    ctx.fillRect(-p * 8, p * 0.5 + bob, p * 18, p * 0.3);

    // broom bristles
    ctx.fillStyle = broomStraw;
    ctx.fillRect(-p * 10, -p * 0.5 + bob, p * 3, p * 3);
    ctx.fillRect(-p * 11, 0 + bob, p * 2, p * 2);
    ctx.fillStyle = "#c08830";
    ctx.fillRect(-p * 10, p * 2 + bob, p * 3, p * 0.6);
    ctx.fillStyle = "#b07820";
    ctx.fillRect(-p * 10.5, p * 0.5 + bob, p, p * 1.5);

    // binding
    ctx.fillStyle = "#666";
    ctx.fillRect(-p * 8, p * 0.2 + bob, p, p * 1.2);

    // legs on broom
    ctx.fillStyle = robe;
    ctx.fillRect(-p * 1, p + bob, p * 1.5, p * 1.5);
    ctx.fillRect(p * 0.5, p * 0.5 + bob, p * 1.5, p * 1.5);

    // shoes dangling
    ctx.fillStyle = "#1a0e2e";
    ctx.fillRect(-p * 0.5, p * 2.2 + bob, p, p * 0.6);
    ctx.fillRect(p * 0.8, p * 1.8 + bob, p, p * 0.6);
  }

  // torso
  ctx.fillStyle = robe;
  ctx.fillRect(-p * 1.5, -p * 5 + bob, p * 4, p * 5);
  ctx.fillStyle = robeL;
  ctx.fillRect(-p, -p * 4.5 + bob, p * 3, p * 4);
  ctx.fillStyle = robeH;
  ctx.fillRect(-p * 0.5, -p * 4 + bob, p, p * 2);

  // belt
  ctx.fillStyle = "#555";
  ctx.fillRect(-p * 1.5, -p * 0.5 + bob, p * 4, p * 0.6);
  ctx.fillStyle = "#f5c542";
  ctx.fillRect(p * 0.2, -p * 0.6 + bob, p * 0.8, p * 0.8);

  // arms
  ctx.fillStyle = robe;
  if (landed) {
    ctx.fillRect(-p * 3, -p * 4 + bob, p * 1.5, p * 3);
    ctx.fillRect(p * 2.5, -p * 4 + bob, p * 1.5, p * 3);
    ctx.fillStyle = skin;
    ctx.fillRect(-p * 3, -p * 1.5 + bob, p * 1.2, p);
    ctx.fillRect(p * 2.8, -p * 1.5 + bob, p * 1.2, p);
  } else {
    ctx.fillRect(p * 2.5, -p * 3 + bob, p * 2.5, p);
    ctx.fillRect(-p * 3, -p * 3.5 + bob, p * 1.5, p * 2);
    ctx.fillStyle = skin;
    ctx.fillRect(p * 5, -p * 3 + bob, p, p);
    ctx.fillRect(-p * 3.5, -p * 2 + bob, p, p);
  }

  // head
  ctx.fillStyle = skin;
  ctx.fillRect(-p * 0.5, -p * 8.5 + bob, p * 3, p * 3.5);
  ctx.fillStyle = skinS;
  ctx.fillRect(p * 1.5, -p * 7 + bob, p, p * 2);

  // hair wisps
  ctx.fillStyle = "#2a1a1a";
  ctx.fillRect(-p * 1, -p * 8 + bob, p * 0.5, p * 2);
  ctx.fillRect(-p * 0.5, -p * 7.5 + bob, p * 0.3, p * 2.5);

  // eyes
  ctx.fillStyle = "#44ff44";
  ctx.fillRect(p * 0.3, -p * 7.2 + bob, p * 0.8, p * 0.8);
  ctx.fillRect(p * 1.5, -p * 7.2 + bob, p * 0.8, p * 0.8);
  ctx.fillStyle = "#000";
  ctx.fillRect(p * 0.5, -p * 7 + bob, p * 0.4, p * 0.4);
  ctx.fillRect(p * 1.7, -p * 7 + bob, p * 0.4, p * 0.4);

  // nose
  ctx.fillStyle = skinS;
  ctx.fillRect(p * 1, -p * 6.5 + bob, p * 0.5, p * 0.8);

  // grin
  ctx.fillStyle = "#2a0a2a";
  ctx.fillRect(p * 0.3, -p * 5.5 + bob, p * 1.5, p * 0.4);
  ctx.fillStyle = "#1a0a1a";
  ctx.fillRect(p * 0.5, -p * 5.5 + bob, p * 0.3, p * 0.3);
  ctx.fillRect(p * 1.2, -p * 5.5 + bob, p * 0.3, p * 0.3);

  // hat
  ctx.fillStyle = hat;
  ctx.fillRect(-p * 1.2, -p * 10 + bob, p * 4, p * 2);
  ctx.fillStyle = hatH;
  ctx.fillRect(-p * 0.5, -p * 11.5 + bob, p * 2.5, p * 2);
  ctx.fillStyle = hat;
  ctx.fillRect(0, -p * 13 + bob, p * 1.5, p * 2);
  ctx.fillRect(p * 0.3, -p * 14 + bob, p * 0.8, p * 1.2);

  // hat brim
  ctx.fillStyle = hat;
  ctx.fillRect(-p * 2.5, -p * 10 + bob, p * 6.5, p);
  ctx.fillStyle = hatH;
  ctx.fillRect(-p * 2, -p * 10 + bob, p * 5.5, p * 0.4);

  // hat buckle
  ctx.fillStyle = "#f5c542";
  ctx.fillRect(p * 0.2, -p * 10.2 + bob, p * 1.2, p * 1);
  ctx.fillStyle = "#d4a030";
  ctx.fillRect(p * 0.4, -p * 10 + bob, p * 0.8, p * 0.6);

  // cape
  ctx.fillStyle = robe;
  const cf = landed ? 0 : Math.sin(time * 0.005) * p;
  ctx.fillRect(-p * 2, -p * 4 + bob, p, p * 4 + cf * 0.5);
  ctx.fillRect(-p * 2.5, -p * 2 + bob + cf * 0.3, p, p * 2.5);
  ctx.fillStyle = robeH;
  ctx.fillRect(-p * 2, -p * 4 + bob, p * 0.4, p * 3);

  // sparkle trail (only when flying)
  if (!landed) {
    const sparkles = ["#aa66ff", "#cc88ff", "#8844dd", "#ffaaff"];
    for (let i = 0; i < 5; i++) {
      const sx = -p * 12 - i * p * 2.5;
      const sy = p * 0.5 + Math.sin(time * 0.008 + i * 1.2) * p * 1.5 + bob;
      const ss = p * (0.7 - i * 0.1);
      ctx.globalAlpha = 0.9 - i * 0.17;
      ctx.fillStyle = sparkles[i % sparkles.length];
      ctx.fillRect(Math.floor(sx), Math.floor(sy), ss, ss);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── CAT ──────────────────────────────────────────────────────────

export function drawCat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  sleeping: boolean,
  facing: number,
  night: boolean
) {
  const p = Math.floor(2 * scale);
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  if (facing < 0) ctx.scale(-1, 1);

  const dark = "#1a1a1a";

  if (sleeping) {
    // flat sleeping body
    ctx.fillStyle = color;
    ctx.fillRect(-p * 3, -p * 2, p * 6, p * 2);
    ctx.fillRect(-p * 4, -p * 1.5, p * 2, p * 1.5);

    // head tucked
    ctx.fillRect(p * 3, -p * 3, p * 3, p * 3);

    // ears
    px(ctx, p * 3, -p * 4, p, color);
    px(ctx, p * 5, -p * 4, p, color);

    // closed eyes (lines) — faint slit glow at night
    if (night) {
      ctx.fillStyle = "rgba(100, 255, 100, 0.3)";
      ctx.fillRect(p * 3.8, -p * 2.2, p * 1.6, p * 0.7);
    }
    ctx.fillStyle = night ? "#66aa66" : dark;
    ctx.fillRect(p * 4, -p * 2, p * 1.2, p * 0.3);

    // tail curled
    ctx.fillStyle = color;
    ctx.fillRect(-p * 5, -p * 3, p * 2, p);
    ctx.fillRect(-p * 6, -p * 4, p, p * 2);
  } else {
    // sitting body
    ctx.fillStyle = color;
    ctx.fillRect(-p, -p * 4, p * 3, p * 4);
    ctx.fillRect(-p * 0.5, -p * 3.5, p * 2, p * 3);

    // head
    ctx.fillRect(0, -p * 7, p * 3, p * 3);

    // ears (triangles)
    px(ctx, 0, -p * 8, p, color);
    px(ctx, p * 2, -p * 8, p, color);

    // inner ears
    px(ctx, 0, -p * 7.5, p * 0.5, "#ffaaaa");
    px(ctx, p * 2, -p * 7.5, p * 0.5, "#ffaaaa");

    // eyes (retina glow at night)
    const eyeColor = night ? "#aaffaa" : "#44cc44";
    if (night) {
      // outer radial glow
      const glowR = p * 2.5;
      const eye1cx = p * 0.85;
      const eye1cy = -p * 5.65;
      const eye2cx = p * 2.15;
      const eye2cy = -p * 5.65;

      for (const [ecx, ecy] of [[eye1cx, eye1cy], [eye2cx, eye2cy]]) {
        const grad = ctx.createRadialGradient(ecx, ecy, 0, ecx, ecy, glowR);
        grad.addColorStop(0, "rgba(100, 255, 100, 0.45)");
        grad.addColorStop(0.4, "rgba(80, 255, 80, 0.2)");
        grad.addColorStop(1, "rgba(60, 255, 60, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(ecx - glowR, ecy - glowR, glowR * 2, glowR * 2);
      }

      // bright eye fill
      ctx.fillStyle = "rgba(140, 255, 140, 0.55)";
      ctx.fillRect(p * 0.2, -p * 6.4, p * 1.4, p * 1.4);
      ctx.fillRect(p * 1.5, -p * 6.4, p * 1.4, p * 1.4);
    }
    px(ctx, p * 0.5, -p * 6, p * 0.7, eyeColor);
    px(ctx, p * 1.8, -p * 6, p * 0.7, eyeColor);
    px(ctx, p * 0.7, -p * 5.8, p * 0.3, night ? "#114411" : dark);
    px(ctx, p * 2, -p * 5.8, p * 0.3, night ? "#114411" : dark);

    // nose
    px(ctx, p * 1.2, -p * 5, p * 0.5, "#ffaaaa");

    // whiskers
    ctx.fillStyle = "#888";
    ctx.fillRect(p * 2.5, -p * 5.5, p * 1.5, p * 0.2);
    ctx.fillRect(p * 2.5, -p * 5, p * 1.5, p * 0.2);
    ctx.fillRect(-p * 0.5, -p * 5.5, -p * 1.5, p * 0.2);

    // front paws
    px(ctx, -p * 0.5, 0, p, color);
    px(ctx, p * 1.5, 0, p, color);

    // tail
    ctx.fillStyle = color;
    ctx.fillRect(-p * 2, -p * 3, p, p * 2);
    ctx.fillRect(-p * 3, -p * 4, p, p * 2);
    ctx.fillRect(-p * 3.5, -p * 5, p, p);
  }

  ctx.restore();
}

// ── DOG ──────────────────────────────────────────────────────────

export function drawDog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  facing: number,
  tailWag: number
) {
  const p = Math.floor(2 * scale);
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  if (facing < 0) ctx.scale(-1, 1);

  const dark = "#1a1a1a";
  const nose = "#3a2a1a";

  // body
  ctx.fillStyle = color;
  ctx.fillRect(-p * 2, -p * 4, p * 5, p * 3);
  ctx.fillRect(-p * 1.5, -p * 3.5, p * 4, p * 2.5);

  // legs
  px(ctx, -p * 1.5, -p, p, color);
  px(ctx, -p * 1.5, 0, p, color);
  px(ctx, p * 2, -p, p, color);
  px(ctx, p * 2, 0, p, color);

  // head
  ctx.fillStyle = color;
  ctx.fillRect(p * 3, -p * 6, p * 3, p * 3);
  ctx.fillRect(p * 3.5, -p * 5.5, p * 2, p * 2);

  // snout
  ctx.fillStyle = color;
  ctx.fillRect(p * 5.5, -p * 5, p * 2, p * 2);

  // nose
  px(ctx, p * 7, -p * 5, p, nose);

  // eye
  px(ctx, p * 4, -p * 5.5, p * 0.7, dark);

  // floppy ear
  ctx.fillStyle = color === "#c48440" ? "#a06830" : "#6a4a2a";
  ctx.fillRect(p * 3, -p * 4, p * 1.5, p * 2.5);

  // mouth line
  ctx.fillStyle = dark;
  ctx.fillRect(p * 6, -p * 3.5, p * 1.5, p * 0.3);

  // tongue
  ctx.fillStyle = "#ff6688";
  ctx.fillRect(p * 6.5, -p * 3, p, p);

  // tail (wagging)
  const tailAngle = Math.sin(tailWag) * 0.6;
  const tx = -p * 3;
  const ty = -p * 4 + tailAngle * p * 2;
  ctx.fillStyle = color;
  ctx.fillRect(tx, ty, p, p * 2);
  ctx.fillRect(tx - p * 0.5, ty - p, p, p);

  ctx.restore();
}

// ── TREES (3 types) ──────────────────────────────────────────────

export function drawOakTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  const s = Math.floor(4 * scale);
  ctx.fillStyle = PAL.treeTrunk;
  ctx.fillRect(x + s, y - s * 5, s, s * 5);

  ctx.fillStyle = PAL.treeLeaf;
  ctx.fillRect(x - s, y - s * 8, s * 4, s * 2);
  ctx.fillRect(x - s * 0.5, y - s * 10, s * 3, s * 2);
  ctx.fillRect(x, y - s * 11, s * 2, s * 1.5);

  ctx.fillStyle = PAL.treeLeafLight;
  ctx.fillRect(x - s * 0.5, y - s * 10, s, s);
  ctx.fillRect(x + s, y - s * 8, s, s);
}

export function drawPineTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  const s = Math.floor(4 * scale);

  ctx.fillStyle = PAL.treeTrunk;
  ctx.fillRect(x + s * 0.5, y - s * 4, s, s * 4);

  const green = "#2a7a4a";
  const greenL = "#3a9a6a";

  ctx.fillStyle = green;
  ctx.fillRect(x - s * 1.5, y - s * 6, s * 4, s * 2);
  ctx.fillRect(x - s, y - s * 8, s * 3, s * 2);
  ctx.fillRect(x - s * 0.5, y - s * 10, s * 2, s * 2);
  ctx.fillRect(x, y - s * 11.5, s, s * 1.5);

  ctx.fillStyle = greenL;
  ctx.fillRect(x - s * 0.5, y - s * 8, s, s);
  ctx.fillRect(x, y - s * 10, s, s);
  // snow caps
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(x - s * 0.5, y - s * 10, s * 2, s * 0.4);
  ctx.fillRect(x - s, y - s * 8, s * 3, s * 0.4);
}

export function drawBirchTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  const s = Math.floor(4 * scale);

  // thin white trunk with dark marks
  ctx.fillStyle = "#e8e0d0";
  ctx.fillRect(x + s * 0.3, y - s * 6, s * 0.6, s * 6);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x + s * 0.3, y - s * 5, s * 0.6, s * 0.3);
  ctx.fillRect(x + s * 0.3, y - s * 3, s * 0.6, s * 0.3);
  ctx.fillRect(x + s * 0.3, y - s * 1, s * 0.6, s * 0.3);

  // delicate leaves
  const leafG = "#8ac060";
  const leafL = "#a8d878";
  ctx.fillStyle = leafG;
  ctx.fillRect(x - s, y - s * 8.5, s * 3, s * 1.5);
  ctx.fillRect(x - s * 1.5, y - s * 7, s * 4, s * 1.5);
  ctx.fillRect(x - s, y - s * 5.5, s * 3, s * 0.8);

  ctx.fillStyle = leafL;
  ctx.fillRect(x - s * 0.5, y - s * 8.5, s, s);
  ctx.fillRect(x + s, y - s * 7, s, s);
}

export function drawFlowerBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  const s = Math.floor(3 * scale);

  ctx.fillStyle = "#3a8a5a";
  ctx.fillRect(x - s, y - s * 3, s * 3, s * 3);
  ctx.fillRect(x - s * 1.5, y - s * 2, s * 4, s * 2);

  ctx.fillStyle = "#4aba7a";
  ctx.fillRect(x, y - s * 3, s, s);

  const flowers = ["#ff6688", "#ffaa44", "#ff44aa", "#ffee44"];
  for (let i = 0; i < 3; i++) {
    const fx = x - s + i * s * 1.2 + Math.sin(i * 2) * s * 0.3;
    const fy = y - s * 2.5 - Math.abs(Math.sin(i * 1.5)) * s;
    px(ctx, fx, fy, s * 0.8, flowers[i % flowers.length]);
  }
}

// ── STREET LIGHT ─────────────────────────────────────────────────

export function drawStreetLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number,
  night: boolean,
  time: number
) {
  const s = Math.floor(3 * scale);
  const poleH = s * 14;
  const poleX = Math.floor(x);
  const poleTop = groundY - poleH;

  // base plate
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(poleX - s * 1.5, groundY - s, s * 3, s);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(poleX - s * 2, groundY - s * 0.4, s * 4, s * 0.5);

  // pole
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(poleX - s * 0.4, poleTop, s * 0.8, poleH);
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(poleX - s * 0.4, poleTop, s * 0.3, poleH);

  // decorative ring
  ctx.fillStyle = "#555";
  ctx.fillRect(poleX - s * 0.6, poleTop + poleH * 0.3, s * 1.2, s * 0.5);

  // arm (horizontal bracket)
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(poleX - s * 0.3, poleTop, s * 3.5, s * 0.6);
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(poleX - s * 0.3, poleTop, s * 3.5, s * 0.2);

  // curved bracket detail
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(poleX + s * 2.5, poleTop + s * 0.5, s * 0.5, s * 0.8);

  // lamp housing
  const lampX = poleX + s * 2;
  const lampY = poleTop + s * 0.6;
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(lampX - s * 0.3, lampY, s * 2, s * 0.5);

  if (night) {
    // lamp glass (lit)
    const flicker = 0.9 + Math.sin(time * 0.008) * 0.1;
    ctx.fillStyle = `rgba(255, 220, 120, ${flicker})`;
    ctx.fillRect(lampX, lampY + s * 0.5, s * 1.4, s * 2);

    // bright center
    ctx.fillStyle = `rgba(255, 240, 180, ${flicker})`;
    ctx.fillRect(lampX + s * 0.3, lampY + s * 0.8, s * 0.8, s * 1.2);

    // bottom cap
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(lampX - s * 0.2, lampY + s * 2.5, s * 1.8, s * 0.4);
  } else {
    // lamp glass (off — dark/grey)
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(lampX, lampY + s * 0.5, s * 1.4, s * 2);
    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(lampX + s * 0.3, lampY + s * 0.8, s * 0.8, s * 1.2);

    // bottom cap
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(lampX - s * 0.2, lampY + s * 2.5, s * 1.8, s * 0.4);
  }
}

export function drawLightGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number,
  time: number
) {
  const s = Math.floor(3 * scale);
  const poleH = s * 14;
  const lampX = Math.floor(x) + s * 2.7;
  const lampY = groundY - poleH + s * 1.5;
  const flicker = 0.85 + Math.sin(time * 0.008) * 0.15;

  ctx.save();

  // cone of light from lamp to ground
  const coneTopW = s * 3;
  const coneBottomW = s * 18;
  const coneH = poleH - s * 2;

  const grad = ctx.createRadialGradient(
    lampX, lampY, s * 2,
    lampX, lampY + coneH * 0.5, coneBottomW * 0.6
  );
  grad.addColorStop(0, `rgba(255, 220, 120, ${0.25 * flicker})`);
  grad.addColorStop(0.4, `rgba(255, 210, 100, ${0.12 * flicker})`);
  grad.addColorStop(1, "rgba(255, 200, 80, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(lampX - coneTopW / 2, lampY);
  ctx.lineTo(lampX - coneBottomW / 2, lampY + coneH);
  ctx.lineTo(lampX + coneBottomW / 2, lampY + coneH);
  ctx.lineTo(lampX + coneTopW / 2, lampY);
  ctx.closePath();
  ctx.fill();

  // ground pool of light
  const poolGrad = ctx.createRadialGradient(
    lampX, groundY, 0,
    lampX, groundY, coneBottomW * 0.5
  );
  poolGrad.addColorStop(0, `rgba(255, 220, 120, ${0.18 * flicker})`);
  poolGrad.addColorStop(0.5, `rgba(255, 210, 100, ${0.08 * flicker})`);
  poolGrad.addColorStop(1, "rgba(255, 200, 80, 0)");

  ctx.fillStyle = poolGrad;
  ctx.fillRect(
    lampX - coneBottomW * 0.5,
    groundY - s * 2,
    coneBottomW,
    s * 8
  );

  ctx.restore();
}

// ── TERRAIN ──────────────────────────────────────────────────────

export function drawGrassBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.fillStyle = PAL.dirt;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = PAL.dirtDark;
  ctx.fillRect(x, y + size - 3, size, 3);
  ctx.fillRect(x + size * 0.3, y + size * 0.4, 3, 3);
  ctx.fillRect(x + size * 0.7, y + size * 0.6, 2, 2);
  ctx.fillStyle = PAL.grassTop;
  ctx.fillRect(x, y, size, 4);
  ctx.fillStyle = PAL.grassMid;
  ctx.fillRect(x, y + 4, size, 2);
  ctx.fillStyle = PAL.grassDark;
  for (let i = 0; i < 3; i++) {
    const gx = x + Math.floor(size * 0.2 + i * size * 0.3);
    ctx.fillRect(gx, y - 2, 2, 3);
  }
}

export function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  col: number
) {
  ctx.fillStyle = PAL.water;
  ctx.fillRect(x, y, size, size);
  const shimmer = Math.sin(time * 0.003 + col * 0.5) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(106,176,249,${shimmer * 0.4})`;
  ctx.fillRect(x + 2, y + 2, size - 4, 3);
  const shimmer2 = Math.sin(time * 0.002 + col * 0.7 + 1.5) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(255,255,255,${shimmer2 * 0.15})`;
  ctx.fillRect(x + 4, y + size * 0.5, size - 8, 2);
}

// ── SHOP ─────────────────────────────────────────────────────────

export function drawShop(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  variant: number,
  scale: number
) {
  const s = Math.floor(4 * scale);
  const w = s * 14;
  const h = s * 12;
  const baseY = groundY - h;
  const wallColors = ["#c4956a", "#8b9dc3", "#c9a0dc", "#d4c4a8"];
  const roofColors = ["#e94560", "#4ecca3", "#f5c542", "#6a3d8a"];
  const vi = variant % wallColors.length;

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 3, groundY - 2, w, 4);
  ctx.fillStyle = wallColors[vi];
  ctx.fillRect(x, baseY + s * 3, w, h - s * 3);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x + w * 0.5, baseY + s * 3, w * 0.5, h - s * 3);
  ctx.fillStyle = roofColors[vi];
  ctx.fillRect(x - s, baseY + s, w + s * 2, s * 2.5);
  ctx.fillRect(x, baseY, w, s * 1.5);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x - s, baseY + s * 3, w + s * 2, s * 0.5);
  ctx.fillStyle = "#6ec6ff";
  ctx.fillRect(x + s * 2, baseY + s * 5, s * 3.5, s * 3.5);
  ctx.fillRect(x + s * 8, baseY + s * 5, s * 3.5, s * 3.5);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + s * 2, baseY + s * 5, s * 1.5, s * 1.5);
  ctx.fillRect(x + s * 8, baseY + s * 5, s * 1.5, s * 1.5);
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(x + s * 2 - 1, baseY + s * 5 - 1, s * 3.5 + 2, 1);
  ctx.fillRect(x + s * 2 - 1, baseY + s * 5 - 1, 1, s * 3.5 + 2);
  ctx.fillRect(x + s * 8 - 1, baseY + s * 5 - 1, s * 3.5 + 2, 1);
  ctx.fillRect(x + s * 8 - 1, baseY + s * 5 - 1, 1, s * 3.5 + 2);
  ctx.fillStyle = "#8B5A2B";
  const doorW = s * 3;
  const doorH = s * 4.5;
  const doorX = x + (w - doorW) / 2;
  const doorY = groundY - doorH;
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(doorX + doorW * 0.6, doorY + doorH * 0.45, s * 0.5, s * 0.5);
  // sign: solid dark plank with bright text
  const signW = s * 8;
  const signH = s * 2.5;
  const signX = x + (w - signW) / 2;
  const signY = baseY - s * 0.5;

  // dark wooden plank background
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(signX - 2, signY - 2, signW + 4, signH + 4);
  ctx.fillStyle = "#3d2a16";
  ctx.fillRect(signX, signY, signW, signH);

  // border highlight
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(signX, signY, signW, 2);
  ctx.fillRect(signX, signY, 2, signH);
  ctx.fillStyle = "#1a0e06";
  ctx.fillRect(signX, signY + signH - 2, signW, 2);
  ctx.fillRect(signX + signW - 2, signY, 2, signH);

  // hanging chains
  ctx.fillStyle = "#888";
  ctx.fillRect(signX + s, signY - s * 1.5, 2, s * 1.5);
  ctx.fillRect(signX + signW - s - 2, signY - s * 1.5, 2, s * 1.5);

  const labels = ["BAKERY", "POTIONS", "TOOLS", "ATHENAEUM"];
  const fontSize = Math.max(8, Math.floor(s * 1.6));
  ctx.fillStyle = "#ffffff";
  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labels[vi], signX + signW / 2, signY + signH / 2 + 1);

  // text shadow for extra clarity
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillText(labels[vi], signX + signW / 2 + 1, signY + signH / 2 + 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(labels[vi], signX + signW / 2, signY + signH / 2);

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

// ── HORSE WITH RIDER ─────────────────────────────────────────────

export function drawHorseWithRider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: number,
  walkFrame: number,
  horseColor: string,
  riderShirt: string,
  riderSkin: string
) {
  const p = Math.floor(3 * scale);
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  if (facing < 0) ctx.scale(-1, 1);

  const horseDark =
    horseColor === "#8b5a2b" ? "#6a4420" :
    horseColor === "#4a3a2a" ? "#2e241a" :
    "#6a5040";
  const mane = "#2a1a0e";
  const legCycle = Math.sin(walkFrame * 0.08);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(-p * 5, 1, p * 10, p);

  // back legs
  const blOff = legCycle * p * 1.2;
  ctx.fillStyle = horseDark;
  ctx.fillRect(-p * 3, -p * 1 - blOff * 0.5, p * 1.2, p * 3 + blOff * 0.5);
  ctx.fillRect(-p * 1.5, -p * 1 + blOff * 0.5, p * 1.2, p * 3 - blOff * 0.5);

  // hooves back
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-p * 3, p * 2 - blOff * 0.5 - p * 0.3, p * 1.2, p * 0.5);
  ctx.fillRect(-p * 1.5, p * 2 + blOff * 0.5 - p * 0.3, p * 1.2, p * 0.5);

  // body
  ctx.fillStyle = horseColor;
  ctx.fillRect(-p * 4, -p * 4, p * 9, p * 3.5);
  ctx.fillStyle = horseDark;
  ctx.fillRect(-p * 4, -p * 1.5, p * 9, p * 1);

  // belly highlight
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(-p * 3, -p * 1.5, p * 7, p * 0.5);

  // front legs
  const flOff = -legCycle * p * 1.2;
  ctx.fillStyle = horseColor;
  ctx.fillRect(p * 3, -p * 1 - flOff * 0.5, p * 1.2, p * 3 + flOff * 0.5);
  ctx.fillRect(p * 1.5, -p * 1 + flOff * 0.5, p * 1.2, p * 3 - flOff * 0.5);

  // hooves front
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(p * 3, p * 2 - flOff * 0.5 - p * 0.3, p * 1.2, p * 0.5);
  ctx.fillRect(p * 1.5, p * 2 + flOff * 0.5 - p * 0.3, p * 1.2, p * 0.5);

  // neck
  ctx.fillStyle = horseColor;
  ctx.fillRect(p * 4, -p * 7, p * 2.5, p * 4);
  ctx.fillStyle = horseDark;
  ctx.fillRect(p * 4, -p * 7, p * 0.8, p * 3);

  // head
  ctx.fillStyle = horseColor;
  ctx.fillRect(p * 5, -p * 9.5, p * 3, p * 3);
  ctx.fillRect(p * 7, -p * 8.5, p * 2, p * 2.5);

  // nostril
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(p * 8.5, -p * 7.5, p * 0.4, p * 0.4);

  // eye
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(p * 6.5, -p * 9, p * 0.6, p * 0.6);

  // ear
  ctx.fillStyle = horseColor;
  ctx.fillRect(p * 5.5, -p * 10.5, p * 0.8, p * 1.2);

  // mane
  ctx.fillStyle = mane;
  ctx.fillRect(p * 4.5, -p * 10, p * 1.2, p * 5);
  ctx.fillRect(p * 4, -p * 8, p * 0.8, p * 2);

  // tail
  const tailSway = Math.sin(walkFrame * 0.06) * p;
  ctx.fillStyle = mane;
  ctx.fillRect(-p * 4.5, -p * 4, p * 0.8, p * 2);
  ctx.fillRect(-p * 5 + tailSway * 0.3, -p * 3, p * 0.8, p * 2.5);
  ctx.fillRect(-p * 5.5 + tailSway * 0.5, -p * 1.5, p * 0.8, p * 2);

  // ── RIDER (sitting on horse back) ──
  const riderY = -p * 4;
  const rBob = Math.abs(Math.sin(walkFrame * 0.08)) * p * 0.3;

  // legs (straddling)
  ctx.fillStyle = "#3a3a6e";
  ctx.fillRect(-p * 1, riderY + p * 1 - rBob, p * 1, p * 2);
  ctx.fillRect(p * 1.5, riderY + p * 1 - rBob, p * 1, p * 2);

  // torso
  ctx.fillStyle = riderShirt;
  ctx.fillRect(-p * 0.5, riderY - p * 3 - rBob, p * 2.5, p * 3);

  // arms
  ctx.fillStyle = riderShirt;
  ctx.fillRect(-p * 1.5, riderY - p * 2.5 - rBob, p, p * 2);
  ctx.fillRect(p * 2, riderY - p * 2.5 - rBob, p, p * 2);

  // head
  ctx.fillStyle = riderSkin;
  ctx.fillRect(-p * 0.3, riderY - p * 5.5 - rBob, p * 2, p * 2.5);

  // eyes
  ctx.fillStyle = "#000";
  ctx.fillRect(p * 0.3, riderY - p * 4.5 - rBob, p * 0.4, p * 0.4);
  ctx.fillRect(p * 1, riderY - p * 4.5 - rBob, p * 0.4, p * 0.4);

  ctx.restore();
}

// ── NPC ──────────────────────────────────────────────────────────

export function drawNPC(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: number,
  walkFrame: number,
  skinColor: string,
  shirtColor: string,
  isIdle: boolean
) {
  const s = Math.floor(3 * scale);
  const flip = facing < 0 ? -1 : 1;
  const bobble = isIdle ? 0 : Math.abs(Math.sin(walkFrame * 0.1)) * s * 0.4;

  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y - bobble));
  if (flip < 0) ctx.scale(-1, 1);

  ctx.fillStyle = skinColor;
  ctx.fillRect(-s * 1.5, -s * 7, s * 3, s * 3);
  ctx.fillStyle = "#000000";
  ctx.fillRect(-s * 0.5, -s * 6, s * 0.7, s * 0.7);
  ctx.fillRect(s * 0.5, -s * 6, s * 0.7, s * 0.7);
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-s * 1.5, -s * 4, s * 3, s * 3);
  ctx.fillRect(-s * 2.5, -s * 4, s, s * 2.5);
  ctx.fillRect(s * 1.5, -s * 4, s, s * 2.5);

  if (isIdle) {
    ctx.fillStyle = "#3a3a6e";
    ctx.fillRect(-s, -s, s * 0.9, s * 2.5);
    ctx.fillRect(0.1, -s, s * 0.9, s * 2.5);
  } else {
    const legOff = Math.sin(walkFrame * 0.1) * s * 0.8;
    ctx.fillStyle = "#3a3a6e";
    ctx.fillRect(-s, -s, s * 0.9, s * 2.5);
    ctx.fillRect(0, -s + legOff * 0.5, s * 0.9, s * 2.5);
  }

  ctx.restore();
}
