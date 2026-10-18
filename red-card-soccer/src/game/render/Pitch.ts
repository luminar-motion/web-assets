import { PITCH } from "../constants";
import { worldToScreen } from "../iso";
import type { Camera } from "../Camera";

export function drawPitch(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#0a120c";
  ctx.fillRect(0, 0, width, height);

  // grass diamond grid
  const step = 4;
  for (let x = -PITCH.margin; x <= PITCH.width + PITCH.margin; x += step) {
    for (let y = -PITCH.margin; y <= PITCH.height + PITCH.margin; y += step) {
      const onPitch = x >= 0 && x < PITCH.width && y >= 0 && y < PITCH.height;
      const stripe = Math.floor(x / step) % 2 === 0;
      const c = onPitch ? (stripe ? "#1f4a2c" : "#1a3f26") : "#122018";
      drawIsoQuad(ctx, camera, x, y, step, step, c);
    }
  }

  // touchlines
  strokeIsoRect(ctx, camera, 0, 0, PITCH.width, PITCH.height, "#e8e4d9", 2);

  // halfway
  strokeIsoLine(ctx, camera, PITCH.width / 2, 0, PITCH.width / 2, PITCH.height, "#e8e4d9", 1.5);

  // center circle
  strokeIsoCircle(ctx, camera, PITCH.width / 2, PITCH.height / 2, 8, "#e8e4d9", 1.5);

  // penalty boxes
  const boxW = 14;
  const boxH = 28;
  const boxY = (PITCH.height - boxH) / 2;
  strokeIsoRect(ctx, camera, 0, boxY, boxW, boxH, "#e8e4d9", 1.5);
  strokeIsoRect(ctx, camera, PITCH.width - boxW, boxY, boxW, boxH, "#e8e4d9", 1.5);

  // goals
  drawGoal(ctx, camera, 0, true);
  drawGoal(ctx, camera, PITCH.width, false);
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  x: number,
  left: boolean,
): void {
  const gy = (PITCH.height - PITCH.goalWidth) / 2;
  const depth = left ? -PITCH.goalDepth : PITCH.goalDepth;
  const posts = [
    [x, gy],
    [x, gy + PITCH.goalWidth],
    [x + depth, gy],
    [x + depth, gy + PITCH.goalWidth],
  ] as const;

  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 3;
  for (const [px, py] of posts) {
    const base = worldToScreen(px, py);
    const top = worldToScreen(px, py, 8);
    ctx.beginPath();
    ctx.moveTo(base.x - camera.x, base.y - camera.y);
    ctx.lineTo(top.x - camera.x, top.y - camera.y);
    ctx.stroke();
  }

  // crossbar & back
  const a = worldToScreen(x, gy, 8);
  const b = worldToScreen(x, gy + PITCH.goalWidth, 8);
  const c = worldToScreen(x + depth, gy, 8);
  const d = worldToScreen(x + depth, gy + PITCH.goalWidth, 8);
  ctx.beginPath();
  ctx.moveTo(a.x - camera.x, a.y - camera.y);
  ctx.lineTo(b.x - camera.x, b.y - camera.y);
  ctx.lineTo(d.x - camera.x, d.y - camera.y);
  ctx.lineTo(c.x - camera.x, c.y - camera.y);
  ctx.closePath();
  ctx.strokeStyle = "rgba(245,245,245,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(245,245,245,0.08)";
  ctx.fill();
}

function drawIsoQuad(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  const p0 = worldToScreen(x, y);
  const p1 = worldToScreen(x + w, y);
  const p2 = worldToScreen(x + w, y + h);
  const p3 = worldToScreen(x, y + h);
  ctx.beginPath();
  ctx.moveTo(p0.x - camera.x, p0.y - camera.y);
  ctx.lineTo(p1.x - camera.x, p1.y - camera.y);
  ctx.lineTo(p2.x - camera.x, p2.y - camera.y);
  ctx.lineTo(p3.x - camera.x, p3.y - camera.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeIsoRect(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  lineWidth: number,
): void {
  const p0 = worldToScreen(x, y);
  const p1 = worldToScreen(x + w, y);
  const p2 = worldToScreen(x + w, y + h);
  const p3 = worldToScreen(x, y + h);
  ctx.beginPath();
  ctx.moveTo(p0.x - camera.x, p0.y - camera.y);
  ctx.lineTo(p1.x - camera.x, p1.y - camera.y);
  ctx.lineTo(p2.x - camera.x, p2.y - camera.y);
  ctx.lineTo(p3.x - camera.x, p3.y - camera.y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function strokeIsoLine(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  lineWidth: number,
): void {
  const a = worldToScreen(x0, y0);
  const b = worldToScreen(x1, y1);
  ctx.beginPath();
  ctx.moveTo(a.x - camera.x, a.y - camera.y);
  ctx.lineTo(b.x - camera.x, b.y - camera.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function strokeIsoCircle(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  cx: number,
  cy: number,
  r: number,
  color: string,
  lineWidth: number,
): void {
  ctx.beginPath();
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const p = worldToScreen(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
    if (i === 0) ctx.moveTo(p.x - camera.x, p.y - camera.y);
    else ctx.lineTo(p.x - camera.x, p.y - camera.y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}
