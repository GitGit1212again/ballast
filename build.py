#!/usr/bin/env python3
"""Bundle src/ into dist/Ballast.html - one self-contained offline file.

Python 3 standard library only, no third-party packages.

What it does:
  1. reads src/index.html
  2. inlines every local <link rel="stylesheet"> as a <style> block
  3. walks the ES-module graph from src/js/main.js, orders it so every module
     comes after the modules it imports (fails loudly on a cycle or a bad path)
  4. wraps each module in its own function scope that returns its exports,
     and rewrites `import` lines into destructuring from those scopes. That
     lets several modules export the same name (every view exports render())
     and supports `import * as ns`.
  5. puts it all in ONE <script type="module">
  6. inlines the page icons (<link rel="icon"> / "apple-touch-icon") as data: URIs,
     so dist/Ballast.html needs nothing next to it: it works from disk, from a
     static host such as GitHub Pages under any sub-path, and when renamed
     (e.g. to index.html)
  7. copies src/assets/ verbatim

Supported syntax: `import { a, b as c } from "./x.js"`, `import * as ns from`,
`import "./x.js"`, `export function|async function|const|let|class`,
`export { a, b as c }`. Not supported: default exports, re-exports,
dynamic import, live bindings of reassigned `let` exports.
"""

import base64
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")
ENTRY = os.path.join(SRC, "js", "main.js")
OUT = os.path.join(DIST, "Ballast.html")

LINK_RE = re.compile(r'[ \t]*<link[^>]*rel=["\']stylesheet["\'][^>]*>[ \t]*\n?', re.I)
HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)
ICON_RE = re.compile(r"""<link\b[^>]*\brel=["'](?:icon|apple-touch-icon)["'][^>]*>""", re.I)
ICON_MIME = {".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml"}
MAX_ICON_BYTES = 256 * 1024
SCRIPT_RE = re.compile(r'[ \t]*<script[^>]*src=["\']([^"\']+)["\'][^>]*>\s*</script>[ \t]*\n?', re.I)
IMPORT_RE = re.compile(
    r'^[ \t]*import\s+(?:(\*\s+as\s+(\w+))|(\{[^}]*\}))?\s*(?:from\s+)?[\'"]([^\'"]+)[\'"]\s*;?[ \t]*$', re.M)
EXPORT_DECL_RE = re.compile(r'^([ \t]*)export\s+(?=(async\s+function|function|const|let|var|class)\s+(\w+))', re.M)
EXPORT_LIST_RE = re.compile(r'^[ \t]*export\s*\{([^}]*)\}\s*;?[ \t]*$\n?', re.M)
EXPORT_DEFAULT_RE = re.compile(r'^\s*export\s+default\b', re.M)


def die(msg):
    sys.stderr.write("build.py: " + msg + "\n")
    raise SystemExit(1)


def read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def resolve(importer, spec):
    if not spec.startswith("."):
        die("non-relative import %r in %s" % (spec, os.path.relpath(importer, ROOT)))
    target = os.path.normpath(os.path.join(os.path.dirname(importer), spec))
    if not os.path.isfile(target):
        die("unresolved import %r from %s" % (spec, os.path.relpath(importer, ROOT)))
    if os.path.commonpath([os.path.abspath(target), SRC]) != SRC:
        die("import %r from %s escapes src/" % (spec, os.path.relpath(importer, ROOT)))
    return target


def order_modules(entry):
    ordered, done, stack = [], set(), []

    def visit(path):
        if path in done:
            return
        if path in stack:
            cycle = " -> ".join(os.path.relpath(p, SRC).replace("\\", "/") for p in stack[stack.index(path):] + [path])
            die("circular import: " + cycle)
        stack.append(path)
        for m in IMPORT_RE.finditer(read(path)):
            visit(resolve(path, m.group(4)))
        stack.pop()
        done.add(path)
        ordered.append(path)

    visit(entry)
    return ordered


def mod_id(path):
    rel = os.path.relpath(path, SRC).replace("\\", "/")
    return "__m_" + re.sub(r"[^A-Za-z0-9]", "_", rel)


