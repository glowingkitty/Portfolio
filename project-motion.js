import { createLavaLamp } from "./hero-bubbles.js";

const hero = document.querySelector(".project-hero");
const lavaLamp = createLavaLamp(hero.querySelector(".lava-lamp"));
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let inView = true;
let frame;
let lastFrame;
let elapsed = 0;

hero.classList.add("has-live-bubbles");

const source = new URLSearchParams(location.search).get("from");
const origin = new Map([
  ["design", { title: "Design", href: "design-projects.html" }],
  ["ai", { title: "AI", href: "ai-projects.html" }],
]).get(source);
if (origin) {
  const breadcrumb = hero.querySelector(".breadcrumb");
  breadcrumb.href = origin.href;
  breadcrumb.querySelector("span").textContent = `Projects / ${origin.title}`;
}

function paint(now) {
  elapsed += lastFrame === undefined ? 0 : Math.min(50, now - lastFrame);
  lastFrame = now;
  lavaLamp.draw(elapsed);
  frame = requestAnimationFrame(paint);
}

function syncAnimation() {
  if (inView && !document.hidden && !motionPreference.matches) {
    frame ??= requestAnimationFrame(paint);
  } else {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    lastFrame = undefined;
  }
}

new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncAnimation();
}).observe(hero);
document.addEventListener("visibilitychange", syncAnimation);
motionPreference.addEventListener("change", syncAnimation);
syncAnimation();
