import { state, save, uid, dayKey, fmtDate } from "../state.js";
import { esc, toast, confirmBox } from "./dom.js";
import { refresh } from "../router.js";

// Suspicion check: log a suspicious belief with a confidence, evidence for and
// against, and an alternative explanation; close it out later with what turned
// out to be true. Calibration = how often "X% sure" beliefs actually came true.

let draft = null;

function newDraft() {
  draft = { id: uid(), date: dayKey(), belief: "", sure: 70, about: "", evFor: "", evAgainst: "", alt: "", trigger: "", outcome: null, actual: "", closedAt: null };
  return draft;
}

export function render(root) {
  state.suspicions ||= [];
  const d = draft || newDraft();
  const items = [...state.suspicions].sort((a, b) => b.date.localeCompare(a.date));
  root.innerHTML = `
  <p class="help">When you are sure someone is lying, plotting, laughing at you, or about to turn on you: write the belief down with how sure you are, then the evidence on both sides. Come back later and mark what actually happened. Over time the numbers show whether "90% sure" means 90% or 20%.</p>
  <div class="grid two">
    <section class="card accent-pink">
      <h3>Suspicion check</h3>
      <label class="field"><span>The belief, as plainly as possible</span><textarea data-f="belief" rows="2" placeholder="e.g. They are talking about me behind my back.">${esc(d.belief)}</textarea></label>
      <div class="row">
        <label class="field grow"><span>Who or what it is about</span><input type="text" data-f="about" value="${esc(d.about)}"></label>
        <label class="field" style="width:130px"><span>Date</span><input type="date" data-f="date" value="${d.date}"></label>
      </div>
      <label class="field"><span>How sure are you right now? <b class="countdown" id="sus-sure">${d.sure}%</b></span><input type="range" min="0" max="100" step="5" data-f="sure" value="${d.sure}" style="width:100%"></label>
      <label class="field"><span>What set it off (sleep, a look, a delay in replying, a tone)</span><input type="text" data-f="trigger" value="${esc(d.trigger)}"></label>
      <label class="field"><span>Evidence FOR it (only things a camera would have recorded)</span><textarea data-f="evFor" rows="2">${esc(d.evFor)}</textarea></label>
      <label class="field"><span>Evidence AGAINST it</span><textarea data-f="evAgainst" rows="2">${esc(d.evAgainst)}</textarea></label>
      <label class="field"><span>One other explanation that is at least possible</span><textarea data-f="alt" rows="2">${esc(d.alt)}</textarea></label>
      <div class="row"><button class="btn primary" data-save>Save it and wait</button>${state.suspicions.some((x) => x.id === d.id) ? '<button class="btn ghost" data-cancel>Cancel</button>' : ""}</div>
    </section>
    <section>
      <div class="card accent-teal mb"><h3>Calibration</h3>${calibrationHtml()}</div>
      <h3>Checks</h3>
      <div class="list">${items.length ? items.map(itemHtml).join("") : '<div class="empty">None yet.</div>'}</div>
    </section>
  </div>`;
  root.addEventListener("input", onInput);
  root.addEventListener("click", onClick);
}

function calibrationHtml() {
  const closed = state.suspicions.filter((x) => x.outcome);
  if (!closed.length) return '<div class="empty">Close out a few checks and this fills in.</div>';
  const bands = [[0, 40, "0-40% sure"], [41, 70, "41-70% sure"], [71, 100, "71-100% sure"]];
  const rows = bands.map(([lo, hi, label]) => {
    const b = closed.filter((x) => x.sure >= lo && x.sure <= hi);
    if (!b.length) return "";
    const hit = b.filter((x) => x.outcome === "true").length;
    const part = b.filter((x) => x.outcome === "partly").length;
    return `<div class="rowitem"><span>${label} <span class="muted small">(${b.length})</span></span><span><span class="pill danger">${hit} true</span> <span class="pill">${part} partly</span> <span class="pill ok">${b.length - hit - part} not true</span></span></div>`;
  }).join("");
  const overall = Math.round((closed.filter((x) => x.outcome === "true").length / closed.length) * 100);
  const avgSure = Math.round(closed.reduce((a, x) => a + x.sure, 0) / closed.length);
  return `<div class="row"><span class="hitrate">${overall}%</span><span class="small muted">of ${closed.length} closed beliefs turned out fully true. Average certainty at the time: ${avgSure}%.</span></div>${rows}`;
}

function itemHtml(x) {
  const pill = x.outcome ? { true: '<span class="pill danger">was true</span>', partly: '<span class="pill">partly true</span>', false: '<span class="pill ok">not true</span>' }[x.outcome] : '<span class="pill pink">open</span>';
  return `<details class="item" data-id="${x.id}">
    <summary>${pill} ${fmtDate(x.date)} · ${esc(x.belief).slice(0, 70)} <span class="muted small">(${x.sure}% sure)</span></summary>
    ${x.about ? `<div><b>About:</b> ${esc(x.about)}</div>` : ""}${x.trigger ? `<div><b>Trigger:</b> ${esc(x.trigger)}</div>` : ""}
    ${x.evFor ? `<div><b>For:</b> ${esc(x.evFor)}</div>` : ""}${x.evAgainst ? `<div><b>Against:</b> ${esc(x.evAgainst)}</div>` : ""}${x.alt ? `<div><b>Other explanation:</b> ${esc(x.alt)}</div>` : ""}
    ${x.outcome ? `<div class="mt"><b>What actually happened:</b> ${esc(x.actual) || "(not written)"}</div>` :
      `<div class="row mt"><input type="text" data-actual placeholder="what actually happened" class="grow"><button class="btn sm teal" data-out="false">not true</button><button class="btn sm" data-out="partly">partly</button><button class="btn sm pink" data-out="true">it was true</button></div>`}
    <div class="row mt"><button class="btn sm" data-edit>Edit</button><button class="btn sm danger" data-del>Delete</button></div>
  </details>`;
}

function onInput(e) {
  const d = draft || newDraft();
  if (!e.target.matches("[data-f]")) return;
  const k = e.target.dataset.f;
  d[k] = k === "sure" ? Number(e.target.value) : e.target.value;
  if (k === "sure") document.getElementById("sus-sure").textContent = d.sure + "%";
}

function onClick(e) {
  const d = draft || newDraft();
  if (e.target.closest("[data-save]")) {
    if (!d.belief.trim()) { toast("Write the belief first"); return; }
    const i = state.suspicions.findIndex((x) => x.id === d.id);
    if (i >= 0) state.suspicions[i] = d; else state.suspicions.push(d);
    draft = null; save(); toast("Saved. Come back when you know more."); refresh(); return;
  }
  if (e.target.closest("[data-cancel]")) { draft = null; refresh(); return; }
  const item = e.target.closest("[data-id]");
  if (!item) return;
  const x = state.suspicions.find((y) => y.id === item.dataset.id);
  const out = e.target.closest("[data-out]");
  if (out) { x.outcome = out.dataset.out; x.actual = item.querySelector("[data-actual]").value.trim(); x.closedAt = Date.now(); save(); refresh(); return; }
  if (e.target.closest("[data-edit]")) { draft = structuredClone(x); refresh(); return; }
  if (e.target.closest("[data-del]") && confirmBox("Delete this check?")) { state.suspicions = state.suspicions.filter((y) => y.id !== x.id); save(); refresh(); }
}
