import { state, dayKey, shiftDay, fmtDate, dayHasContent, sleepHours } from "../state.js";
import { esc, copyText, download } from "./dom.js";

let days = 7;

export function render(root) {
  const text = summary(days);
  root.innerHTML = `
  <p class="help">A plain-text summary of the last week or month: averages, urges acted on, drawer results, chains, crisis-mode uses. Copy it for a therapist or just read it yourself. Nothing leaves this PC unless you copy it out.</p>
  <div class="row mb">
    <button class="chip purple ${days === 7 ? "on" : ""}" data-days="7">Last 7 days</button>
    <button class="chip purple ${days === 30 ? "on" : ""}" data-days="30">Last 30 days</button>
    <span class="grow"></span>
    <button class="btn teal" data-copy>Copy</button>
    <button class="btn" data-dl>Download .txt</button>
  </div>
  <section class="card review"><pre id="rv-text">${esc(text)}</pre></section>`;
  root.addEventListener("click", (e) => {
    const d = e.target.closest("[data-days]");
    if (d) { days = Number(d.dataset.days); render(root); return; }
    if (e.target.closest("[data-copy]")) copyText(text);
    if (e.target.closest("[data-dl]")) download(`ballast-summary-${dayKey()}.txt`, text);
  });
}

export function summary(n) {
  const keys = []; for (let i = n - 1; i >= 0; i--) keys.push(shiftDay(dayKey(), -i));
  const s = state.settings;
  const L = [];
  L.push(`Ballast summary: ${fmtDate(keys[0])} to ${fmtDate(keys[keys.length - 1])} (${n} days)`);
  L.push("");
  const filled = keys.filter((k) => dayHasContent(state.diary[k]));
  L.push(`Diary cards filled: ${filled.length} of ${n}`);
  L.push("");
  L.push("Emotions (average of rated days / peak / days at 4+):");
  for (const e of s.emotions) {
    const vals = keys.map((k) => state.diary[k]?.emotions?.[e]).filter((v) => v != null);
    if (!vals.length) { L.push(`  ${e}: no ratings`); continue; }
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    L.push(`  ${e}: avg ${avg}, peak ${Math.max(...vals)}, high days ${vals.filter((v) => v >= 4).length}`);
  }
  L.push("");
  L.push("Urges (days present / days acted on):");
  for (const u of s.urges) {
    const recs = keys.map((k) => state.diary[k]?.urges?.[u]).filter(Boolean);
    const present = recs.filter((r) => r.level > 0).length, acted = recs.filter((r) => r.acted).length;
    if (!recs.length) continue;
    L.push(`  ${u}: ${present} / ${acted}`);
  }
  L.push("");
  const sleep = keys.map((k) => Number(state.diary[k]?.vuln?.sleep)).filter((v) => v > 0);
  if (sleep.length) L.push(`Sleep: avg ${(sleep.reduce((a, b) => a + b, 0) / sleep.length).toFixed(1)} h over ${sleep.length} days, min ${Math.min(...sleep)}`);
  const stretches = keys.map((k) => (state.diary[k]?.sleep || []).length).filter((n) => n > 0);
  if (stretches.length) {
    const broken = stretches.filter((n) => n > 1).length;
    const longest = keys.map((k) => Math.max(0, ...(state.diary[k]?.sleep || []).map(sleepHours))).filter((h) => h > 0);
    L.push(`  broken sleep (2+ stretches) on ${broken} of ${stretches.length} days; avg stretches/day ${(stretches.reduce((a, b) => a + b, 0) / stretches.length).toFixed(1)}` +
      (longest.length ? `; longest single stretch avg ${(longest.reduce((a, b) => a + b, 0) / longest.length).toFixed(1)} h` : ""));
  }
  const cnt = (k) => keys.filter((d) => state.diary[d]?.vuln?.[k] === true).length;
  L.push(`Days with: conflict ${cnt("conflict")}, pain/illness ${cnt("pain")}, alcohol/drugs ${cnt("substances")}, regular meals ${cnt("ate")}`);
  L.push("");
  const skillCount = {};
  for (const k of keys) for (const sk of state.diary[k]?.skills || []) skillCount[sk] = (skillCount[sk] || 0) + 1;
  const top = Object.entries(skillCount).sort((a, b) => b[1] - a[1]);
  L.push(top.length ? "Skills used: " + top.map(([k, v]) => `${k} (${v})`).join(", ") : "Skills used: none logged");
  L.push("");
  const since = Date.now() - n * 864e5;
  const dr = state.drawer.filter((m) => m.createdAt >= since);
  const c = { sent: 0, edited: 0, deleted: 0, held: 0, ready: 0 };
  for (const m of dr) c[m.status]++;
  L.push(`Drawer: ${dr.length} messages held. Let go ${c.deleted}, edited ${c.edited}, sent as written ${c.sent}, still waiting ${c.held + c.ready}.`);
  const chains = state.chains.filter((x) => keys.includes(x.date));
  L.push(`Chain analyses: ${chains.length}` + (chains.length ? " -> " + chains.map((x) => `${fmtDate(x.date)}: ${x.behavior || x.prompt}`.slice(0, 70)).join("; ") : ""));
  const cr = state.crises.filter((x) => x.at >= since);
  if (cr.length) {
    const rated = cr.filter((x) => x.before != null && x.after != null);
    const drop = rated.length ? (rated.reduce((a, x) => a + (x.before - x.after), 0) / rated.length).toFixed(1) : "n/a";
    L.push(`Crisis mode used ${cr.length} times; average distress drop ${drop} points (0-10 scale).`);
  } else L.push("Crisis mode: not used.");
  const checks = state.coach.filter((x) => keys.includes(x.date));
  if (checks.length) L.push(`Emotion check-ins: ${checks.length} (${checks.filter((x) => !x.fits).length} opposite action, ${checks.filter((x) => x.fits).length} fit the facts).`);
  const sus = (state.suspicions || []).filter((x) => keys.includes(x.date));
  if (sus.length) { const closed = sus.filter((x) => x.outcome); L.push(`Suspicion checks: ${sus.length} logged, ${closed.length} closed, ${closed.filter((x) => x.outcome === "true").length} turned out true.`); }
  const preds = state.people.flatMap((p) => p.predictions.filter((x) => x.outcome && keys.includes(x.date)));
  if (preds.length) L.push(`Abandonment predictions checked: ${preds.length}, came true ${preds.filter((x) => x.outcome === "hit").length}.`);
  L.push("");
  const notes = filled.filter((k) => state.diary[k].note).map((k) => `  ${fmtDate(k)}: ${state.diary[k].note}`);
  if (notes.length) { L.push("Notes:"); L.push(...notes); }
  return L.join("\n");
}
