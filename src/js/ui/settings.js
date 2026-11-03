import { state, save, replaceState, resetState } from "../state.js";
import { backend } from "../storage.js";
import { DEFAULT_SETTINGS, DEFAULT_EMOTIONS, DEFAULT_URGES } from "../data/skills.js";
import { esc, toast, download, confirmBox } from "./dom.js";
import { refresh } from "../router.js";

export function render(root) {
  const s = state.settings;
  const list = (key, title, hint) => `
    <section class="card mb"><h3>${title}</h3><p class="small muted">${hint}</p>
      <div class="editlist">${s[key].map((v, i) => `<div class="row"><input type="text" data-list="${key}" data-i="${i}" value="${esc(v)}"><button class="btn sm ghost" data-rml="${key}" data-i="${i}">×</button></div>`).join("")}</div>
      <button class="btn sm mt" data-addl="${key}">+ add</button></section>`;
  root.innerHTML = `
  <p class="help">Everything here is yours to change. The lists feed the Today card and crisis mode. Data is stored ${backend() === "file" ? "in <code>data/ballast.json</code> next to the app" : "in this browser's local storage (open the app through Run-Ballast.cmd to store it as a file instead)"}.</p>
  <div class="grid two">
    <div>
      ${list("emotions", "Emotions on the daily card", "Rated 0 to 5 each day.")}
      ${list("urges", "Urges on the daily card", "Rated 0 to 5, plus whether you acted on it.")}
      ${list("soothe", "Self-soothe list (crisis step 3)", "Things that calm the body. Specific beats general.")}
      ${list("distract", "Distraction list (crisis step 3)", "Things that take the mind somewhere else for 15 minutes.")}
    </div>
    <div>
      <section class="card accent-pink mb"><h3>Crisis plan</h3>
        <p class="small muted">Written by you, when calm, for you, when not. Warning signs, what has helped before, what to do in order, who to call, where the risk items are kept.</p>
        <textarea data-plan rows="8" placeholder="When I notice… I will… If that does not work I will… People I can call…">${esc(s.plan)}</textarea></section>
      <section class="card accent-teal mb"><h3>People to call</h3>
        <div class="editlist">${s.contacts.map((c, i) => `<div class="row"><input type="text" data-c="name" data-i="${i}" value="${esc(c.name)}" placeholder="name" style="flex:1"><input type="text" data-c="number" data-i="${i}" value="${esc(c.number)}" placeholder="number" style="flex:1"><input type="text" data-c="note" data-i="${i}" value="${esc(c.note || "")}" placeholder="note" style="flex:1"><button class="btn sm ghost" data-rmc="${i}">×</button></div>`).join("")}</div>
        <button class="btn sm mt" data-addc>+ add person</button></section>
      <section class="card mb"><h3>Hotlines</h3>
        <div class="editlist">${s.hotlines.map((c, i) => `<div class="row"><input type="text" data-h="name" data-i="${i}" value="${esc(c.name)}" placeholder="name" style="flex:2"><input type="text" data-h="number" data-i="${i}" value="${esc(c.number)}" placeholder="number" style="flex:1"><input type="text" data-h="note" data-i="${i}" value="${esc(c.note || "")}" placeholder="note" style="flex:1"><button class="btn sm ghost" data-rmh="${i}">×</button></div>`).join("")}</div>
        <button class="btn sm mt" data-addh>+ add hotline</button>
        <label class="field mt"><span>Emergency line shown at the bottom of crisis mode</span><input type="text" data-emergency value="${esc(s.emergency)}"></label></section>
      <section class="card mb"><h3>Backup</h3>
        <div class="row"><button class="btn" data-export>Export all data (.json)</button><label class="btn">Import .json<input type="file" accept=".json,application/json" data-import hidden></label></div>
        <div class="row mt"><button class="btn sm ghost" data-resetlists>Reset lists to defaults</button><button class="btn sm danger" data-wipe>Erase everything</button></div></section>
    </div>
  </div>`;
  root.addEventListener("input", onInput);
  root.addEventListener("change", onChange);
  root.addEventListener("click", onClick);
}

function onInput(e) {
  const s = state.settings, t = e.target, i = Number(t.dataset.i);
  if (t.matches("[data-list]")) s[t.dataset.list][i] = t.value;
  if (t.matches("[data-c]")) s.contacts[i][t.dataset.c] = t.value;
  if (t.matches("[data-h]")) s.hotlines[i][t.dataset.h] = t.value;
  if (t.matches("[data-plan]")) s.plan = t.value;
  if (t.matches("[data-emergency]")) s.emergency = t.value;
  save();
}

function onChange(e) {
  if (!e.target.matches("[data-import]")) return;
  const f = e.target.files[0]; if (!f) return;
  f.text().then((txt) => {
    try {
      const obj = JSON.parse(txt);
      if (!obj || typeof obj !== "object" || !("diary" in obj)) throw new Error("not a Ballast file");
      if (!confirmBox("Replace everything in Ballast with this file?")) return;
      replaceState(obj); toast("Imported"); refresh();
    } catch (err) { toast("Could not import: " + err.message); }
  });
}

function onClick(e) {
  const s = state.settings;
  const t = e.target.closest("button"); if (!t) return;
  const i = Number(t.dataset.i);
  if (t.dataset.addl) { s[t.dataset.addl].push(""); save(); refresh(); return; }
  if (t.dataset.rml) { s[t.dataset.rml].splice(i, 1); save(); refresh(); return; }
  if (t.hasAttribute("data-addc")) { s.contacts.push({ name: "", number: "", note: "" }); save(); refresh(); return; }
  if (t.dataset.rmc != null) { s.contacts.splice(Number(t.dataset.rmc), 1); save(); refresh(); return; }
  if (t.hasAttribute("data-addh")) { s.hotlines.push({ name: "", number: "", note: "" }); save(); refresh(); return; }
  if (t.dataset.rmh != null) { s.hotlines.splice(Number(t.dataset.rmh), 1); save(); refresh(); return; }
  if (t.hasAttribute("data-export")) { download(`ballast-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json"); return; }
  if (t.hasAttribute("data-resetlists")) {
    if (!confirmBox("Reset the emotion, urge, soothe and distraction lists to the defaults? Your diary entries are kept.")) return;
    Object.assign(s, structuredClone(DEFAULT_SETTINGS), { plan: s.plan, contacts: s.contacts, hotlines: s.hotlines, emergency: s.emergency, emotions: [...DEFAULT_EMOTIONS], urges: [...DEFAULT_URGES] });
    save(); refresh(); return;
  }
  if (t.hasAttribute("data-wipe")) {
    if (!confirmBox("Erase ALL Ballast data on this PC? Export a backup first if you might want it back.")) return;
    if (!confirmBox("Last chance. Erase everything?")) return;
    resetState(); toast("Erased"); refresh();
  }
}
