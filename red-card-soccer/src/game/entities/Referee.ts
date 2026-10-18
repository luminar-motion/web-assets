import type { Vec2 } from "../types";

export type RefState = "idle" | "watching" | "intervening" | "fighting" | "down";

export class Referee {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  health = 100;
  state: RefState = "idle";
  target: Vec2 | null = null;
  whistleTimer = 0;
  interveneTimer = 0;
  punchCooldown = 0;
  stunned = 0;
  anger = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get pos(): Vec2 {
    return { x: this.x, y: this.y };
  }

  get canBeAttacked(): boolean {
    return this.state === "intervening" || this.state === "fighting";
  }

  distanceTo(other: Vec2): number {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  applyDamage(amount: number, knockX: number, knockY: number): void {
    this.health = Math.max(0, this.health - amount);
    this.vx += knockX;
    this.vy += knockY;
    this.stunned = Math.max(this.stunned, 0.4);
    this.anger = Math.min(100, this.anger + amount);
    this.state = this.health <= 0 ? "down" : "fighting";
  }

  update(dt: number): void {
    this.whistleTimer = Math.max(0, this.whistleTimer - dt);
    this.interveneTimer = Math.max(0, this.interveneTimer - dt);
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.stunned = Math.max(0, this.stunned - dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.9, dt * 60);
    this.vy *= Math.pow(0.9, dt * 60);

    if (this.state === "down") {
      this.health = Math.min(100, this.health + dt * 8);
      if (this.health >= 40) {
        this.state = "idle";
        this.anger = 0;
      }
      return;
    }

    if (this.state === "idle" || this.state === "watching") {
      // drift near midfield sideline
      const homeX = 50;
      const homeY = 4;
      this.x += (homeX - this.x) * dt * 0.4;
      this.y += (homeY - this.y) * dt * 0.4;
    }
  }
}
