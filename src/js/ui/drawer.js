import { state, save, uid, fmtWhen } from "../state.js";
import { HOLD_OPTIONS, FACT_PROMPTS } from "../data/skills.js";
import { esc, toast, copyText, fmtCountdown, confirmBox } from "./dom.js";

let tick = null;
let holdMs = HOLD_OPTIONS[0].ms;

export function render(root) {
  root.innerHTML = `
  <p class="help">Write the message here instead of in the phone. It locks for the time you pick. When it unlocks you see it again next to a few questions, and only then decide: send it as is, edit it, or let it go. Nothing here ever sends anything.</p>
  <div class="grid two">
    <section class="card accent-pink drawer-compose">
      <h3>Put a message in the drawer</h3>
      <label class="field"><span>To (a name or label, optional)</span><input type="text" id="dr-to" placeholder="who it is for"></label>
      <label class="field"><span>The message, exactly as you want to send it right now</span><textarea id="dr-text" placeholder="Say everything. It is going in a drawer, not to them."></textarea></label>
      <div class="field"><span class="small muted">Hold for</span>
        <div class="holdopts">${HOLD_OPTIONS.map((o) => `<button class="chip pink ${o.ms === holdMs ? "on" : ""}" data-hold="${o.ms}">${o.label}</button>`).join("")}</div>
      </div>
      <button class="btn pink" id="dr-lock">Lock it in the drawer</button>
    </section>
    <section class="card accent-teal">
      <h3>What the drawer has done</h3>
      ${statsHtml()}
      <p class="small muted mt">"Let go" and "edited" are the wins. Every one of those is a message the calm version of you would not have sent as written.</p>
    </section>
  </div>
  <section class="mt">
    <h3>In the drawer</h3>
    <div class="list" id="dr-list">${listHtml()}</div>
  </section>`;

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  clearInterval(tick);
  tick = setInterval(() => {
    const anyHeld = state.drawer.some((m) => m.status === "held");
    if (!anyHeld) return;
    const list = document.getElementById("dr-list");
    if (!list) { clearInterval(tick); return; }
    const now = Date.now();
    let changed = false;
    for (const m of state.drawer) if (m.status === "held" && m.unlockAt <= now) { m.status = "ready"; changed = true; }
    if (changed) { save(); list.innerHTML = listHtml(); toast("A message is ready to look at"); return; }
    list.querySelectorAll("[data-cd]").forEach((el) => { el.textContent = fmtCountdown(Number(el.dataset.cd) - now); });
  }, 1000);
}

export function unmount() { clearInterval(tick); }

function statsHtml() {
  const c = { held: 0, ready: 0, sent: 0, edited: 0, deleted: 0 };
  for (const m of state.drawer) c[m.status] = (c[m.status] || 0) + 1;
  const resolved = c.sent + c.edited + c.deleted;
  return `<div class="drawer-stats">
    <div class="stat"><div class="n">${c.held + c.ready}</div><div class="l">waiting</div></div>
    <div class="stat"><div class="n">${c.deleted}</div><div class="l">let go</div></div>
    <div class="stat"><div class="n">${c.edited}</div><div class="l">edited first</div></div>
    <div class="stat"><div class="n">${c.sent}</div><div class="l">sent as written</div></div>
  </div>
  ${resolved ? `<div class="bar mt"><i style="width:${Math.round(((c.deleted + c.edited) / resolved) * 100)}%"></i></div><div class="small muted">${Math.round(((c.deleted + c.edited) / resolved) * 100)}% of unlocked messages were changed or dropped</div>` : ""}`;
}

