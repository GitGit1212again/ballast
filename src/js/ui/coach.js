import { state, save, uid, dayKey, fmtDate } from "../state.js";
import { EMOTION_GUIDE, DEAR_MAN, GIVE_FAST } from "../data/skills.js";
import { esc, toast, copyText, scaleHtml, confirmBox } from "./dom.js";
import { refresh } from "../router.js";

let mode = "emotion"; // or "script"
let ck = { emotion: "", intensity: null, event: "", fits: null, plan: "" };
let sc = { to: "", describe: "", express: "", assert: "", reinforce: "", mindful: "", appear: "", negotiate: "" };

export function render(root) {
  root.innerHTML = `
  <div class="row mb">
    <button class="chip purple ${mode === "emotion" ? "on" : ""}" data-mode="emotion">Emotion check-in</button>
    <button class="chip purple ${mode === "script" ? "on" : ""}" data-mode="script">Script a hard conversation</button>
  </div>
  ${mode === "emotion" ? emotionHtml() : scriptHtml()}`;
  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
}

function emotionHtml() {
  const g = EMOTION_GUIDE[ck.emotion];
  return `
  <p class="help">Name it, rate it, check whether it fits the facts. If it does not fit, or acting on it will not help, do the opposite of what it is pushing you to do. If it does fit, act on the facts, not the feeling.</p>
  <div class="grid two">
    <section class="card accent-purple">
      <h3>1. What is it?</h3>
      <div class="chips mb">${Object.keys(EMOTION_GUIDE).map((e) => `<button class="chip purple ${ck.emotion === e ? "on" : ""}" data-emo="${e}">${e}</button>`).join("")}</div>
      <div class="rowitem"><span>How strong (0 to 10)</span>${scaleHtml("emotion", "intensity", ck.intensity, 10)}</div>
      <label class="field mt"><span>What happened (facts only)</span><textarea data-ck="event" rows="3">${esc(ck.event)}</textarea></label>
    </section>
    <section class="card accent-teal">
      <h3>2. Does it fit the facts?</h3>
      ${g ? `<p class="big">${g.fits}</p>
      <div class="row mb">
        <button class="chip ${ck.fits === true ? "on" : ""}" data-fits="1">Yes, it fits</button>
        <button class="chip pink ${ck.fits === false ? "on" : ""}" data-fits="0">No, or acting on it will not help</button>
      </div>
      ${ck.fits === false ? `<h3>Opposite action for ${ck.emotion.toLowerCase()}</h3>${g.opposite.map((o) => `<div class="oa">${o}</div>`).join("")}` : ""}
      ${ck.fits === true ? `<h3>Act on the facts</h3><div class="oa fit">${g.justified}</div>` : ""}
      ${ck.fits !== null ? `<label class="field mt"><span>What I will actually do in the next hour</span><textarea data-ck="plan" rows="2">${esc(ck.plan)}</textarea></label>
      <button class="btn primary" data-savecheck>Save check-in</button>` : ""}` : '<div class="empty">Pick an emotion first.</div>'}
    </section>
  </div>
  <section class="mt"><h3>Past check-ins</h3>
    <div class="list">${state.coach.length ? [...state.coach].reverse().slice(0, 30).map((c) => `<div class="item" data-cid="${c.id}"><div class="head"><span><span class="pill purple">${esc(c.emotion)} ${c.intensity ?? ""}</span> <span class="pill ${c.fits ? "teal" : "pink"}">${c.fits ? "fit the facts" : "opposite action"}</span></span><span class="when">${fmtDate(c.date)}</span></div>
      ${c.event ? `<div class="small muted">${esc(c.event)}</div>` : ""}${c.plan ? `<div><b>Did:</b> ${esc(c.plan)}</div>` : ""}<div class="right"><button class="btn sm ghost" data-rmc>remove</button></div></div>`).join("") : '<div class="empty">None yet.</div>'}</div>
  </section>`;
}

