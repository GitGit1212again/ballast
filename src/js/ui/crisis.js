// Crisis overlay: five guided steps for right now. Opened from "I need help now".
import { state, save, uid } from "../state.js";
import { esc } from "./dom.js";

const STEPS = ["Rate", "Stop", "Body", "Your list", "Plan"];
const TIPP = [
  { key: "temp", title: "Temperature", text: "Cold water on the face and hold your breath for 30 seconds, or hold ice in your hands. This trips the dive reflex and slows the heart.", secs: 30 },
  { key: "exercise", title: "Intense exercise", text: "60 seconds of anything that gets the heart up: jumping jacks, stairs, a fast walk. Burn the adrenaline instead of holding it.", secs: 60 },
  { key: "breath", title: "Paced breathing", text: "Use the breathing on the Stop step for 2 minutes. Out-breath longer than the in-breath.", secs: 0 },
  { key: "pmr", title: "Paired muscle relaxation", text: "Tense a muscle group on the in-breath, release on the out-breath. Work down the body: face, shoulders, hands, stomach, legs, feet.", secs: 60 },
];

let session = null;
let step = 0;
let timers = [];   // every setTimeout/setInterval id we own
let root = null;

export function open() {
  root = document.getElementById("crisis");
  session = { id: uid(), at: Date.now(), before: null, after: null, tried: [] };
  step = 0;
  root.classList.remove("hidden");
  root.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  render();
}

export function close() {
  if (!root) return;
  stopTimers();
  if (session && (session.before !== null || session.after !== null || session.tried.length)) {
    if (!state.crises.some((c) => c.id === session.id)) { state.crises.push(session); save(); }
  }
  session = null;
  root.removeEventListener("click", onClick);
  document.removeEventListener("keydown", onKey);
  root.classList.add("hidden");
  root.innerHTML = "";
  document.getElementById("crisis-btn")?.focus();
}

function onKey(e) { if (e.key === "Escape") close(); }

function stopTimers() {
  for (const t of timers) { clearTimeout(t); clearInterval(t); }
  timers = [];
}

// ---- rendering ----
function render() {
  stopTimers();
  const body = [rateStep, stopStep, bodyStep, listStep, planStep][step]();
  root.innerHTML = `<div class="inner">
    <button class="btn sm ghost close" data-act="close" aria-label="Close">Close</button>
    <div class="steps" role="tablist">${STEPS.map((s, i) => `<button role="tab" aria-selected="${i === step}" class="${i === step ? "active" : ""}" data-step="${i}">${i + 1}. ${s}</button>`).join("")}</div>
    ${body}
    <div class="row mt">${step < STEPS.length - 1 ? `<button class="btn primary" data-act="next">Next</button>` : ""}</div>
  </div>`;
  root.querySelector(".inner > h1, .inner > .steps button.active")?.focus();
}

function rateRow(which) {
  const v = session[which];
  return `<div class="rate" data-rate="${which}">${Array.from({ length: 11 }, (_, i) => `<button type="button" data-v="${i}" class="${v === i ? "on" : ""}" aria-pressed="${v === i}">${i}</button>`).join("")}</div>`;
}

function rateStep() {
  return `<h1>How bad is it right now, 0 to 10?</h1>
  <p class="lead">${rateRow("before")}</p>
  <p class="muted">No wrong answer. This just lets you see later whether the next few minutes helped.</p>`;
}

function stopStep() {
  return `<h1>STOP</h1>
  <div class="acro">
    <div><b>S</b><div class="big"><strong>Stop.</strong> Freeze. Do not move a muscle. Do not send. Do not speak.</div></div>
    <div><b>T</b><div class="big"><strong>Take a step back.</strong> Leave the room, or put the phone in another room.</div></div>
    <div><b>O</b><div class="big"><strong>Observe.</strong> What is happening inside and outside. Just notice.</div></div>
    <div><b>P</b><div class="big"><strong>Proceed mindfully.</strong> What do you want the next hour to look like?</div></div>
  </div>
  <div class="card mt">
    <div class="breath" id="breath"><div class="ring"></div><div class="word">Ready</div><div class="t">90 s</div></div>
    <div class="row"><button class="btn teal" data-act="breath">Start breathing</button><span class="muted small">In for 4, out for 6, for 90 seconds.</span></div>
  </div>`;
}

function bodyStep() {
  return `<h1>Change the body first</h1>
  <p class="muted">TIPP. Pick one. Each one lowers arousal fast without deciding anything.</p>
  <div class="tipp">${TIPP.map((c) => `<div class="card">
      <b>${c.title}</b>
      <p class="big">${c.text}</p>
      ${c.secs ? `<button class="btn sm timerbtn" data-timer="${c.key}" data-secs="${c.secs}">${c.secs} s timer<span class="countdown"></span></button>` : `<button class="btn sm ghost" data-step="1">Go to Stop step</button>`}
    </div>`).join("")}</div>`;
}

