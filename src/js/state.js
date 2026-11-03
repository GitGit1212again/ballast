import "./compat.js";
import { DEFAULT_EMOTIONS, DEFAULT_URGES, DEFAULT_SETTINGS } from "./data/skills.js";
import * as storage from "./storage.js";

export const state = blank();

function blank() {
  return {
    version: 1,
    diary: {},        // "YYYY-MM-DD" -> day record
    drawer: [],       // held messages
    chains: [],       // chain analyses
    people: [],       // ledger cards
    coach: [],        // emotion check-ins
    scripts: [],      // DEAR MAN scripts
    crises: [],       // crisis-mode uses
    suspicions: [],   // suspicion checks
    settings: {
      ...structuredClone(DEFAULT_SETTINGS),
      emotions: [...DEFAULT_EMOTIONS],
      urges: [...DEFAULT_URGES],
    },
  };
}

export async function init() {
  const loaded = await storage.load();
  if (loaded && typeof loaded === "object") {
    const fresh = blank();
    Object.assign(state, fresh, loaded);
    state.settings = { ...fresh.settings, ...(loaded.settings || {}) };
    // Data saved before "Suspicious" joined the default list: add it once.
    const em = state.settings.emotions;
    if (!state.settings.suspiciousAdded && !em.includes("Suspicious")) {
      const i = em.indexOf("Joy");
      em.splice(i >= 0 ? i : em.length, 0, "Suspicious");
    }
    state.settings.suspiciousAdded = true;
  }
  return state;
}

export function save() { storage.save(state); }

export function replaceState(obj) {
  const fresh = blank();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh, obj);
  state.settings = { ...fresh.settings, ...(obj.settings || {}) };
  save();
}

export function resetState() { replaceState({}); }

// ---- helpers ----
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function shiftDay(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}
export function fmtDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
export function fmtWhen(ts) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function getDay(key) {
  if (!state.diary[key]) {
    state.diary[key] = { emotions: {}, urges: {}, vuln: { sleep: "", ate: null, substances: null, pain: null, conflict: null }, skills: [], note: "" };
  }
  const d = state.diary[key];
  d.emotions ||= {}; d.urges ||= {}; d.vuln ||= {}; d.skills ||= []; d.note ||= "";
  d.sleep ||= [];
  // older cards stored a single "hours last night" number: carry it over as one untimed stretch
  if (!d.sleep.length && d.vuln.sleep !== "" && d.vuln.sleep != null && Number(d.vuln.sleep) > 0) {
    d.sleep.push({ start: "", end: "", hours: Number(d.vuln.sleep) });
  }
  return d;
}

/** Hours of one sleep stretch: from its clock times when both are set (crossing midnight
 *  is fine), else the typed hours. */
export function sleepHours(ep) {
  if (ep.start && ep.end) {
    const [sh, sm] = ep.start.split(":").map(Number), [eh, em] = ep.end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return Math.round(mins / 6) / 10;
  }
  const h = Number(ep.hours);
  return h > 0 ? h : 0;
}

/** {total, count, longest} for a day's sleep stretches. Also mirrors the total into
 *  vuln.sleep so older code (review, exports) keeps reading one number. */
export function sleepSummary(d) {
  const eps = (d.sleep || []).map(sleepHours).filter((h) => h > 0);
  const total = Math.round(eps.reduce((a, b) => a + b, 0) * 10) / 10;
  const out = { total, count: eps.length, longest: eps.length ? Math.max(...eps) : 0 };
  d.vuln.sleep = eps.length ? String(total) : "";
  return out;
}

export function dayHasContent(d) {
  if (!d) return false;
  return Object.keys(d.emotions || {}).length > 0 || Object.keys(d.urges || {}).length > 0 || (d.skills || []).length > 0 || !!d.note;
}