function scriptHtml() {
  return `
  <p class="help">DEAR MAN is the DBT script for asking for something or saying no. Fill the parts, read the result out loud twice, then use it. The GIVE and FAST reminders are about how to say it and how to keep your self-respect while you do.</p>
  <div class="grid two">
    <section class="card accent-pink">
      <label class="field"><span>Who this is for</span><input type="text" data-sc="to" value="${esc(sc.to)}"></label>
      ${DEAR_MAN.map((d) => `<label class="field"><span><b>${d.label}</b> · ${d.hint}</span><textarea data-sc="${d.key}" rows="2">${esc(sc[d.key])}</textarea></label>`).join("")}
    </section>
    <section>
      <div class="card accent-teal mb"><h3>Your script</h3><div class="script-out" id="script-out">${esc(buildScript())}</div>
        <div class="row mt"><button class="btn teal" data-copyscript>Copy</button><button class="btn primary" data-savescript>Save</button></div></div>
      <div class="card"><h3>GIVE (keep the relationship)</h3><ul class="small">${GIVE_FAST.GIVE.map((x) => `<li>${x}</li>`).join("")}</ul>
        <h3 class="mt">FAST (keep your self-respect)</h3><ul class="small">${GIVE_FAST.FAST.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      ${state.scripts.length ? `<h3 class="mt">Saved scripts</h3><div class="list">${[...state.scripts].reverse().map((s) => `<details class="item" data-sid="${s.id}"><summary>${fmtDate(s.date)} · ${esc(s.to || "(no name)")}</summary><pre class="quote">${esc(s.text)}</pre><div class="row"><button class="btn sm" data-loadscript>Load</button><button class="btn sm danger" data-rms>Delete</button></div></details>`).join("")}</div>` : ""}
    </section>
  </div>`;
}

function buildScript() {
  const parts = [];
  if (sc.describe) parts.push(sc.describe);
  if (sc.express) parts.push(sc.express);
  if (sc.assert) parts.push(sc.assert);
  if (sc.reinforce) parts.push(sc.reinforce);
  if (sc.negotiate) parts.push("If that does not work for you: " + sc.negotiate);
  if (sc.mindful) parts.push("\n(If it goes sideways, repeat: \"" + sc.mindful + "\")");
  if (sc.appear) parts.push("(Remember: " + sc.appear + ")");
  return parts.join("\n\n");
}

function onInput(e) {
  if (e.target.matches("[data-ck]")) ck[e.target.dataset.ck] = e.target.value;
  if (e.target.matches("[data-sc]")) { sc[e.target.dataset.sc] = e.target.value; document.getElementById("script-out").textContent = buildScript(); }
}

function onClick(e) {
  const m = e.target.closest("[data-mode]");
  if (m) { mode = m.dataset.mode; refresh(); return; }
  const emo = e.target.closest("[data-emo]");
  if (emo) { ck.emotion = emo.dataset.emo; ck.fits = null; refresh(); return; }
  const sb = e.target.closest(".scale button");
  if (sb) { ck.intensity = Number(sb.dataset.v); refresh(); return; }
  const f = e.target.closest("[data-fits]");
  if (f) { ck.fits = f.dataset.fits === "1"; refresh(); return; }
  if (e.target.closest("[data-savecheck]")) {
    state.coach.push({ id: uid(), date: dayKey(), ...ck });
    ck = { emotion: "", intensity: null, event: "", fits: null, plan: "" };
    save(); toast("Saved"); refresh(); return;
  }
  const c = e.target.closest("[data-cid]");
  if (c && e.target.closest("[data-rmc]")) { state.coach = state.coach.filter((x) => x.id !== c.dataset.cid); save(); refresh(); return; }
  if (e.target.closest("[data-copyscript]")) { copyText(buildScript()); return; }
  if (e.target.closest("[data-savescript]")) {
    const text = buildScript(); if (!text.trim()) { toast("Fill in at least one part"); return; }
    state.scripts.push({ id: uid(), date: dayKey(), to: sc.to, fields: { ...sc }, text });
    save(); toast("Saved"); refresh(); return;
  }
  const s = e.target.closest("[data-sid]");
  if (!s) return;
  const rec = state.scripts.find((x) => x.id === s.dataset.sid);
  if (e.target.closest("[data-loadscript]")) { sc = { ...sc, ...rec.fields }; refresh(); }
  if (e.target.closest("[data-rms]") && confirmBox("Delete this script?")) { state.scripts = state.scripts.filter((x) => x.id !== rec.id); save(); refresh(); }
}
