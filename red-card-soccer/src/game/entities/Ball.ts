import { BALL, PITCH } from "../constants";
import type { Vec2 } from "../types";
import type { Player } from "./Player";

export class Ball {
  x: number;
  y: number;
  z = 0;
  vz = 0;
  vx = 0;
  vy = 0;
  owner: Player | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get pos(): Vec2 {
    return { x: this.x, y: this.y };
  }

  release(): void {
    if (this.owner) {
      this.owner.hasBall = false;
      this.owner = null;
    }
  }

  attach(player: Player): void {
    this.release();
    this.owner = player;
    player.hasBall = true;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.z = 0;
  }

  kick(dirX: number, dirY: number, power: number, loft = 0): void {
    this.release();
    const len = Math.hypot(dirX, dirY) || 1;
    this.vx = (dirX / len) * power;
    this.vy = (dirY / len) * power;
    this.vz = loft;
    this.z = 0.2;
  }

  update(dt: number): void {
    if (this.owner) {
      const ox = this.owner.facingX * 1.35;
      const oy = this.owner.facingY * 1.35;
      this.x = this.owner.x + ox;
      this.y = this.owner.y + oy;
      this.z = 0.15;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    this.vz -= 28 * dt;
    if (this.z < 0) {
      this.z = 0;
      this.vz *= -0.35;
      if (Math.abs(this.vz) < 1.5) this.vz = 0;
    }

    this.vx *= Math.pow(BALL.friction, dt * 60);
    this.vy *= Math.pow(BALL.friction, dt * 60);
    if (Math.hypot(this.vx, this.vy) < 0.4) {
      this.vx = 0;
      this.vy = 0;
    }

    this.clampPitch();
  }

  private clampPitch(): void {
    const minX = 0;
    const maxX = PITCH.width;
    const minY = 0;
    const maxY = PITCH.height;

    const inGoalY =
      this.y > (PITCH.height - PITCH.goalWidth) / 2 &&
      this.y < (PITCH.height + PITCH.goalWidth) / 2;

    if (this.x < minX) {
      if (inGoalY && this.x > -PITCH.goalDepth) {
        // allow into goal mouth
      } else {
        this.x = minX;
        this.vx *= -0.45;
      }
    }
    if (this.x > maxX) {
      if (inGoalY && this.x < maxX + PITCH.goalDepth) {
        // allow into goal mouth
      } else {
        this.x = maxX;
        this.vx *= -0.45;
      }
    }
    if (this.y < minY) {
      this.y = minY;
      this.vy *= -0.45;
    }
    if (this.y > maxY) {
      this.y = maxY;
      this.vy *= -0.45;
    }
  }
}