function listStep() {
  const { soothe = [], distract = [] } = state.settings;
  if (!soothe.length && !distract.length) {
    return `<h1>Your list</h1><p class="lead">Nothing here yet. Settings lets you fill in soothe and distract lists while you are calm.</p>`;
  }
  const list = (title, items, kind) => items.length ? `<h3>${title}</h3><ul class="plainlist">${items.map((t, i) => {
    const done = session.tried.includes(t);
    return `<li class="${done ? "done" : ""}"><input type="checkbox" id="tr-${kind}-${i}" data-tried="${esc(t)}" ${done ? "checked" : ""}><label for="tr-${kind}-${i}">${esc(t)}</label></li>`;
  }).join("")}</ul>` : "";
  return `<h1>Your list</h1>
  ${list("Soothe", soothe, "s")}
  ${list("Distract", distract, "d")}
  <p class="lead mt">Pick one. Do it for 15 minutes before deciding anything.</p>`;
}

function planStep() {
  const s = state.settings;
  const person = (p) => `<div class="item"><b>${esc(p.name)}</b><div class="num">${esc(p.number)}</div>${p.note ? `<div class="muted small">${esc(p.note)}</div>` : ""}</div>`;
  return `<h1>Your plan</h1>
  ${s.plan ? `<pre class="quote">${esc(s.plan)}</pre>` : `<p class="muted">No plan written yet. Settings lets you write one while calm.</p>`}
  ${(s.contacts || []).length ? `<h3 class="mt">People</h3><div class="list contacts">${s.contacts.map(person).join("")}</div>` : ""}
  ${(s.hotlines || []).length ? `<h3 class="mt">Lines</h3><div class="list contacts">${s.hotlines.map(person).join("")}</div>` : ""}
  ${s.emergency ? `<p class="mt"><span class="pill danger">${esc(s.emergency)}</span></p>` : ""}
  <h3 class="mt">How bad is it now, 0 to 10?</h3>
  ${rateRow("after")}
  ${session.before !== null && session.after !== null ? `<p class="muted small">Before: ${session.before}. Now: ${session.after}.</p>` : ""}
  <div class="row mt"><button class="btn teal" data-act="done">Done</button></div>`;
}

// ---- events ----
function onClick(e) {
  const t = e.target;
  const act = t.closest("[data-act]")?.dataset.act;
  if (act === "close" || act === "done") { close(); return; }
  if (act === "next") { step = Math.min(step + 1, STEPS.length - 1); render(); return; }
  if (act === "breath") { toggleBreath(t.closest("[data-act]")); return; }
  const tab = t.closest("[data-step]");
  if (tab) { step = Number(tab.dataset.step); render(); return; }
  const rateBtn = t.closest(".rate button");
  if (rateBtn) {
    const which = rateBtn.closest("[data-rate]").dataset.rate;
    session[which] = Number(rateBtn.dataset.v);
    rateBtn.parentElement.querySelectorAll("button").forEach((b) => { const on = b === rateBtn; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    return;
  }
  if (t.matches("[data-tried]")) {
    const text = t.dataset.tried;
    if (t.checked && !session.tried.includes(text)) session.tried.push(text);
    if (!t.checked) session.tried = session.tried.filter((x) => x !== text);
    t.closest("li").classList.toggle("done", t.checked);
    return;
  }
  const timerBtn = t.closest("[data-timer]");
  if (timerBtn) startTimer(timerBtn);
}

// ---- breathing (4 s in, 6 s out, 90 s total) ----
function toggleBreath(btn) {
  const box = document.getElementById("breath");
  if (btn.dataset.running) { stopTimers(); btn.textContent = "Start breathing"; delete btn.dataset.running; box.className = "breath"; box.querySelector(".word").textContent = "Ready"; return; }
  btn.dataset.running = "1"; btn.textContent = "Stop";
  const word = box.querySelector(".word"), tEl = box.querySelector(".t");
  const end = Date.now() + 90e3;
  let phaseIn = false;
  const phase = () => {
    if (Date.now() >= end) { stopTimers(); box.className = "breath"; word.textContent = "Done"; tEl.textContent = "90 s"; btn.textContent = "Start breathing"; delete btn.dataset.running; return; }
    phaseIn = !phaseIn;
    box.className = "breath " + (phaseIn ? "in" : "out");
    word.textContent = phaseIn ? "Breathe in" : "Breathe out";
    timers.push(setTimeout(phase, phaseIn ? 4000 : 6000));
  };
  phase();
  timers.push(setInterval(() => { tEl.textContent = Math.max(0, Math.ceil((end - Date.now()) / 1000)) + " s"; }, 250));
}

// ---- TIPP timers (one at a time) ----
function startTimer(btn) {
  stopTimers();
  root.querySelectorAll("[data-timer] .countdown").forEach((c) => { c.textContent = ""; });
  const cd = btn.querySelector(".countdown");
  const end = Date.now() + Number(btn.dataset.secs) * 1000;
  const tick = () => {
    const left = Math.ceil((end - Date.now()) / 1000);
    if (left <= 0) { cd.textContent = "done"; stopTimers(); return; }
    cd.textContent = left + " s";
  };
  tick();
  timers.push(setInterval(tick, 250));
}
