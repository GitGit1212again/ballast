// Tiny DOM helpers shared by the views.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let toastTimer = null;
export function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 1800);
}

export function scaleHtml(cls, name, value, max = 5) {
  let h = `<div class="scale ${cls}" data-scale="${esc(name)}">`;
  for (let i = 0; i <= max; i++) h += `<button type="button" data-v="${i}" class="${value === i ? "on" : ""}">${i}</button>`;
  return h + "</div>";
}

export function copyText(text) {
  // navigator.clipboard is missing outside secure contexts and in some webviews: fall back.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
}
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { ta.setSelectionRange(0, text.length); } catch (e) { /* iOS wants an explicit range */ }
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  toast(ok ? "Copied" : "Could not copy");
  ta.remove();
}

export function download(name, text, type = "text/plain") {
  // iPhone/iPad home-screen app (navigator.standalone is iOS-only): a blob download can
  // strand you on a preview with no way back, so hand the file to the share sheet instead
  // (Save to Files, AirDrop, Mail). Everywhere else this is an ordinary download.
  if (navigator.standalone === true) {
    try {
      const file = new File([text], name, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch((e) => { if (!e || e.name !== "AbortError") plainDownload(name, text, type); });
        return;
      }
    } catch (e) { /* fall through to the plain download */ }
  }
  plainDownload(name, text, type);
}
function plainDownload(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function fmtCountdown(ms) {
  if (ms <= 0) return "ready";
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function confirmBox(msg) { return window.confirm(msg); }