function listHtml() {
  const items = [...state.drawer].sort((a, b) => b.createdAt - a.createdAt);
  if (!items.length) return `<div class="empty">Empty. That is fine.</div>`;
  const now = Date.now();
  return items.map((m) => {
    if (m.status === "held") {
      return `<div class="item drawer-held" data-id="${m.id}">
        <div class="head"><span><span class="pill pink">locked</span> ${m.to ? "to " + esc(m.to) : ""}</span>
          <span class="countdown" data-cd="${m.unlockAt}">${fmtCountdown(m.unlockAt - now)}</span></div>
        <pre class="quote msg">${esc(m.text)}</pre>
        <div class="row between"><span class="when">put in ${fmtWhen(m.createdAt)} · opens ${fmtWhen(m.unlockAt)}</span>
          <button class="btn sm ghost" data-act="drop">let it go now</button></div>
      </div>`;
    }
    if (m.status === "ready") {
      return `<div class="item drawer-ready" data-id="${m.id}">
        <div class="head"><span><span class="pill teal">unlocked</span> ${m.to ? "to " + esc(m.to) : ""}</span><span class="when">written ${fmtWhen(m.createdAt)}</span></div>
        <pre class="quote">${esc(m.text)}</pre>
        <div class="facts">
          ${FACT_PROMPTS.map((p) => `<label class="field"><span>${p.q}</span><textarea data-fact="${p.key}" rows="2">${esc(m.facts?.[p.key] || "")}</textarea></label>`).join("")}
        </div>
        <label class="field"><span>Rewrite (optional). If you change it here and copy, it counts as "edited".</span><textarea data-rewrite rows="3">${esc(m.rewrite || "")}</textarea></label>
        <div class="row">
          <button class="btn teal" data-act="copy-edit">Copy the rewrite</button>
          <button class="btn" data-act="copy-orig">Copy the original</button>
          <button class="btn primary" data-act="drop">Let it go</button>
        </div>
      </div>`;
    }
    const pill = { sent: "pill", edited: "pill teal", deleted: "pill purple" }[m.status];
    const label = { sent: "sent as written", edited: "edited, then copied", deleted: "let go" }[m.status];
    return `<details class="item" data-id="${m.id}"><summary><span class="${pill}">${label}</span> ${m.to ? "to " + esc(m.to) : ""} <span class="when">· ${fmtWhen(m.resolvedAt || m.createdAt)}</span></summary>
      <pre class="quote">${esc(m.text)}</pre>${m.rewrite ? `<div class="small muted">Rewrite:</div><pre class="quote" style="border-color:var(--teal)">${esc(m.rewrite)}</pre>` : ""}
      <button class="btn sm danger" data-act="forget">remove from history</button></details>`;
  }).join("");
}

function onClick(e) {
  const hold = e.target.closest("[data-hold]");
  if (hold) { holdMs = Number(hold.dataset.hold); document.querySelectorAll("[data-hold]").forEach((b) => b.classList.toggle("on", Number(b.dataset.hold) === holdMs)); return; }
  if (e.target.id === "dr-lock") {
    const text = document.getElementById("dr-text").value.trim();
    if (!text) { toast("Write the message first"); return; }
    const now = Date.now();
    state.drawer.push({ id: uid(), to: document.getElementById("dr-to").value.trim(), text, createdAt: now, unlockAt: now + holdMs, status: "held", facts: {}, rewrite: "" });
    save();
    document.getElementById("dr-text").value = ""; document.getElementById("dr-to").value = "";
    document.getElementById("dr-list").innerHTML = listHtml();
    toast("Locked. It will still be here.");
    return;
  }
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const item = btn.closest("[data-id]");
  const m = state.drawer.find((x) => x.id === item.dataset.id);
  if (!m) return;
  const act = btn.dataset.act;
  if (act === "drop") {
    if (m.status === "held" && !confirmBox("Let this one go without reading it again?")) return;
    captureFacts(item, m); m.status = "deleted"; m.resolvedAt = Date.now();
  } else if (act === "copy-orig") {
    captureFacts(item, m); copyText(m.text); m.status = "sent"; m.resolvedAt = Date.now();
  } else if (act === "copy-edit") {
    captureFacts(item, m);
    if (!m.rewrite.trim()) { toast("Write the rewrite first, or copy the original"); return; }
    copyText(m.rewrite); m.status = "edited"; m.resolvedAt = Date.now();
  } else if (act === "forget") {
    if (!confirmBox("Remove this from the drawer history?")) return;
    state.drawer = state.drawer.filter((x) => x.id !== m.id);
  }
  save();
  const root = document.getElementById("view");
  root.removeEventListener("click", onClick);
  root.removeEventListener("input", onInput);
  render(root);
}

function onInput(e) {
  const item = e.target.closest("[data-id]");
  if (!item || !(e.target.matches("[data-fact]") || e.target.matches("[data-rewrite]"))) return;
  const m = state.drawer.find((x) => x.id === item.dataset.id);
  if (m) { captureFacts(item, m); save(); }
}

function captureFacts(item, m) {
  m.facts = {};
  item.querySelectorAll("[data-fact]").forEach((t) => { m.facts[t.dataset.fact] = t.value; });
  const rw = item.querySelector("[data-rewrite]");
  if (rw) m.rewrite = rw.value;
}
