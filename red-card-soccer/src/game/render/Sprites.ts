import { worldToScreen, depthKey } from "../iso";
import type { Camera } from "../Camera";
import type { Ball } from "../entities/Ball";
import type { Player } from "../entities/Player";
import type { Referee } from "../entities/Referee";
import type { Particle } from "../types";

interface Drawable {
  depth: number;
  draw: () => void;
}

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  players: Player[],
  ball: Ball,
  referee: Referee,
  particles: Particle[],
): void {
  const list: Drawable[] = [];

  for (const p of players) {
    list.push({
      depth: depthKey(p.x, p.y),
      draw: () => drawPlayer(ctx, camera, p),
    });
  }

  list.push({
    depth: depthKey(referee.x, referee.y),
    draw: () => drawReferee(ctx, camera, referee),
  });

  list.push({
    depth: depthKey(ball.x, ball.y) + 0.01,
    draw: () => drawBall(ctx, camera, ball),
  });

  list.sort((a, b) => a.depth - b.depth);
  for (const item of list) item.draw();

  for (const part of particles) {
    drawParticle(ctx, camera, part);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, camera: Camera, p: Player): void {
  const screen = worldToScreen(p.x, p.y);
  const x = screen.x - camera.x;
  const y = screen.y - camera.y;
  const sliding = Math.hypot(p.vx, p.vy) > 28;
  const down = p.downed > 0;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyColor = p.team === "home" ? "#2f7fbf" : "#c62828";
  const accent = p.team === "home" ? "#9fd0ff" : "#ff8a80";

  ctx.save();
  ctx.translate(x, y);
  if (down) ctx.rotate(1.1);
  else if (sliding) ctx.rotate(p.facingX * 0.4);

  // legs
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-5, 2, 4, 10);
  ctx.fillRect(1, 2, 4, 10);

  // body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 18, 4);
  ctx.fill();

  // number
  ctx.fillStyle = accent;
  ctx.font = "bold 9px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(p.number), 0, -2);

  // head
  ctx.fillStyle = "#e0b090";
  ctx.beginPath();
  ctx.arc(0, -20, 6, 0, Math.PI * 2);
  ctx.fill();

  // control ring
  if (p.controlled) {
    ctx.strokeStyle = "#f0a020";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // health pip
  if (p.health < 90) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - 12, y - 36, 24, 4);
    ctx.fillStyle = p.health < 30 ? "#c62828" : "#7cb342";
    ctx.fillRect(x - 12, y - 36, 24 * (p.health / 100), 4);
  }
}

function drawReferee(ctx: CanvasRenderingContext2D, camera: Camera, ref: Referee): void {
  const screen = worldToScreen(ref.x, ref.y);
  const x = screen.x - camera.x;
  const y = screen.y - camera.y;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  if (ref.state === "down") ctx.rotate(1.2);

  ctx.fillStyle = "#111";
  ctx.fillRect(-5, 2, 4, 10);
  ctx.fillRect(1, 2, 4, 10);

  // black kit with yellow badge
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 18, 4);
  ctx.fill();
  ctx.fillStyle = "#f0a020";
  ctx.fillRect(-3, -10, 6, 6);

  ctx.fillStyle = "#e0b090";
  ctx.beginPath();
  ctx.arc(0, -20, 6, 0, Math.PI * 2);
  ctx.fill();

  if (ref.state === "intervening" || ref.state === "fighting") {
    ctx.strokeStyle = "#f0a020";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  if (ref.canBeAttacked) {
    ctx.fillStyle = "#f0a020";
    ctx.font = "bold 11px Bebas Neue, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ref.state === "fighting" ? "COMBATTI L'ARBITRO!" : "ARBITRO!", x, y - 40);
  }

  if (ref.health < 100) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - 14, y - 38, 28, 4);
    ctx.fillStyle = "#f0a020";
    ctx.fillRect(x - 14, y - 38, 28 * (ref.health / 100), 4);
  }
}

function drawBall(ctx: CanvasRenderingContext2D, camera: Camera, ball: Ball): void {
  const screen = worldToScreen(ball.x, ball.y, ball.z * 8);
  const x = screen.x - camera.x;
  const y = screen.y - camera.y;

  const shadow = worldToScreen(ball.x, ball.y);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(shadow.x - camera.x, shadow.y - camera.y + 2, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5f5f5";
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 2);
  ctx.lineTo(x + 2, y + 3);
  ctx.stroke();
}

function drawParticle(ctx: CanvasRenderingContext2D, camera: Camera, p: Particle): void {
  const screen = worldToScreen(p.x, p.y);
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.fillStyle = p.color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(screen.x - camera.x, screen.y - camera.y, p.size * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
