"""Builds the app icon (SVG + PNGs) from the same folder design that the app uses for folders.
Usage: python3 tools/make_icons.py  (needs playwright + chromium)"""
import colorsys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'icons'
HUE = 265


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def svg(maskable=False):
    # Only the top half of the folder rises from the bottom edge; the paper cards pop out above it.
    x0, x1 = (64, 448) if maskable else (30, 482)
    top = 262            # top edge of the folder tab
    body = top + 30      # top edge of the folder body
    tab_r = x0 + 0.42 * (x1 - x0)
    r = 36
    back = (
        f'M{x0} 620 V{top + 22} A22 22 0 0 1 {x0 + 22} {top} H{tab_r - 22} '
        f'A22 22 0 0 1 {tab_r} {top + 22} V{body} H{x1 - r} A{r} {r} 0 0 1 {x1} {body + r} V620 Z'
    )
    cx = 256 if maskable else 276
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1a33"/>
      <stop offset="1" stop-color="#07070c"/>
    </linearGradient>
    <linearGradient id="back" x1="0" y1="{top}" x2="0" y2="{top + 300}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{hsl(HUE, 72, 80)}"/>
      <stop offset="1" stop-color="{hsl(HUE, 62, 62)}"/>
    </linearGradient>
    <linearGradient id="front" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{hsl(HUE, 90, 96)}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="{hsl(HUE, 70, 84)}" stop-opacity="0.30"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <path d="{back}" fill="url(#back)"/>
  <g filter="url(#shadow)">
    <g transform="rotate(-8 {cx - 72} 230)"><rect x="{cx - 160}" y="98" width="176" height="196" rx="24" fill="#ffffff"/></g>
    <g transform="rotate(7 {cx + 76} 230)"><rect x="{cx - 12}" y="72" width="176" height="196" rx="24" fill="#f1ecff"/></g>
  </g>
  <rect x="{x0}" y="{top + 112}" width="{x1 - x0}" height="260" rx="{r}" fill="url(#front)"/>
  <rect x="{x0 + 1.5}" y="{top + 113.5}" width="{x1 - x0 - 3}" height="260" rx="{r}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="3"/>
</svg>
'''


(OUT / 'icon.svg').write_text(svg())
(OUT / 'icon-maskable.svg').write_text(svg(True))

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for src, name, size in [('icon.svg', 'icon-192.png', 192), ('icon.svg', 'icon-512.png', 512),
                            ('icon.svg', 'apple-touch-icon.png', 180), ('icon-maskable.svg', 'icon-maskable-512.png', 512)]:
        pg = b.new_page(viewport={'width': size, 'height': size})
        markup = (OUT / src).read_text().replace('<svg ', f'<svg width="{size}" height="{size}" ', 1)
        pg.set_content(f'<body style="margin:0">{markup}</body>')
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(OUT / name))
        pg.close()
print('ok')
