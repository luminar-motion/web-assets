export type TeamId = "home" | "away";

export type PlayerRole = "gk" | "def" | "mid" | "fwd";

export type ActionKind = "kick" | "slide" | "punch";

export type MatchPhase =
  | "kickoff"
  | "play"
  | "foul_check"
  | "ref_intervene"
  | "ref_fight"
  | "goal"
  | "ended";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