def transform(path):
    """Return (wrapped_js, export_names) for one module."""
    text = read(path)
    if EXPORT_DEFAULT_RE.search(text):
        die("export default is not supported (%s)" % os.path.relpath(path, ROOT))
    exports = []

    def on_import(m):
        ns, names, spec = m.group(2), m.group(3), m.group(4)
        target = mod_id(resolve(path, spec))
        if ns:
            return "const %s = %s;" % (ns, target)
        if names:
            inner = ", ".join(
                (p.strip().replace(" as ", ": ") if " as " in p else p.strip())
                for p in names.strip("{} \n").split(",") if p.strip())
            return "const { %s } = %s;" % (inner, target)
        return "void %s;" % target  # bare import for side effects

    text = IMPORT_RE.sub(on_import, text)

    def on_decl(m):
        exports.append(m.group(3))
        return m.group(1)

    text = EXPORT_DECL_RE.sub(on_decl, text)

    def on_list(m):
        for p in m.group(1).split(","):
            p = p.strip()
            if not p:
                continue
            if " as " in p:
                local, alias = [x.strip() for x in p.split(" as ")]
                exports.append("%s: %s" % (alias, local))
            else:
                exports.append(p)
        return ""

    text = EXPORT_LIST_RE.sub(on_list, text)
    rel = os.path.relpath(path, SRC).replace("\\", "/")
    body = "\n".join("  " + ln if ln.strip() else "" for ln in text.strip("\n").split("\n"))
    wrapped = "/* ---- %s ---- */\nconst %s = (() => {\n%s\n  return { %s };\n})();" % (
        rel, mod_id(path), body, ", ".join(exports))
    return wrapped, exports


def main():
    index_path = os.path.join(SRC, "index.html")
    if not os.path.isfile(index_path):
        die("missing " + index_path)
    html = read(index_path)

    def inline_css(m):
        tag = m.group(0)
        href_m = HREF_RE.search(tag)
        if not href_m:
            return tag
        href = href_m.group(1)
        if href.startswith("http") or href.startswith("//"):
            return tag
        p = os.path.normpath(os.path.join(SRC, href))
        if not os.path.isfile(p):
            die("unresolved stylesheet %r in src/index.html" % href)
        return "<style>\n/* ---- %s ---- */\n%s</style>\n" % (href, read(p))

    html = LINK_RE.sub(inline_css, html)

    def inline_icon(m):
        tag = m.group(0)
        href_m = HREF_RE.search(tag)
        if not href_m:
            return tag
        href = href_m.group(1)
        if href.startswith(("http", "//", "data:")):
            return tag
        p = os.path.normpath(os.path.join(SRC, href))
        mime = ICON_MIME.get(os.path.splitext(p)[1].lower())
        if not os.path.isfile(p):
            die("unresolved icon %r in src/index.html" % href)
        if mime is None or os.path.getsize(p) > MAX_ICON_BYTES:
            return tag  # leave odd or large files as plain relative links
        with open(p, "rb") as fh:
            uri = "data:%s;base64,%s" % (mime, base64.b64encode(fh.read()).decode("ascii"))
        return tag.replace(href_m.group(0), 'href="%s"' % uri)

    html = ICON_RE.sub(inline_icon, html)

    modules = order_modules(ENTRY)
    parts = [transform(p)[0] for p in modules]
    bundle = "<script type=\"module\">\n" + "\n\n".join(parts) + "\n</script>\n"

    def inline_js(m):
        src = m.group(1)
        if src.startswith("http") or src.startswith("//"):
            return m.group(0)
        if os.path.normpath(os.path.join(SRC, src)) != os.path.normpath(ENTRY):
            die("src/index.html loads %r; only js/main.js is bundled" % src)
        return bundle

    html, n = SCRIPT_RE.subn(inline_js, html)
    if n != 1:
        die("expected exactly one <script src=...> in src/index.html, found %d" % n)

    os.makedirs(DIST, exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)

    assets = os.path.join(SRC, "assets")
    if os.path.isdir(assets):
        dest = os.path.join(DIST, "assets")
        if os.path.isdir(dest):
            shutil.rmtree(dest)
        shutil.copytree(assets, dest)
        print("copied assets/ verbatim")

    size = os.path.getsize(OUT)
    print("%d modules bundled" % len(modules))
    print("wrote %s (%d bytes, %.1f KB)" % (os.path.relpath(OUT, ROOT), size, size / 1024))


if __name__ == "__main__":
    main()
