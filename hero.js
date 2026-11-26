import { createLavaLamp } from "./hero-bubbles.js";

const hero = document.querySelector(".home-hero");
const controls = hero.querySelector(".hero-controls");
const progress = hero.querySelector(".hero-progress");
const progressFill = progress.firstElementChild;
const status = hero.querySelector('[role="status"]');
const artwork = hero.querySelectorAll(".hero-art");
const artworkLink = hero.querySelector(".hero-artwork");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const lavaLamp = createLavaLamp(hero.querySelector(".lava-lamp"));

const characterDelay = 39;
const lineDelay = 185;
const exitDuration = 290;
const holdDuration = 5100;
const manualDuration = 20_000;

const slides = [...hero.querySelectorAll(".hero-slide")].map((element) => {
  let nextLine = 0;

  const lines = [...element.querySelectorAll(".hero-line")].map((line) => {
    const text = line.textContent;
    const characters = Array.from(text);
    const output = document.createElement("span");
    const start = nextLine;
    nextLine += characters.length * characterDelay + lineDelay;

    line.dataset.text = text;
    line.classList.add("is-typed");
    line.replaceChildren(output);
    return { characters, output, start, visible: 0 };
  });

  return { element, lines, typingDuration: nextLine - lineDelay };
});

let active = 0;
let slideTime = 0;
let animationTime = 0;
let entryDelay = 0;
let lastFrame;
let frameId;
let manuallySelected = false;
let inView = true;

function writeHeadline(time) {
  for (const line of slides[active].lines) {
    const count = Math.max(0, Math.min(line.characters.length, Math.floor((time - line.start) / characterDelay) + 1));
    const showCaret = time >= line.start && time < line.start + line.characters.length * characterDelay + lineDelay;
    line.output.classList.toggle("has-caret", showCaret);
    if (count <= line.visible) continue;

    line.visible = count;
    line.output.textContent = line.characters.slice(0, count).join("");
  }
}

function advance(direction, announce = false) {
  const old = slides[active].element;
  const animated = shouldAnimate();
  hero.querySelector(".is-exiting")?.classList.remove("is-exiting");
  slides[active].element.classList.remove("is-current");
  artwork[active].classList.remove("is-current");
  if (animated) old.classList.add("is-exiting");

  active = (active + direction + slides.length) % slides.length;
  slideTime = 0;
  manuallySelected = announce;
  entryDelay = animated ? exitDuration : 0;
  lastFrame = undefined;
  progressFill.style.transform = "scaleX(0)";

  for (const line of slides[active].lines) {
    line.visible = 0;
    line.output.classList.remove("has-caret");
    line.output.textContent = "";
  }

  slides[active].element.classList.add("is-current");
  artwork[active].classList.add("is-current");
  const { link, linkLabel } = slides[active].element.dataset;
  artworkLink.setAttribute("href", link);
  artworkLink.setAttribute("aria-label", linkLabel);

  if (!animated) writeHeadline(Infinity);
  if (announce) status.textContent = `Slide ${active + 1} of ${slides.length}. ${slides[active].element.dataset.role}.`;
}

function shouldAnimate() {
  return !motionPreference.matches && inView && !document.hidden;
}

function paint(now) {
  frameId = undefined;
  const delta = lastFrame === undefined ? 0 : Math.min(50, now - lastFrame);
  lastFrame = now;
  slideTime += delta;
  animationTime += delta;

  const usualDuration = entryDelay + slides[active].typingDuration + holdDuration;
  const duration = manuallySelected ? Math.max(usualDuration, manualDuration) : usualDuration;
  if (slideTime >= duration) {
    advance(1);
  } else {
    const typingTime = slideTime - entryDelay;
    if (typingTime >= 0) {
      hero.querySelector(".is-exiting")?.classList.remove("is-exiting");
      writeHeadline(typingTime);
    }
    progressFill.style.transform = `scaleX(${slideTime / duration})`;
  }
  lavaLamp.draw(animationTime);
  syncAnimation();
}

function syncAnimation() {
  if (shouldAnimate()) {
    frameId ??= requestAnimationFrame(paint);
  } else {
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    frameId = undefined;
    lastFrame = undefined;
  }
}

function updateMotionPreference() {
  const reduced = motionPreference.matches;
  progress.hidden = reduced;
  if (reduced) {
    hero.querySelector(".is-exiting")?.classList.remove("is-exiting");
    writeHeadline(Infinity);
  }
  syncAnimation();
}

controls.hidden = false;
hero.querySelector(".hero-previous").addEventListener("click", () => advance(-1, true));
hero.querySelector(".hero-next").addEventListener("click", () => advance(1, true));
document.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (!hero.contains(event.target) && (event.target !== document.body || !inView)) return;
  if (event.target.matches?.("input, textarea, select, [contenteditable]")) return;

  event.preventDefault();
  advance(event.key === "ArrowLeft" ? -1 : 1, true);
});

new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncAnimation();
}).observe(hero);

document.addEventListener("visibilitychange", syncAnimation);
motionPreference.addEventListener("change", updateMotionPreference);
updateMotionPreference();
