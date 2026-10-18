import { MATCH, PITCH, PLAYER } from "./constants";
import { Camera } from "./Camera";
import { Input } from "./Input";
import { Ball } from "./entities/Ball";
import { Player } from "./entities/Player";
import { Referee } from "./entities/Referee";
import { drawPitch } from "./render/Pitch";
import { drawEntities } from "./render/Sprites";
import { updateAI } from "./systems/AI";
import {
  resolveSlideContacts,
  shouldRefereeIntervene,
  tryPlayerAction,
  type CombatEvent,
} from "./systems/Combat";
import type { MatchPhase, Particle, TeamId } from "./types";

const HOME_NAMES = ["RUSSO", "NERI", "CONTI", "BIANCHI", "FERRO", "MARZO", "VIALE"];
const AWAY_NAMES = ["KOZAK", "DRAKE", "VANCE", "REED", "SLOAN", "PIKE", "CROSS"];

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input = new Input();
  private readonly camera = new Camera();
  private players: Player[] = [];
  private ball!: Ball;
  private referee!: Referee;
  private particles: Particle[] = [];
  private phase: MatchPhase = "kickoff";
  private score = { home: 0, away: 0 };
  private clock = MATCH.halfSeconds;
  private controlledId = -1;
  private phaseTimer = 0;
  private running = false;
  private lastTime = 0;
  private bannerEl: HTMLElement;
  private scoreEl: HTMLElement;
  private clockEl: HTMLElement;
  private statusEl: HTMLElement;
  private hudEl: HTMLElement;
  private pendingFoul: CombatEvent | null = null;
  private refCooldown = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D non disponibile");
    this.ctx = ctx;

    this.bannerEl = document.getElementById("banner")!;
    this.scoreEl = document.getElementById("score")!;
    this.clockEl = document.getElementById("clock")!;
    this.statusEl = document.getElementById("status")!;
    this.hudEl = document.getElementById("hud")!;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  start(): void {
    this.resetMatch();
    this.running = true;
    this.hudEl.classList.remove("hidden");
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private resetMatch(): void {
    this.players = [];
    this.spawnTeam("home");
    this.spawnTeam("away");
    this.ball = new Ball(PITCH.width / 2, PITCH.height / 2);
    this.referee = new Referee(PITCH.width / 2, 3);
    this.score = { home: 0, away: 0 };
    this.clock = MATCH.halfSeconds;
    this.particles = [];
    this.phase = "kickoff";
    this.phaseTimer = 1.2;
    this.pendingFoul = null;
    this.refCooldown = 0;
    this.selectNearestHome();
    this.showBanner("CALCIO D'INIZIO");
    this.updateHud();
  }

  private spawnTeam(team: TeamId): void {
    const names = team === "home" ? HOME_NAMES : AWAY_NAMES;
    const side = team === "home" ? 1 : -1;
    const baseX = team === "home" ? 18 : PITCH.width - 18;

    const slots: Array<{ role: Player["role"]; ox: number; oy: number; num: number }> = [
      { role: "gk", ox: -14, oy: 0, num: 1 },
      { role: "def", ox: -6, oy: -16, num: 2 },
      { role: "def", ox: -6, oy: 16, num: 3 },
      { role: "mid", ox: 2, oy: -8, num: 4 },
      { role: "mid", ox: 2, oy: 8, num: 6 },
      { role: "fwd", ox: 10, oy: -12, num: 9 },
      { role: "fwd", ox: 10, oy: 12, num: 11 },
    ];

    slots.forEach((s, i) => {
      const x = baseX + s.ox * side;
      const y = PITCH.height / 2 + s.oy;
      this.players.push(new Player(team, s.role, s.num, names[i] ?? `${team}${i}`, x, y));
    });
  }

  private selectNearestHome(): void {
    const home = this.players.filter((p) => p.team === "home" && p.canAct);
    let best = home[0];
    let bestD = Infinity;
    for (const p of home) {
      const d = p.distanceTo(this.ball.pos);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    for (const p of this.players) p.controlled = false;
    if (best) {
      best.controlled = true;
      this.controlledId = best.id;
    }
  }

  private controlled(): Player | undefined {
    return this.players.find((p) => p.id === this.controlledId);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop(time: number): void {
    if (!this.running) return;
    const dt = Math.min(0.033, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.update(dt);
    this.draw();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    this.phaseTimer = Math.max(0, this.phaseTimer - dt);

    if (this.phase === "ended") {
      this.updateParticles(dt);
      return;
    }

    if (this.phase === "kickoff") {
      this.updateParticles(dt);
      if (this.phaseTimer <= 0) {
        this.phase = "play";
        this.setStatus("PARTITA IN CORSO");
        this.hideBanner();
      }
      this.camera.follow(this.ball.pos, dt, window.innerWidth, window.innerHeight);
      return;
    }

    if (this.phase === "goal") {
      this.updateParticles(dt);
      if (this.phaseTimer <= 0) {
        this.resetPositions(this.ball.x < PITCH.width / 2 ? "away" : "home");
        this.phase = "kickoff";
        this.phaseTimer = 1;
        this.showBanner("CALCIO D'INIZIO");
      }
      this.camera.follow(this.ball.pos, dt, window.innerWidth, window.innerHeight);
      return;
    }

    if (this.phase === "ref_intervene") {
      this.handlePlayerInput(dt);
      this.updatePlayersPhysics(dt);
      this.updateRefereeApproach(dt);
      this.updateParticles(dt);
      this.camera.follow(this.referee.pos, dt, window.innerWidth, window.innerHeight);

      // Start the brawl as soon as you (or the fouler) reach the ref
      const ctrl = this.controlled();
      const fouler = this.pendingFoul?.attacker;
      const near =
        (ctrl && ctrl.distanceTo(this.referee.pos) < 3.2) ||
        (fouler && fouler.distanceTo(this.referee.pos) < 3.2);
      if (near || (this.phaseTimer <= 0 && ctrl && ctrl.distanceTo(this.referee.pos) < 6)) {
        this.phase = "ref_fight";
        this.phaseTimer = 10;
        this.referee.state = "fighting";
        this.showBanner("ATTACCA L'ARBITRO!", true);
        this.setStatus("RISSA CON L'ARBITRO");
      } else if (this.phaseTimer <= 0) {
        this.showBanner("CARTELLINO... IGNORATO");
        this.phase = "play";
        this.referee.state = "idle";
        this.setStatus("PARTITA IN CORSO");
        setTimeout(() => this.hideBanner(), 900);
      }
      return;
    }

    if (this.phase === "ref_fight") {
      this.handlePlayerInput(dt);
      updateAI(this.players, this.ball, this.referee, this.phase, dt, this.controlledId);
      this.updatePlayersPhysics(dt);
      this.referee.update(dt);
      this.refFightAI(dt);
      this.updateParticles(dt);
      this.camera.follow(this.referee.pos, dt, window.innerWidth, window.innerHeight);

      if (this.referee.state === "down" || this.phaseTimer <= 0) {
        this.showBanner(this.referee.state === "down" ? "ARBITRO A TERRA!" : "GIOCO!");
        this.phase = "play";
        this.setStatus("PARTITA IN CORSO");
        this.referee.state = this.referee.health <= 0 ? "down" : "idle";
        setTimeout(() => this.hideBanner(), 1000);
      }
      this.updateHud();
      return;
    }

    // play
    this.refCooldown = Math.max(0, this.refCooldown - dt);
    this.clock = Math.max(0, this.clock - dt * MATCH.timeScale);
    if (this.clock <= 0) {
      this.phase = "ended";
      this.showBanner(`FINE  ${this.score.home}-${this.score.away}`);
      this.setStatus("FINE PARTITA");
      this.updateHud();
      return;
    }

    this.handlePlayerInput(dt);
    updateAI(this.players, this.ball, this.referee, this.phase, dt, this.controlledId);
    this.updatePlayersPhysics(dt);
    this.ball.update(dt);
    this.referee.update(dt);
    this.pickupBall();
    this.checkGoals();

    const slideEvents = resolveSlideContacts(
      this.players,
      this.ball,
      this.referee,
      this.particles,
    );
    this.processCombatEvents(slideEvents);

    this.updateParticles(dt);

    const focus = this.controlled()?.pos ?? this.ball.pos;
    this.camera.follow(focus, dt, window.innerWidth, window.innerHeight);
    this.updateHud();
  }

  private handlePlayerInput(dt: number): void {
    if (this.input.wasPressed("tab")) {
      this.cycleControlled();
    }

    const p = this.controlled();
    if (!p || !p.canAct) return;

    const move = this.input.moveVector();
    // isometric-friendly: screen directions map to world axes
    if (move.x !== 0 || move.y !== 0) {
      // Convert screen-ish WASD to world: right/down increase world x/y mixed
      const wx = move.x + move.y;
      const wy = -move.x + move.y;
      const len = Math.hypot(wx, wy) || 1;
      const speed = PLAYER.speed * (this.input.isDown("shift") ? PLAYER.sprintMul : 1);
      p.vx = (wx / len) * speed;
      p.vy = (wy / len) * speed;
      p.faceToward(p.x + p.vx, p.y + p.vy);
      p.stamina -= dt * (this.input.isDown("shift") ? 12 : 4);
    } else if (Math.hypot(p.vx, p.vy) < 30) {
      p.vx *= 0.8;
      p.vy *= 0.8;
    }

    if (this.input.wasPressed("j") || this.input.wasPressed(" ")) {
      this.processCombatEvents(
        tryPlayerAction(p, "kick", this.players, this.ball, this.referee, this.particles),
      );
    }
    if (this.input.wasPressed("k")) {
      this.processCombatEvents(
        tryPlayerAction(p, "slide", this.players, this.ball, this.referee, this.particles),
      );
      this.camera.addShake(0.6);
    }
    if (this.input.wasPressed("l")) {
      this.processCombatEvents(
        tryPlayerAction(p, "punch", this.players, this.ball, this.referee, this.particles),
      );
      this.camera.addShake(0.4);
    }
  }

  private cycleControlled(): void {
    const home = this.players.filter((p) => p.team === "home" && p.canAct);
    if (home.length === 0) return;
    const idx = home.findIndex((p) => p.id === this.controlledId);
    const next = home[(idx + 1) % home.length]!;
    for (const p of this.players) p.controlled = false;
    next.controlled = true;
    this.controlledId = next.id;
  }

  private updatePlayersPhysics(dt: number): void {
    for (const p of this.players) {
      p.updateTimers(dt);
      if (!p.canAct && p.downed > 0) {
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // damp slide burst
      if (Math.hypot(p.vx, p.vy) > PLAYER.speed * 1.3) {
        p.vx *= Math.pow(0.92, dt * 60);
        p.vy *= Math.pow(0.92, dt * 60);
      }

      p.x = Math.max(0.5, Math.min(PITCH.width - 0.5, p.x));
      p.y = Math.max(0.5, Math.min(PITCH.height - 0.5, p.y));
    }

    // soft separation
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i]!;
        const b = this.players[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const min = PLAYER.radius * 2;
        if (dist > 0 && dist < min) {
          const push = ((min - dist) / min) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  private pickupBall(): void {
    if (this.ball.owner || this.ball.z > 1.2) return;
    let best: Player | null = null;
    let bestD = 1.45;
    for (const p of this.players) {
      if (!p.canAct) continue;
      const d = p.distanceTo(this.ball.pos);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) this.ball.attach(best);
  }

  private checkGoals(): void {
    const inGoalY =
      this.ball.y > (PITCH.height - PITCH.goalWidth) / 2 &&
      this.ball.y < (PITCH.height + PITCH.goalWidth) / 2;

    if (inGoalY && this.ball.x < -0.5) {
      this.score.away += 1;
      this.onGoal("away");
    } else if (inGoalY && this.ball.x > PITCH.width + 0.5) {
      this.score.home += 1;
      this.onGoal("home");
    }
  }

  private onGoal(team: TeamId): void {
    this.phase = "goal";
    this.phaseTimer = 2.2;
    this.ball.release();
    this.showBanner(team === "home" ? "GOOOOL BLU!" : "GOOOOL ROSSI!");
    this.setStatus("GOL");
    this.camera.addShake(1.2);
    this.updateHud();
  }

  private resetPositions(kickTeam: TeamId): void {
    this.players = [];
    this.spawnTeam("home");
    this.spawnTeam("away");
    this.ball = new Ball(PITCH.width / 2, PITCH.height / 2);
    this.referee = new Referee(PITCH.width / 2, 3);
    this.selectNearestHome();
    // nudge ball slightly toward kick team
    this.ball.x = PITCH.width / 2 + (kickTeam === "home" ? -2 : 2);
    void kickTeam;
  }

  private processCombatEvents(events: CombatEvent[]): void {
    for (const ev of events) {
      if (ev.kind === "foul" && ev.severity >= 18 && this.refCooldown <= 0) {
        if (shouldRefereeIntervene(ev.severity, this.referee)) {
          this.pendingFoul = ev;
          this.phase = "ref_intervene";
          this.phaseTimer = 2.5;
          this.refCooldown = 12;
          this.referee.state = "intervening";
          this.referee.target = { x: ev.x, y: ev.y };
          this.referee.whistleTimer = 1;
          this.showBanner("FISCHIO DELL'ARBITRO!", true);
          this.setStatus("ARBITRO IN ARRIVO");
          this.camera.addShake(0.5);
        }
      }
      if (ev.kind === "ref_hit") {
        this.camera.addShake(0.7);
        this.setStatus("ARBITRO SOTTO ATTACCO");
      }
      if (ev.severity >= 20) this.camera.addShake(0.35);
    }
  }

  private updateRefereeApproach(dt: number): void {
    const target = this.pendingFoul ?? { x: this.ball.x, y: this.ball.y };
    const dx = target.x - this.referee.x;
    const dy = target.y - this.referee.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.referee.x += (dx / dist) * 18 * dt;
    this.referee.y += (dy / dist) * 18 * dt;
    this.referee.update(dt);

    // freeze most players briefly
    for (const p of this.players) {
      if (Math.hypot(p.vx, p.vy) < 30) {
        p.vx *= 0.85;
        p.vy *= 0.85;
      }
      p.updateTimers(dt);
    }
  }

  private refFightAI(dt: number): void {
    if (this.referee.state !== "fighting" || this.referee.stunned > 0) return;
    // ref punches nearest attacker
    let nearest: Player | null = null;
    let best = Infinity;
    for (const p of this.players) {
      if (!p.canAct) continue;
      const d = this.referee.distanceTo(p.pos);
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    if (!nearest) return;
    const dx = nearest.x - this.referee.x;
    const dy = nearest.y - this.referee.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.referee.x += (dx / dist) * 16 * dt;
    this.referee.y += (dy / dist) * 16 * dt;
    if (dist < 2 && this.referee.punchCooldown <= 0) {
      this.referee.punchCooldown = 0.7;
      nearest.applyDamage(12, (dx / dist) * 14, (dy / dist) * 14);
      this.camera.addShake(0.4);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private draw(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);
    drawPitch(this.ctx, this.camera, w, h);
    drawEntities(this.ctx, this.camera, this.players, this.ball, this.referee, this.particles);

    // vignette
    const g = this.ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);

    // help strip
    if (this.phase === "play" || this.phase === "ref_fight") {
      this.ctx.fillStyle = "rgba(0,0,0,0.45)";
      this.ctx.fillRect(12, h - 36, 420, 24);
      this.ctx.fillStyle = "#e8e4d9";
      this.ctx.font = "12px IBM Plex Sans, sans-serif";
      this.ctx.textAlign = "left";
      this.ctx.fillText(
        this.phase === "ref_fight"
          ? "K scivolata · L pugno · J calcio  —  stendi l'arbitro!"
          : "J tiro · K scivolata · L pugno · Tab cambia",
        20,
        h - 20,
      );
    }
  }

  private updateHud(): void {
    this.scoreEl.textContent = `${this.score.home} — ${this.score.away}`;
    const display = MATCH.halfSeconds - this.clock;
    const dm = Math.floor(display / 60);
    const ds = Math.floor(display % 60)
      .toString()
      .padStart(2, "0");
    this.clockEl.textContent = `${dm}:${ds}`;
  }

  private showBanner(text: string, warn = false): void {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.toggle("warn", warn);
    this.bannerEl.classList.remove("hidden");
  }

  private hideBanner(): void {
    this.bannerEl.classList.add("hidden");
  }

  private setStatus(text: string): void {
    this.statusEl.textContent = text;
  }
}
