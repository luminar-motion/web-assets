import { worldToScreen } from "./iso";
import type { Vec2 } from "./types";

export class Camera {
  x = 0;
  y = 0;
  private shake = 0;

  follow(target: Vec2, dt: number, width: number, height: number): void {
    const screen = worldToScreen(target.x, target.y);
    const desiredX = screen.x - width / 2;
    const desiredY = screen.y - height / 2 + 40;
    const lerp = 1 - Math.exp(-6 * dt);
    this.x += (desiredX - this.x) * lerp;
    this.y += (desiredY - this.y) * lerp;

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 8);
      this.x += (Math.random() - 0.5) * this.shake * 10;
      this.y += (Math.random() - 0.5) * this.shake * 10;
    }
  }

  addShake(amount: number): void {
    this.shake = Math.min(2.5, this.shake + amount);
  }
}
