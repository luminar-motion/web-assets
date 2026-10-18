import { BALL, PLAYER, PITCH } from "../constants";
import type { Ball } from "../entities/Ball";
import type { Player } from "../entities/Player";
import type { Referee } from "../entities/Referee";
import type { MatchPhase } from "../types";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function updateAI(
  players: Player[],
  ball: Ball,
  referee: Referee,
  phase: MatchPhase,
  dt: number,
  controlledId: number,
): void {
  for (const p of players) {
    if (p.id === controlledId) continue;
    if (!p.canAct) {
      p.vx *= 0.85;
      p.vy *= 0.85;
      continue;
    }

    if (phase === "ref_fight" && referee.canBeAttacked && p.anger > 40) {
      chaseAndFightRef(p, referee, dt);
      continue;
    }

    if (p.role === "gk") {
      goalkeeperAI(p, ball, dt);
      continue;
    }

    fieldAI(p, players, ball, dt);
  }
}

function moveToward(p: Player, tx: number, ty: number, speed: number, dt: number): void {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.2) {
    p.vx *= 0.8;
    p.vy *= 0.8;
    return;
  }
  p.faceToward(tx, ty);
  const nx = dx / dist;
  const ny = dy / dist;
  p.vx = nx * speed;
  p.vy = ny * speed;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = clamp(p.x, 1, PITCH.width - 1);
  p.y = clamp(p.y, 1, PITCH.height - 1);
}

function goalkeeperAI(p: Player, ball: Ball, dt: number): void {
  const goalX = p.team === "home" ? 3 : PITCH.width - 3;
  const targetY = clamp(
    ball.y,
    (PITCH.height - PITCH.goalWidth) / 2 + 1,
    (PITCH.height + PITCH.goalWidth) / 2 - 1,
  );
  const targetX = goalX + (ball.x - goalX) * 0.08;
  moveToward(p, targetX, targetY, PLAYER.speed * 0.85, dt);

  if (p.distanceTo(ball.pos) < 2.2 && !ball.owner) {
    ball.attach(p);
  }
  if (p.hasBall && p.kickCooldown <= 0) {
    const dirX = p.team === "home" ? 1 : -1;
    ball.kick(dirX, (Math.random() - 0.5) * 0.6, BALL.passPower * 1.1, 4);
    p.kickCooldown = 0.6;
  }
}

function isTeamClosestToBall(p: Player, players: Player[], ball: Ball): boolean {
  let bestD = Infinity;
  let bestId = -1;
  for (const o of players) {
    if (o.team !== p.team || !o.canAct || o.role === "gk") continue;
    const d = o.distanceTo(ball.pos);
    if (d < bestD) {
      bestD = d;
      bestId = o.id;
    }
  }
  return bestId === p.id;
}

function nearestTeammateAhead(p: Player, players: Player[]): Player | null {
  const attackDir = p.team === "home" ? 1 : -1;
  let best: Player | null = null;
  let bestScore = -Infinity;
  for (const o of players) {
    if (o.id === p.id || o.team !== p.team || !o.canAct) continue;
    const ahead = (o.x - p.x) * attackDir;
    if (ahead < 2) continue;
    const score = ahead - Math.abs(o.y - p.y) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

function fieldAI(p: Player, players: Player[], ball: Ball, dt: number): void {
  const attackDir = p.team === "home" ? 1 : -1;
  const possession = ball.owner?.team;

  if (p.hasBall) {
    const goalX = p.team === "home" ? PITCH.width : 0;
    const goalY = PITCH.height / 2;
    moveToward(
      p,
      goalX - attackDir * 8,
      goalY + (p.homeY - PITCH.height / 2) * 0.3,
      PLAYER.speed * 0.9,
      dt,
    );

    const distGoal = Math.hypot(goalX - p.x, goalY - p.y);
    if (distGoal < 22 && p.kickCooldown <= 0) {
      ball.kick(goalX - p.x, goalY - p.y, BALL.kickPower * (0.85 + Math.random() * 0.2), 6);
      p.kickCooldown = 0.8;
      return;
    }

    if (Math.random() < 0.008 && p.kickCooldown <= 0) {
      const mate = nearestTeammateAhead(p, players);
      if (mate) {
        ball.kick(mate.x - p.x, mate.y - p.y, BALL.passPower, 2);
        p.kickCooldown = 0.5;
      }
    }
    return;
  }

  if (possession === p.team) {
    const supportX = ball.x + attackDir * 10;
    const supportY = p.homeY + (ball.y - p.homeY) * 0.25;
    moveToward(p, supportX, supportY, PLAYER.speed * 0.75, dt);
    return;
  }

  if (isTeamClosestToBall(p, players, ball)) {
    moveToward(p, ball.x, ball.y, PLAYER.speed * 1.05, dt);
    const owner = ball.owner;
    if (owner && owner.team !== p.team && p.distanceTo(owner.pos) < 2.4) {
      if (p.slideCooldown <= 0 && (p.anger > 35 || Math.random() < 0.18)) {
        p.slideCooldown = 1.1;
        p.vx = p.facingX * 34;
        p.vy = p.facingY * 34;
        p.stamina -= 12;
      } else if (p.punchCooldown <= 0 && Math.random() < 0.12) {
        p.punchCooldown = 0.7;
      }
    }
    if (!ball.owner && p.distanceTo(ball.pos) < 1.6) {
      ball.attach(p);
    }
  } else {
    const markX = p.homeX + (ball.x - PITCH.width / 2) * 0.25;
    const markY = p.homeY + (ball.y - PITCH.height / 2) * 0.2;
    moveToward(p, markX, markY, PLAYER.speed * 0.7, dt);
  }
}

function chaseAndFightRef(p: Player, referee: Referee, dt: number): void {
  moveToward(p, referee.x, referee.y, PLAYER.speed * 1.1, dt);
  if (p.distanceTo(referee.pos) < 2.2) {
    if (p.punchCooldown <= 0) {
      p.punchCooldown = 0.55;
      referee.applyDamage(14, p.facingX * 12, p.facingY * 12);
    } else if (p.slideCooldown <= 0) {
      p.slideCooldown = 1.0;
      p.vx = p.facingX * 30;
      p.vy = p.facingY * 30;
      referee.applyDamage(18, p.facingX * 18, p.facingY * 18);
    }
  }
}
