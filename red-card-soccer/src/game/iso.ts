import type { Vec2 } from "./types";

/** Classic 2:1 isometric projection helpers. */
export const TILE_W = 28;
export const TILE_H = 14;

export function worldToScreen(x: number, y: number, z = 0): Vec2 {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) - z,
  };
}

export function screenToWorld(sx: number, sy: number): Vec2 {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return {
    x: (a + b) / 2,
    y: (b - a) / 2,
  };
}

export function depthKey(x: number, y: number): number {
  return x + y;
}
