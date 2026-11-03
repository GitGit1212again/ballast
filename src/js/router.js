// Tab routing. Each view exports render(root) and optionally unmount().
// Navigating replaces the #view element so old listeners and timers go away.

const views = {};
let currentTab = "today";

export function register(name, mod) { views[name] = mod; }

export function go(tab) {
  if (!views[tab]) return;
  views[currentTab]?.unmount?.();
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  // On a phone the tab row scrolls sideways: keep the active tab in sight.
  const bar = document.getElementById("tabs"), act = bar.querySelector(".active");
  if (act && act.scrollIntoView && bar.scrollWidth > bar.clientWidth) act.scrollIntoView({ inline: "center", block: "nearest" });
  refresh();
  window.scrollTo({ top: 0 });
}

export function refresh() {
  const old = document.getElementById("view");
  const fresh = old.cloneNode(false);
  old.replaceWith(fresh);
  views[currentTab].render(fresh);
}

export function current() { return currentTab; }
