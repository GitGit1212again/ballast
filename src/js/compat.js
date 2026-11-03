// Guards for browsers that lack a few APIs the app uses (mainly older iOS Safari).
// Imported first by state.js so it runs before anything else touches these.
// The app calls no navigator.vibrate, Notification or service-worker APIs, so there is
// nothing to guard for those; the only newer API it relies on is structuredClone.

if (typeof globalThis.structuredClone !== "function") {
  // Everything the app clones is plain JSON data, so a JSON round trip is equivalent.
  globalThis.structuredClone = (v) => JSON.parse(JSON.stringify(v));
}
