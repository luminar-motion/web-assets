import "./style.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const overlay = document.getElementById("overlay")!;
const startBtn = document.getElementById("start-btn")!;

const game = new Game(canvas);

startBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  game.start();
});

startBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    startBtn.click();
  }
});
