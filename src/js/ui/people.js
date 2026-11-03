import { state, save, uid, dayKey, fmtDate } from "../state.js";
import { esc, toast, confirmBox } from "./dom.js";
import { refresh } from "../router.js";

let selected = null;

export function render(root) {
  const people = state.people;
  if (selected && !people.some((p) => p.id === selected)) selected = null;
  if (!selected && people.length) selected = people[0].id;
  const p = people.find((x) => x.id === selected);

  root.innerHTML = `
  <p class="help">One card per person. Write down concrete things they did, both kinds, while you are calm. When your mind flips someone to all-bad or all-good, open their card and read the whole record. Below that, log the abandonment predictions and later fill in what actually happened.</p>
  <div class="people-nav">
    ${people.map((x) => `<button class="chip purple ${x.id === selected ? "on" : ""}" data-sel="${x.id}">${esc(x.name)}</button>`).join("")}
    <span class="row"><input type="text" id="pp-new" placeholder="add a person" style="width:160px"><button class="btn sm" id="pp-add">Add</button></span>
  </div>
  ${p ? personHtml(p) : '<div class="empty">Add a person to start a card.</div>'}`;
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "pp-new") addPerson(); });
}

function personHtml(p) {
  p.entries ||= []; p.predictions ||= [];
  const kind = p.entries.filter((e) => e.kind === "kind"), hurt = p.entries.filter((e) => e.kind === "hurt"), neutral = p.entries.filter((e) => e.kind === "neutral");
  const entry = (e) => `<div class="entry" data-eid="${e.id}"><div class="d">${fmtDate(e.date)} <button class="btn sm ghost" data-rme title="remove" style="padding:0 .3rem">×</button></div>${esc(e.text)}</div>`;
  const scored = p.predictions.filter((x) => x.outcome);
  const hits = scored.filter((x) => x.outcome === "hit").length;
  return `
  <div class="row between mb"><h2>${esc(p.name)}</h2><button class="btn sm danger" data-delperson>Remove card</button></div>
  <section class="card accent-purple mb">
    <h3>Add to the record</h3>
    <div class="row">
      <input type="date" data-e="date" value="${dayKey()}" style="width:160px">
      <select data-e="kind" style="width:150px"><option value="kind">they did right</option><option value="hurt">they hurt me</option><option value="neutral">neutral fact</option></select>
      <input type="text" data-e="text" class="grow" placeholder="what happened, concretely">
      <button class="btn primary" data-adde>Add</button>
    </div>
  </section>
  <div class="person-cols">
    <section class="card col-kind"><h3>Things they did right (${kind.length})</h3>${kind.length ? kind.map(entry).join("") : '<div class="empty">nothing recorded</div>'}</section>
    <section class="card col-hurt"><h3>Things that hurt (${hurt.length})</h3>${hurt.length ? hurt.map(entry).join("") : '<div class="empty">nothing recorded</div>'}</section>
  </div>
  ${neutral.length ? `<section class="card mt"><h3>Neutral facts</h3>${neutral.map(entry).join("")}</section>` : ""}

  <section class="card accent-teal mt">
    <h3>Abandonment predictions</h3>
    <p class="small muted">When the fear says "they are leaving", write the prediction down with what set it off. Later, come back and write what actually happened. The hit rate is the point.</p>
    <div class="row between">
      <div class="row"><span class="hitrate">${scored.length ? Math.round((hits / scored.length) * 100) + "%" : "–"}</span><span class="small muted">of ${scored.length} checked predictions came true</span></div>
    </div>
    <div class="row mt">
      <input type="date" data-p="date" value="${dayKey()}" style="width:160px">
      <input type="text" data-p="event" placeholder="what set it off" class="grow">
      <input type="text" data-p="prediction" placeholder="what I am predicting will happen" class="grow">
      <button class="btn teal" data-addp>Log</button>
    </div>
    <div class="list mt">
      ${[...p.predictions].reverse().map((x) => `<div class="item" data-pid="${x.id}">
        <div class="head"><span>${fmtDate(x.date)} · <span class="muted">${esc(x.event)}</span></span>
          ${x.outcome ? `<span class="pill ${x.outcome === "hit" ? "danger" : "ok"}">${x.outcome === "hit" ? "came true" : "did not happen"}</span>` : '<span class="pill">open</span>'}</div>
        <div><b>Predicted:</b> ${esc(x.prediction)}</div>
        ${x.outcome ? `<div><b>Actually:</b> ${esc(x.actual)}</div>` : `<div class="row mt"><input type="text" data-actual placeholder="what actually happened" class="grow"><button class="btn sm" data-out="miss">did not happen</button><button class="btn sm pink" data-out="hit">came true</button></div>`}
        <div class="right"><button class="btn sm ghost" data-rmp>remove</button></div>
      </div>`).join("")}
    </div>
  </section>`;
}

function addPerson() {
  const inp = document.getElementById("pp-new");
  const name = inp.value.trim();
  if (!name) return;
  const p = { id: uid(), name, entries: [], predictions: [] };
  state.people.push(p); selected = p.id; save(); refresh();
}

function onClick(e) {
  if (e.target.id === "pp-add") { addPerson(); return; }
  const sel = e.target.closest("[data-sel]");
  if (sel) { selected = sel.dataset.sel; refresh(); return; }
  const p = state.people.find((x) => x.id === selected);
  if (!p) return;
  if (e.target.closest("[data-delperson]")) {
    if (!confirmBox(`Remove ${p.name}'s card and everything on it?`)) return;
    state.people = state.people.filter((x) => x.id !== p.id); selected = null; save(); refresh(); return;
  }
  if (e.target.closest("[data-adde]")) {
    const g = (k) => document.querySelector(`[data-e="${k}"]`).value;
    if (!g("text").trim()) { toast("Write what happened"); return; }
    p.entries.push({ id: uid(), date: g("date") || dayKey(), kind: g("kind"), text: g("text").trim() });
    save(); refresh(); return;
  }
  const ent = e.target.closest("[data-eid]");
  if (ent && e.target.closest("[data-rme]")) { p.entries = p.entries.filter((x) => x.id !== ent.dataset.eid); save(); refresh(); return; }
  if (e.target.closest("[data-addp]")) {
    const g = (k) => document.querySelector(`[data-p="${k}"]`).value;
    if (!g("prediction").trim()) { toast("Write the prediction"); return; }
    p.predictions.push({ id: uid(), date: g("date") || dayKey(), event: g("event").trim(), prediction: g("prediction").trim(), actual: "", outcome: null });
    save(); refresh(); return;
  }
  const pr = e.target.closest("[data-pid]");
  if (!pr) return;
  const x = p.predictions.find((y) => y.id === pr.dataset.pid);
  const out = e.target.closest("[data-out]");
  if (out) { x.outcome = out.dataset.out; x.actual = pr.querySelector("[data-actual]").value.trim(); save(); refresh(); return; }
  if (e.target.closest("[data-rmp]")) { p.predictions = p.predictions.filter((y) => y.id !== x.id); save(); refresh(); }
}
