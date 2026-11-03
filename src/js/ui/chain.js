import { state, save, uid, dayKey, fmtDate } from "../state.js";
import { LINK_KINDS } from "../data/skills.js";
import { esc, toast, confirmBox } from "./dom.js";
import { refresh } from "../router.js";

let draft = null;

export function render(root) {
  root.innerHTML = `
  <p class="help">Chain analysis: after something blew up, walk it backward. Trigger, what made you vulnerable, then each link in order (a thought, a feeling, a body sensation, an action, something that happened), then what it cost, then where a skill could have gone in. It is a map, not a verdict.</p>
  <div class="grid two">
    <section class="card accent-purple">
      <h3>${draft ? "Editing" : "New chain"}</h3>
      ${formHtml(draft || newDraft())}
    </section>
    <section>
      <h3>Past chains</h3>
      <div class="list">${state.chains.length ? [...state.chains].sort((a, b) => b.date.localeCompare(a.date)).map(viewHtml).join("") : '<div class="empty">None yet.</div>'}</div>
    </section>
  </div>`;
  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
}

function newDraft() {
  draft = { id: uid(), date: dayKey(), behavior: "", prompt: "", vuln: "", links: [{ kind: "thought", text: "" }], consequences: "", skillPoint: "", repair: "" };
  return draft;
}

function formHtml(c) {
  return `
  <label class="field"><span>Date</span><input type="date" data-f="date" value="${c.date}"></label>
  <label class="field"><span>The behaviour (what you did that you want to understand)</span><textarea data-f="behavior" rows="2">${esc(c.behavior)}</textarea></label>
  <label class="field"><span>Prompting event (what set it off, just the facts)</span><textarea data-f="prompt" rows="2">${esc(c.prompt)}</textarea></label>
  <label class="field"><span>Vulnerabilities (sleep, hunger, pain, earlier conflict, substances)</span><textarea data-f="vuln" rows="2">${esc(c.vuln)}</textarea></label>
  <div class="field"><span class="small muted">Links, in order</span>
    <div class="links">${c.links.map((l, i) => `
      <div class="link" data-i="${i}">
        <select data-lk="${i}">${LINK_KINDS.map((k) => `<option ${l.kind === k ? "selected" : ""}>${k}</option>`).join("")}</select>
        <input type="text" data-lt="${i}" value="${esc(l.text)}" placeholder="then…">
        <button class="btn sm ghost" data-rm="${i}" title="remove">×</button>
      </div>`).join("")}</div>
    <button class="btn sm" data-addlink>+ add link</button>
  </div>
  <label class="field"><span>Consequences (for you, for others, short and long term)</span><textarea data-f="consequences" rows="2">${esc(c.consequences)}</textarea></label>
  <label class="field"><span>Where could a skill have gone in, and which one?</span><textarea data-f="skillPoint" rows="2">${esc(c.skillPoint)}</textarea></label>
  <label class="field"><span>Repair (what, if anything, you will do about the damage)</span><textarea data-f="repair" rows="2">${esc(c.repair)}</textarea></label>
  <div class="row"><button class="btn primary" data-save>Save chain</button>${draft && state.chains.some((x) => x.id === draft.id) ? '<button class="btn ghost" data-cancel>Cancel</button>' : ""}</div>`;
}

function viewHtml(c) {
  const step = (l, v) => v ? `<div class="step"><b>${l}</b><span>${esc(v)}</span></div>` : "";
  return `<details class="item chainview" data-id="${c.id}">
    <summary>${fmtDate(c.date)} · ${esc(c.behavior || "(no behaviour written)").slice(0, 80)}</summary>
    ${step("Prompting event", c.prompt)}${step("Vulnerabilities", c.vuln)}
    ${c.links.filter((l) => l.text).map((l) => `<div class="step"><b class="pill purple" style="justify-self:start">${l.kind}</b><span>${esc(l.text)}</span></div>`).join("")}
    ${step("Behaviour", c.behavior)}${step("Consequences", c.consequences)}${step("Skill point", c.skillPoint)}${step("Repair", c.repair)}
    <div class="row mt"><button class="btn sm" data-edit>Edit</button><button class="btn sm danger" data-del>Delete</button></div>
  </details>`;
}

function onInput(e) {
  const c = draft || newDraft();
  if (e.target.matches("[data-f]")) c[e.target.dataset.f] = e.target.value;
  if (e.target.matches("[data-lt]")) c.links[Number(e.target.dataset.lt)].text = e.target.value;
  if (e.target.matches("[data-lk]")) c.links[Number(e.target.dataset.lk)].kind = e.target.value;
}

function onClick(e) {
  const c = draft || newDraft();
  if (e.target.closest("[data-addlink]")) { c.links.push({ kind: "thought", text: "" }); refresh(); return; }
  const rm = e.target.closest("[data-rm]");
  if (rm) { c.links.splice(Number(rm.dataset.rm), 1); if (!c.links.length) c.links.push({ kind: "thought", text: "" }); refresh(); return; }
  if (e.target.closest("[data-save]")) {
    if (!c.behavior.trim() && !c.prompt.trim()) { toast("Write at least the behaviour or the trigger"); return; }
    const i = state.chains.findIndex((x) => x.id === c.id);
    if (i >= 0) state.chains[i] = c; else state.chains.push(c);
    draft = null; save(); toast("Saved"); refresh(); return;
  }
  if (e.target.closest("[data-cancel]")) { draft = null; refresh(); return; }
  const item = e.target.closest("[data-id]");
  if (!item) return;
  if (e.target.closest("[data-edit]")) { draft = structuredClone(state.chains.find((x) => x.id === item.dataset.id)); refresh(); }
  if (e.target.closest("[data-del]") && confirmBox("Delete this chain?")) { state.chains = state.chains.filter((x) => x.id !== item.dataset.id); save(); refresh(); }
}
