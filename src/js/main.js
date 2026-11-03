import { init, state, save } from "./state.js";
import { register, go } from "./router.js";
import * as today from "./ui/today.js";
import * as drawer from "./ui/drawer.js";
import * as chain from "./ui/chain.js";
import * as people from "./ui/people.js";
import * as coach from "./ui/coach.js";
import * as suspicion from "./ui/suspicion.js";
import * as review from "./ui/review.js";
import * as settings from "./ui/settings.js";
import * as crisis from "./ui/crisis.js";
import { toast } from "./ui/dom.js";

register("today", today);
register("drawer", drawer);
register("chain", chain);
register("people", people);
register("coach", coach);
register("suspicion", suspicion);
register("review", review);
register("settings", settings);

async function start() {
  await init();
  // Promote any held drawer messages whose time has passed while the app was closed.
  const now = Date.now();
  let ready = 0;
  for (const m of state.drawer) if (m.status === "held" && m.unlockAt <= now) { m.status = "ready"; ready++; }
  if (ready) save();

  document.getElementById("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (b) go(b.dataset.tab);
  });
  document.getElementById("crisis-btn").addEventListener("click", () => crisis.open());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") crisis.close();
  });

  const hash = location.hash.replace("#", "");
  go(["today", "drawer", "chain", "people", "coach", "suspicion", "review", "settings"].includes(hash) ? hash : "today");
  if (ready) toast(ready === 1 ? "A drawer message is ready to look at" : `${ready} drawer messages are ready to look at`);
}

start();

// Test hook for driving the app from the console or the build check.
window.BL = { state, save, go, crisis };
