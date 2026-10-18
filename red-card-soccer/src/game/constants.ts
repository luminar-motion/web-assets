export const PITCH = {
  width: 100,
  height: 64,
  goalWidth: 14,
  goalDepth: 3,
  margin: 4,
};

export const PLAYER = {
  radius: 1.1,
  speed: 22,
  sprintMul: 1.25,
  staminaMax: 100,
  healthMax: 100,
};

export const BALL = {
  radius: 0.55,
  friction: 0.985,
  kickPower: 38,
  passPower: 26,
};

/** Chance (0-1) that a violent foul draws the referee. Keep it rare. */
export const REF_INTERVENE_CHANCE = 0.04;

export const MATCH = {
  /** Real-time seconds per half (arcade-short). */
  halfSeconds: 180,
  timeScale: 1,
};
