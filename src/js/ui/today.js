import { state, save, dayKey, shiftDay, fmtDate, getDay, dayHasContent, sleepHours, sleepSummary } from "../state.js";
import { SKILL_GROUPS } from "../data/skills.js";
import { esc, scaleHtml, toast } from "./dom.js";

let current = dayKey();
// folded sections stay the way you left them for the session
let openSkills = false, openHistory = false;

export function render(root) {
  const key = current;
  const d = getDay(key);
  const s = state.settings;
  const isToday = key === dayKey();

  root.innerHTML = `
  <div class="today">
  <div class="today-head">
    <h2>${isToday ? "Today" : fmtDate(key)}<span class="muted small"> &nbsp;${isToday ? fmtDate(key) : ""}</span></h2>
    <div class="daynav">
      <button class="btn sm" data-nav="-1">&larr;</button>
      <button class="btn sm" data-nav="0" ${isToday ? "disabled" : ""}>Today</button>
      <button class="btn sm" data-nav="1" ${isToday ? "disabled" : ""}>&rarr;</button>
    </div>
  </div>
  <p class="help small">One card a day: peak of each feeling (0 none, 5 worst ever), urges and whether you acted, sleep, skills. Quick beats perfect.</p>

  <div class="grid two">
    <section class="card accent-purple">
      <h3>Emotions (peak today)</h3>
      ${s.emotions.map((e) => `
        <div class="rowitem"><span>${esc(e)}</span>${scaleHtml("emotion", "emo:" + e, d.emotions[e] ?? null)}</div>`).join("")}
    </section>

    <section class="card accent-pink">
      <h3>Urges</h3>
      ${s.urges.map((u) => `
        <div class="rowitem"><span>${esc(u)}</span>
          <div class="ctl">
            ${scaleHtml("urge", "urge:" + u, d.urges[u]?.level ?? null)}
            <label class="toggle" title="acted on it"><input type="checkbox" data-acted="${esc(u)}" ${d.urges[u]?.acted ? "checked" : ""}> acted</label>
          </div>
        </div>`).join("")}
    </section>

    <section class="card accent-teal">
      <h3>Body & vulnerability</h3>
      ${sleepHtml(d)}
      ${[["ate", "Ate regular meals"], ["substances", "Alcohol / drugs"], ["pain", "Physical pain or illness"], ["conflict", "Conflict with someone"]].map(([k, l]) => `
        <div class="rowitem"><span>${l}</span>
          <div class="ctl chips">
            <button class="chip ${d.vuln[k] === true ? "on" : ""}" data-vk="${k}" data-vv="1">yes</button>
            <button class="chip ${d.vuln[k] === false ? "on" : ""}" data-vk="${k}" data-vv="0">no</button>
          </div>
        </div>`).join("")}
    </section>

    <section class="card">
      <details ${d.skills.length ? "" : ""} ${openSkills ? "open" : ""} data-fold="skills">
        <summary><h3>Skills used ${d.skills.length ? `<span class="pill purple">${d.skills.length}</span>` : ""}</h3>
          ${d.skills.length && !openSkills ? `<span class="muted small">${esc(d.skills.join(", "))}</span>` : ""}</summary>
        <div class="skillgroups">
          ${SKILL_GROUPS.map((g) => `
            <div class="skillgroup"><h4>${g.name}</h4>
              <div class="chips">${g.skills.map((sk) => `<button class="chip purple ${d.skills.includes(sk) ? "on" : ""}" data-skill="${esc(sk)}">${esc(sk)}</button>`).join("")}</div>
            </div>`).join("")}
        </div>
      </details>
      <div class="notewrap">
        <h3>Note</h3>
        <textarea data-note rows="2" placeholder="Anything that mattered today. One line is fine.">${esc(d.note)}</textarea>
      </div>
    </section>
  </div>

  <section class="card mt history">
    <details ${openHistory ? "open" : ""} data-fold="history">
      <summary><h3>Last 14 days</h3></summary>
      ${historyHtml()}
    </details>
  </section>
  </div>`;

  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  root.addEventListener("input", onInput);
  root.addEventListener("toggle", onToggle, true);
}

function onToggle(e) {
  const f = e.target.dataset?.fold;
  if (f === "skills") openSkills = e.target.open;
  if (f === "history") openHistory = e.target.open;
}

function onClick(e) {
  const nav = e.target.closest("[data-nav]");
  if (nav) {
    const n = Number(nav.dataset.nav);
    current = n === 0 ? dayKey() : shiftDay(current, n);
    if (current > dayKey()) current = dayKey();
    rerender(); return;
  }
  const d = getDay(current);
  const sb = e.target.closest(".scale button");
  if (sb) {
    const name = sb.closest(".scale").dataset.scale;
    const v = Number(sb.dataset.v);
    const [kind, ...rest] = name.split(":"); const label = rest.join(":");
    if (kind === "emo") { if (d.emotions[label] === v) delete d.emotions[label]; else d.emotions[label] = v; }
    if (kind === "urge") {
      d.urges[label] ||= { level: 0, acted: false };
      if (d.urges[label].level === v && !d.urges[label].acted) delete d.urges[label]; else d.urges[label].level = v;
    }
    save(); rerender(); return;
  }
  const vk = e.target.closest("[data-vk]");
  if (vk) { const val = vk.dataset.vv === "1"; d.vuln[vk.dataset.vk] = d.vuln[vk.dataset.vk] === val ? null : val; save(); rerender(); return; }
  const sk = e.target.closest("[data-skill]");
  if (sk) {
    const name = sk.dataset.skill;
    const i = d.skills.indexOf(name);
    if (i >= 0) d.skills.splice(i, 1); else d.skills.push(name);
    openSkills = true;
    save(); rerender(); return;
  }
  const hist = e.target.closest("[data-day]");
  if (hist) { current = hist.dataset.day; rerender(); return; }
  if (e.target.closest("[data-sleep-add]")) { d.sleep.push({ start: "", end: "", hours: "" }); save(); rerender(); return; }
  const rm = e.target.closest("[data-sleep-rm]");
  if (rm) { d.sleep.splice(Number(rm.dataset.sleepRm), 1); sleepSummary(d); save(); rerender(); return; }
}

