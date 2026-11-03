// Persistence. Prefers the local server's api/state (a file on disk) when the page is
// served from this machine by server.py; otherwise everything lives in localStorage.
// That second case is what you get from dist/Ballast.html opened from disk, or hosted
// on a static site such as GitHub Pages (including iPhone Safari).

const LS_KEY = "ballast.v1";
// Relative on purpose: resolves under any sub-path, and is never a root-absolute URL.
const API = "api/state";
let useServer = null; // unknown until first load
let timer = null;
let pending = null;

// Only look for the local server when the page really came from one on this machine.
// From file:// or a public host there is nothing to find, and the app must not send
// requests to a path on somebody else's server.
function serverPossible() {
  if (typeof location === "undefined") return true; // non-browser test harness
  return location.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
}

export async function load() {
  if (serverPossible()) {
    try {
      const r = await fetch(API, { cache: "no-store" });
      if (r.ok) {
        useServer = true;
        const data = await r.json();
        if (data) return data;
        // server has nothing yet: migrate anything in localStorage
        const ls = readLS();
        if (ls) await putServer(ls);
        return ls;
      }
    } catch (e) { /* no server */ }
  }
  useServer = false;
  return readLS();
}

export function backend() { return useServer ? "file" : "browser"; }

export function save(state) {
  pending = JSON.parse(JSON.stringify(state));
  writeLS(pending); // durable browser copy before the debounce or tab close
  clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

export async function flush() {
  if (!pending) return;
  const s = pending; pending = null;
  writeLS(s);
  if (useServer) {
    try { await putServer(s); } catch (e) { console.warn("save to server failed", e); window.alert("Ballast could not save to its local file. Your browser copy is retained when storage is available. Export a JSON backup in Settings before closing."); }
  }
}

async function putServer(s) {
  const r = await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s), keepalive: true });
  if (!r.ok) throw new Error("Save failed: HTTP " + r.status);
}

// Every localStorage touch is wrapped: Safari private browsing, blocked site data and
// full storage all make it throw, and the app must keep running when that happens.
function readLS() {
  try { const t = localStorage.getItem(LS_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
let warnedLS = false;
function writeLS(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {
    if (warnedLS) return; // one warning per session, not one per keystroke
    warnedLS = true;
    window.alert("Ballast could not save its browser copy. Storage may be full or disabled (private browsing does this). Export a JSON backup in Settings now.");
  }
}

window.addEventListener("pagehide", () => { flush(); });
