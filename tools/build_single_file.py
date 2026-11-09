#!/usr/bin/env python3
"""Bundle the ES-module app into one HTML fragment (preview/index.html).

Used for a no-install preview. Requirements on the sources (already followed):
named imports only, unique top-level names across modules, `export` only on declarations.
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)';?\n?")
mods, order = {}, []

def load(path):
    path = path.resolve()
    if path in mods:
        return
    src = path.read_text()
    mods[path] = None
    for _names, rel in IMPORT.findall(src):
        load(path.parent / rel)
    mods[path] = src
    order.append(path)

load(root / 'js/main.js')

seen, dup = {}, []
chunks = []
for p in order:
    src = IMPORT.sub('', mods[p])
    src = re.sub(r'^export\s+(?=(async\s+)?(function|const|let|class)\b)', '', src, flags=re.M)
    for m in re.finditer(r'^(?:async\s+)?(?:function|const|let|class)\s+(\w+)', src, flags=re.M):
        n = m.group(1)
        if n in seen: dup.append((n, seen[n], p.name))
        seen[n] = p.name
    if re.search(r'^export\b', src, flags=re.M):
        sys.exit(f'unhandled export in {p}')
    chunks.append(f'// ---- {p.relative_to(root)} ----\n{src}')
if dup:
    sys.exit(f'duplicate top-level names: {dup}')

css = '\n'.join((root / f'css/{n}.css').read_text() for n in ['tokens', 'base', 'layout', 'components'])
js = "(() => {\n'use strict';\n" + '\n'.join(chunks) + '\n})();'
js = js.replace("navigator.serviceWorker.register('sw.js')", "navigator.serviceWorker.register('sw.js')")

html = f"""<title>Штуки</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
<main id="app" class="app"></main>
<div id="overlay-root"></div>
<div id="toast-root" aria-live="polite"></div>
<script>
{js}
</script>
"""
out = root / 'preview'
out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html)
print('modules:', len(order), 'size KB:', len(html) // 1024)
