const svgNamespace = "http://www.w3.org/2000/svg";
const bubbleArtwork = [
  ["bottom-left1", 477.927, 401.338],
  ["upper-right", 410.358, 456.308],
  ["upper-left", 153.186, 180.093],
  ["left-edge", 74.8352, 130.733],
  ["top-drift", 73.3782, 84.1681],
  ["bottom-right", 182.458, 203.161],
];

function mergeOutline(first, second) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  const sum = first.radius + second.radius;
  const reach = sum * 1.65;

  if (distance >= reach || distance < Math.abs(first.radius - second.radius) * .65) return "";

  const x = dx / distance;
  const y = dy / distance;
  const neck = Math.min(1, (reach - distance) / (reach - sum * .75));
  const entry = first.radius * .56 * Math.sqrt(neck);
  const exit = second.radius * .56 * Math.sqrt(neck);
  const throat = Math.min(entry, exit) * neck;
  const fromX = first.x + first.radius * .57 * x;
  const fromY = first.y + first.radius * .57 * y;
  const toX = second.x - second.radius * .57 * x;
  const toY = second.y - second.radius * .57 * y;
  const span = Math.max(0, distance - sum * .57);
  const point = (px, py, along, across) =>
    `${(px + along * x - across * y).toFixed(2)} ${(py + along * y + across * x).toFixed(2)}`;

  return [
    `M ${point(fromX, fromY, 0, entry)}`,
    `C ${point(fromX, fromY, span * .55, throat)} ${point(toX, toY, -span * .55, throat)} ${point(toX, toY, 0, exit)}`,
    `L ${point(toX, toY, 0, -exit)}`,
    `C ${point(toX, toY, -span * .55, -throat)} ${point(fromX, fromY, span * .55, -throat)} ${point(fromX, fromY, 0, -entry)} Z`,
  ].join(" ");
}

export function createLavaLamp(svg) {
  const hero = svg.closest(".hero");
  const bridges = Array.from({ length: 2 }, () => {
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("fill", "currentColor");
    svg.append(path);
    return path;
  });
  const bubbles = bubbleArtwork.map(([name, width, height]) => {
    const image = document.createElementNS(svgNamespace, "use");
    image.setAttribute("href", `assets/lava-shapes.svg#${name}`);
    image.setAttribute("x", -width / 2);
    image.setAttribute("y", -height / 2);
    image.setAttribute("width", width);
    image.setAttribute("height", height);
    svg.append(image);
    return {
      image,
      radius: Math.min(width, height) * .41,
      phase: Math.random() * Math.PI * 2,
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
    };
  });

  let { width, height } = svg.getBoundingClientRect();
  let time = 0;
  let lastDraw = -Infinity;
  let pointer;

  function trackPointer(event) {
    pointer = {
      clientX: event.clientX,
      clientY: event.clientY,
      id: event.pointerId,
      radius: event.pointerType === "touch" ? 86 : 68,
      expires: Infinity,
    };
  }

  hero.addEventListener("pointerdown", (event) => {
    if (event.isPrimary) trackPointer(event);
  }, { passive: true });
  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" || (pointer?.expires === Infinity && event.pointerId === pointer.id)) {
      trackPointer(event);
    }
  }, { passive: true });
  hero.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "mouse" && event.pointerId === pointer?.id) {
      pointer.expires = performance.now() + 110;
    }
  }, { passive: true });
  for (const eventName of ["pointerleave", "pointercancel"]) {
    hero.addEventListener(eventName, (event) => {
      if (event.pointerId !== pointer?.id) return;
      // Touch has implicit pointer capture. The release can also emit pointerleave.
      if (eventName === "pointercancel" || pointer.expires === Infinity) pointer = undefined;
    }, { passive: true });
  }

  function draw(elapsed, force = false) {
    const delta = elapsed - lastDraw;
    if (!force && delta < 1000 / 30 - 1) return;

    time = elapsed;
    lastDraw = elapsed;
    const t = elapsed / 2200;
    const size = Math.max(.34, Math.min(1.1, width / 1440));
    const step = Number.isFinite(delta) ? Math.max(0, Math.min(.05, delta / 1000)) : 0;
    const damping = Math.exp(-5.8 * step);
    if (pointer && performance.now() > pointer.expires) pointer = undefined;
    const bounds = pointer && svg.getBoundingClientRect();

    function position(bubble, x, y) {
      const wave = t * .37 + bubble.phase;
      const scaleX = size * (1 + .085 * Math.sin(wave));
      const scaleY = size * (1 - .105 * Math.sin(wave + .8));
      const radius = bubble.radius * Math.sqrt(scaleX * scaleY);
      let pushX = 0;
      let pushY = 0;

      if (bounds) {
        const dx = x + bubble.offsetX - pointer.clientX + bounds.left;
        const dy = y + bubble.offsetY - pointer.clientY + bounds.top;
        const distance = Math.hypot(dx, dy);
        const gap = Math.max(0, distance - radius);
        const proximity = Math.max(0, 1 - gap / pointer.radius);
        const strength = 2150 * proximity ** 2;
        pushX = distance > .01 ? strength * dx / distance : 0;
        pushY = distance > .01 ? strength * dy / distance : -strength;
      }

      // A damped spring brings each shape back to its own drifting position.
      bubble.velocityX = (bubble.velocityX + (pushX - bubble.offsetX * 16) * step) * damping;
      bubble.velocityY = (bubble.velocityY + (pushY - bubble.offsetY * 16) * step) * damping;
      bubble.offsetX += bubble.velocityX * step;
      bubble.offsetY += bubble.velocityY * step;
      x += bubble.offsetX;
      y += bubble.offsetY;
      bubble.image.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(5 * Math.sin(wave * .73)).toFixed(2)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})`);
      return { x, y, radius };
    }

    const [bottomLeft, upperRight, ...floating] = bubbles;
    position(bottomLeft, width * .04 + 28 * Math.sin(t * .26 + bottomLeft.phase),
      height * .98 + 24 * Math.cos(t * .29 + bottomLeft.phase));
    position(upperRight, width * .96 + 30 * Math.sin(t * .27 + upperRight.phase),
      height * .12 + 28 * Math.cos(t * .21 + upperRight.phase));

    for (let pair = 0; pair < bridges.length; pair++) {
      const [first, second] = floating.slice(pair * 2, pair * 2 + 2);
      const phase = first.phase;
      const cycle = t * (pair === 0 ? .43 : .36) + phase;
      const distance = (first.radius + second.radius) * size * (1.51 + .92 * Math.cos(cycle));
      const angle = Math.PI / 2 + .35 * Math.sin(t * .19 + phase);
      const dx = Math.cos(angle) * distance / 2;
      const dy = Math.sin(angle) * distance / 2;
      const x = width * (pair === 0 ? .18 : .81) + Math.min(53, width * .05) * Math.sin(t * .24 + phase);
      const y = height * (pair === 0 ? .26 : .77) + Math.min(120, height * .15) * Math.cos(t * .29 + phase);
      const a = position(first, x - dx, y - dy);
      const b = position(second, x + dx, y + dy);
      bridges[pair].setAttribute("d", mergeOutline(a, b));
    }
  }

  new ResizeObserver(([entry]) => {
    ({ width, height } = entry.contentRect);
    draw(time, true);
  }).observe(svg);

  return { draw };
}
