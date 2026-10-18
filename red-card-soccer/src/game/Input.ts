export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (!this.down.has(key)) {
        this.pressed.add(key);
      }
      this.down.add(key);
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(key)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.down.delete(e.key.toLowerCase());
    });
    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  isDown(key: string): boolean {
    return this.down.has(key.toLowerCase());
  }

  wasPressed(key: string): boolean {
    return this.pressed.has(key.toLowerCase());
  }

  endFrame(): void {
    this.pressed.clear();
  }

  moveVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown("a") || this.isDown("arrowleft")) x -= 1;
    if (this.isDown("d") || this.isDown("arrowright")) x += 1;
    if (this.isDown("w") || this.isDown("arrowup")) y -= 1;
    if (this.isDown("s") || this.isDown("arrowdown")) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
