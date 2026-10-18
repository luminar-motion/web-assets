import { PLAYER } from "../constants";
import type { PlayerRole, TeamId, Vec2 } from "../types";

let nextId = 1;

export class Player {
  readonly id = nextId++;
  team: TeamId;
  role: PlayerRole;
  number: number;
  name: string;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facingX = 1;
  facingY = 0;
  health = PLAYER.healthMax;
  stamina = PLAYER.staminaMax;
  stunned = 0;
  slideCooldown = 0;
  punchCooldown = 0;
  kickCooldown = 0;
  hasBall = false;
  controlled = false;
  downed = 0;
  anger = 0;
  homeX: number;
  homeY: number;

  constructor(
    team: TeamId,
    role: PlayerRole,
    number: number,
    name: string,
    x: number,
    y: number,
  ) {
    this.team = team;
    this.role = role;
    this.number = number;
    this.name = name;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
  }

  get pos(): Vec2 {
    return { x: this.x, y: this.y };
  }

  get alive(): boolean {
    return this.health > 0 && this.downed <= 0;
  }

  get canAct(): boolean {
    return this.alive && this.stunned <= 0;
  }

  distanceTo(other: Vec2): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.hypot(dx, dy);
  }

  faceToward(tx: number, ty: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      this.facingX = dx / len;
      this.facingY = dy / len;
    }
  }

  applyDamage(amount: number, knockX: number, knockY: number): void {
    this.health = Math.max(0, this.health - amount);
    this.vx += knockX;
    this.vy += knockY;
    this.stunned = Math.max(this.stunned, 0.35 + amount * 0.01);
    this.anger = Math.min(100, this.anger + amount * 0.8);
    if (this.health <= 25) {
      this.downed = Math.max(this.downed, 1.2 + (25 - this.health) * 0.04);
    }
  }

  updateTimers(dt: number): void {
    this.stunned = Math.max(0, this.stunned - dt);
    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.downed = Math.max(0, this.downed - dt);
    if (this.stamina < PLAYER.staminaMax) {
      this.stamina = Math.min(PLAYER.staminaMax, this.stamina + dt * 8);
    }
    if (this.health < PLAYER.healthMax && this.downed <= 0) {
      this.health = Math.min(PLAYER.healthMax, this.health + dt * 1.5);
    }
    this.anger = Math.max(0, this.anger - dt * 2);
  }
}
