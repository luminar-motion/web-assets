import { PLAYER, REF_INTERVENE_CHANCE } from "../constants";
import type { Ball } from "../entities/Ball";
import type { Player } from "../entities/Player";
import type { Referee } from "../entities/Referee";
import type { ActionKind, Particle } from "../types";

export interface CombatEvent {
  kind: "hit" | "foul" | "ref_hit" | "whistle";
  x: number;
  y: number;
  severity: number;
  attacker?: Player;
  victim?: Player;
}

export function tryPlayerAction(
  actor: Player,
  kind: ActionKind,
  players: Player[],
  ball: Ball,
  referee: Referee,
  particles: Particle[],
): CombatEvent[] {
  const events: CombatEvent[] = [];

  if (kind === "kick") {
    if (actor.kickCooldown > 0) return events;
    actor.kickCooldown = 0.35;
    if (actor.hasBall || actor.distanceTo(ball.pos) < 1.8) {
      const power = actor.hasBall ? 36 : 28;
      const loft = actor.hasBall ? 5 + Math.random() * 4 : 2;
      if (!actor.hasBall && actor.distanceTo(ball.pos) < 1.8) {
        ball.release();
      }
      ball.kick(actor.facingX, actor.facingY, power, loft);
      spawnSparks(particles, actor.x, actor.y, "#f5f5f5", 4);
    }
    // kick can also clip nearby opponents (brutal arcade)
    for (const other of players) {
      if (other.id === actor.id || other.team === actor.team || !other.alive) continue;
      if (actor.distanceTo(other.pos) < 2.0) {
        other.applyDamage(8, actor.facingX * 10, actor.facingY * 10);
        events.push({
          kind: "hit",
          x: other.x,
          y: other.y,
          severity: 8,
          attacker: actor,
          victim: other,
        });
        spawnSparks(particles, other.x, other.y, "#c62828", 6);
      }
    }
    if (referee.canBeAttacked && actor.distanceTo(referee.pos) < 2.2) {
      referee.applyDamage(12, actor.facingX * 14, actor.facingY * 14);
      events.push({ kind: "ref_hit", x: referee.x, y: referee.y, severity: 12, attacker: actor });
      spawnSparks(particles, referee.x, referee.y, "#f0a020", 8);
    }
    return events;
  }

  if (kind === "slide") {
    if (actor.slideCooldown > 0 || actor.stamina < 10) return events;
    actor.slideCooldown = 1.0;
    actor.stamina -= 15;
    actor.vx = actor.facingX * 36;
    actor.vy = actor.facingY * 36;
    actor.stunned = 0.15;

    for (const other of players) {
      if (other.id === actor.id || !other.alive) continue;
      if (actor.distanceTo(other.pos) < 2.6) {
        const friendly = other.team === actor.team;
        const dmg = friendly ? 4 : 22 + Math.random() * 10;
        other.applyDamage(dmg, actor.facingX * 22, actor.facingY * 22);
        if (other.hasBall) ball.release();
        spawnSparks(particles, other.x, other.y, friendly ? "#aaa" : "#c62828", 10);
        events.push({
          kind: friendly ? "hit" : "foul",
          x: other.x,
          y: other.y,
          severity: dmg,
          attacker: actor,
          victim: other,
        });
      }
    }

    if (referee.canBeAttacked && actor.distanceTo(referee.pos) < 2.8) {
      referee.applyDamage(20, actor.facingX * 20, actor.facingY * 20);
      events.push({ kind: "ref_hit", x: referee.x, y: referee.y, severity: 20, attacker: actor });
      spawnSparks(particles, referee.x, referee.y, "#f0a020", 12);
    }
    return events;
  }

  // punch / elbow
  if (actor.punchCooldown > 0) return events;
  actor.punchCooldown = 0.55;
  actor.stamina -= 6;

  for (const other of players) {
    if (other.id === actor.id || !other.alive) continue;
    if (actor.distanceTo(other.pos) < 2.1) {
      const dmg = 16 + Math.random() * 8;
      other.applyDamage(dmg, actor.facingX * 16, actor.facingY * 16);
      if (other.hasBall) ball.release();
      spawnSparks(particles, other.x, other.y, "#c62828", 8);
      events.push({
        kind: other.team === actor.team ? "hit" : "foul",
        x: other.x,
        y: other.y,
        severity: dmg,
        attacker: actor,
        victim: other,
      });
    }
  }

  if (referee.canBeAttacked && actor.distanceTo(referee.pos) < 2.2) {
    referee.applyDamage(16, actor.facingX * 16, actor.facingY * 16);
    events.push({ kind: "ref_hit", x: referee.x, y: referee.y, severity: 16, attacker: actor });
    spawnSparks(particles, referee.x, referee.y, "#f0a020", 10);
  }

  return events;
}

/** Resolve pending slide collisions during movement. */
export function resolveSlideContacts(
  actors: Player[],
  ball: Ball,
  referee: Referee,
  particles: Particle[],
): CombatEvent[] {
  const events: CombatEvent[] = [];
  for (const actor of actors) {
    const sliding = Math.hypot(actor.vx, actor.vy) > 28 && actor.slideCooldown > 0.7;
    if (!sliding) continue;

    for (const other of actors) {
      if (other.id === actor.id || !other.alive) continue;
      if (actor.distanceTo(other.pos) < PLAYER.radius * 2.2) {
        const dmg = 18 + Math.random() * 12;
        other.applyDamage(dmg, actor.vx * 0.5, actor.vy * 0.5);
        if (other.hasBall) ball.release();
        spawnSparks(particles, other.x, other.y, "#c62828", 8);
        events.push({
          kind: other.team === actor.team ? "hit" : "foul",
          x: other.x,
          y: other.y,
          severity: dmg,
          attacker: actor,
          victim: other,
        });
      }
    }

    if (referee.canBeAttacked && actor.distanceTo(referee.pos) < 2.5) {
      referee.applyDamage(18, actor.vx * 0.4, actor.vy * 0.4);
      events.push({ kind: "ref_hit", x: referee.x, y: referee.y, severity: 18, attacker: actor });
      spawnSparks(particles, referee.x, referee.y, "#f0a020", 8);
    }
  }
  return events;
}

export function shouldRefereeIntervene(severity: number, referee: Referee): boolean {
  if (referee.state === "down" || referee.state === "fighting" || referee.state === "intervening") {
    return false;
  }
  // Rare intervention — scaled slightly by severity
  const chance = REF_INTERVENE_CHANCE * (severity / 25);
  return Math.random() < Math.min(0.28, chance);
}

export function spawnSparks(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 4 + Math.random() * 10;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      color,
      size: 0.2 + Math.random() * 0.35,
    });
  }
}