/* Sleep as a list of stretches, because one number hides broken sleep. Each stretch is a
   clock start/end (crossing midnight is fine) or, when the times are a blur, just hours. */
function sleepHtml(d) {
  const sum = sleepSummary(d);
  const rows = d.sleep.map((ep, i) => {
    const h = sleepHours(ep);
    return `
      <div class="sleeprow">
        <input type="time" data-sleep="${i}" data-sf="start" value="${esc(ep.start || "")}" title="fell asleep">
        <span class="muted">to</span>
        <input type="time" data-sleep="${i}" data-sf="end" value="${esc(ep.end || "")}" title="woke">
        <span class="muted small">or</span>
        <input type="number" min="0" max="24" step="0.25" style="width:70px" data-sleep="${i}" data-sf="hours" value="${esc(ep.start && ep.end ? "" : (ep.hours ?? ""))}" placeholder="hrs" title="hours, if you don't know the times">
        <span class="sleephrs">${h ? h + " h" : ""}</span>
        <button class="btn sm ghost" data-sleep-rm="${i}" title="remove this stretch">&times;</button>
      </div>`;
  }).join("");
  const line = sum.count
    ? `${sum.total} h total in ${sum.count} stretch${sum.count === 1 ? "" : "es"}${sum.count > 1 ? ` · longest ${sum.longest} h` : ""}`
    : "nothing logged";
  return `
      <div class="rowitem sleepblock">
        <div class="sleephead"><span>Sleep (each stretch, in the 24 h ending this day)</span><span class="muted small">${line}</span></div>
        ${rows}
        <button class="btn sm" data-sleep-add>+ add a stretch</button>
      </div>`;
}

function onChange(e) {
  const d = getDay(current);
  if (e.target.matches("[data-acted]")) {
    const u = e.target.dataset.acted;
    d.urges[u] ||= { level: 0, acted: false };
    d.urges[u].acted = e.target.checked;
    save();
  }
  if (e.target.matches("[data-vuln]")) { d.vuln[e.target.dataset.vuln] = e.target.value; save(); }
  if (e.target.matches("[data-sleep]")) {
    const ep = d.sleep[Number(e.target.dataset.sleep)];
    if (ep) { ep[e.target.dataset.sf] = e.target.value; sleepSummary(d); save(); rerender(); }
  }
}
function onInput(e) {
  if (e.target.matches("[data-note]")) { getDay(current).note = e.target.value; save(); }
}

function rerender() {
  const root = document.getElementById("view");
  root.removeEventListener("click", onClick);
  root.removeEventListener("change", onChange);
  root.removeEventListener("input", onInput);
  root.removeEventListener("toggle", onToggle, true);
  render(root);
}

function historyHtml() {
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(shiftDay(dayKey(), -i));
  const s = state.settings;
  const rows = [];
  const cell = (v, cls, extra = "") => {
    const alpha = v == null ? 0 : 0.15 + (v / 5) * 0.85;
    const col = cls === "urge" ? `rgba(214,60,143,${alpha})` : `rgba(155,92,255,${alpha})`;
    return `<span class="heat" style="background:${v == null ? "rgba(255,255,255,.04)" : col};${extra}">${v ?? ""}</span>`;
  };
  rows.push(`<div class="heatrow"><span class="lbl"></span>${days.map((k) => `<span class="heat muted" style="cursor:pointer" data-day="${k}" title="${fmtDate(k)}">${k.slice(-2)}</span>`).join("")}</div>`);
  for (const e of s.emotions) {
    rows.push(`<div class="heatrow"><span class="lbl">${esc(e)}</span>${days.map((k) => cell(state.diary[k]?.emotions?.[e] ?? null, "emo")).join("")}</div>`);
  }
  for (const u of s.urges) {
    rows.push(`<div class="heatrow"><span class="lbl" title="${esc(u)}">${esc(u.length > 16 ? u.slice(0, 15) + "…" : u)}</span>${days.map((k) => {
      const r = state.diary[k]?.urges?.[u];
      return cell(r ? r.level : null, "urge", r?.acted ? "outline:2px solid var(--pink)" : "");
    }).join("")}</div>`);
  }
  const filled = days.filter((k) => dayHasContent(state.diary[k])).length;
  rows.push(`<p class="small muted mt">${filled} of 14 days filled in. Purple = emotion strength, pink = urge strength, pink outline = acted on it. Click a day number to open it.</p>`);
  return rows.join("");
}

export function noteToast() { toast("Saved"); }
