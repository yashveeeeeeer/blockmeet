import * as THREE from "three";
import { buildRelief } from "./relief-data.ts";

export function reliefGeometry(data: ReturnType<typeof buildRelief>) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.position, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(data.uv, 2));
  geometry.setAttribute("normal", new THREE.BufferAttribute(data.normal, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.index, 1));
  return geometry;
}

// Synchronous adapter for geometry validation; the browser builds in a worker.
export function raisedLettering(mask: HTMLCanvasElement, width: number, height: number) {
  const pixels = mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height).data;
  const alpha = new Uint8Array(mask.width * mask.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
  return reliefGeometry(buildRelief({columns: mask.width, rows: mask.height, alpha, width, height}));
}

// Supersample standard displays, retain Retina detail, and bound framebuffer cost.
export function bookPixelRatio(width: number, height: number, deviceRatio: number, mobile = false) {
  if (mobile) return Math.min(Math.max(1, deviceRatio), 1.5, Math.sqrt(1_500_000 / Math.max(1, width * height)));
  return Math.min(Math.max(1.5, deviceRatio), 2.5, Math.sqrt(8_000_000 / Math.max(1, width * height)));
}
