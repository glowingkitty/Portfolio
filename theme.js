(() => {
  const preferenceKey = "portfolio-palette";
  const palettes = new Set(["rose", "lavender", "sage"]);
  let chosen = "rose";

  try {
    const saved = localStorage.getItem(preferenceKey);
    if (palettes.has(saved)) chosen = saved;
  } catch {
    // The picker still applies for the current page when browser storage is unavailable.
  }

  document.documentElement.dataset.palette = chosen;

  document.addEventListener("DOMContentLoaded", () => {
    const picker = document.querySelector("select[data-palette]");
    if (!picker) return;

    picker.value = chosen;
    picker.closest("label").hidden = false;
    picker.addEventListener("change", () => {
      document.documentElement.dataset.palette = picker.value;
      try {
        localStorage.setItem(preferenceKey, picker.value);
      } catch {
        // The selected color is already applied to the current page.
      }
    });
  }, { once: true });
})();
