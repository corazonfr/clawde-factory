#!/usr/bin/env python3
"""Assemble a self-contained copy of the ubg98 game site.

Takes the site shell plus a chosen set of game folders and rewrites every
path so the whole thing works from a local server with no internet:
  - iframes pointing at https://ubg98.github.io/<Game>/  ->  g/<Game>/index.html
  - root-absolute links (href="/x.html")                 ->  relative (href="x.html")
  - pages and listing cards for games we did not bundle  ->  removed
"""
import os, re, shutil, sys

SHELL = '/tmp/claude-0/sites/ubg98'
GAMES = '/tmp/claude-0/sites/games'
OUT   = '/home/user/clawde-factory/arcade/site'

keep = set(sys.argv[1:])
if not keep:
    print('usage: build_site.py Game1 Game2 ...'); sys.exit(1)

if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)

# --- 1. shell (html + assets only) ---
for name in os.listdir(SHELL):
    if name.startswith('.') or name in ('ads.txt', 'CNAME', 'robots.txt', 'sitemap.xml'):
        continue
    src = os.path.join(SHELL, name)
    dst = os.path.join(OUT, name)
    if os.path.isdir(src):
        shutil.copytree(src, dst)
    elif name.endswith('.html'):
        shutil.copy2(src, dst)

# --- 2. the games themselves ---
os.makedirs(os.path.join(OUT, 'g'))
for g in sorted(keep):
    s = os.path.join(GAMES, g)
    if os.path.isdir(s):
        shutil.copytree(s, os.path.join(OUT, 'g', g))

IFRAME = re.compile(r'src="https://ubg98\.github\.io/([A-Za-z0-9_-]+)/?"')

# --- 3. which game pages survive? ---
removed, kept = [], []
for f in [x for x in os.listdir(OUT) if x.endswith('.html')]:
    p = os.path.join(OUT, f)
    html = open(p, encoding='utf-8', errors='ignore').read()
    m = IFRAME.search(html)
    if m:                                   # it is a game page
        if m.group(1) in keep:
            kept.append(f)
        else:
            os.remove(p); removed.append(f); continue
    # any other iframe host (games we cannot bundle) -> drop the page too
    elif re.search(r'<iframe[^>]+src="https?://', html):
        os.remove(p); removed.append(f); continue

# --- 4. rewrite paths in everything that is left ---
for f in [x for x in os.listdir(OUT) if x.endswith('.html')]:
    p = os.path.join(OUT, f)
    html = open(p, encoding='utf-8', errors='ignore').read()
    html = IFRAME.sub(lambda m: 'src="g/%s/index.html"' % m.group(1), html)
    html = re.sub(r'(href|src)="/(?!/)', r'\1="', html)      # /x.html -> x.html
    # drop listing cards that point at pages we deleted
    for dead in removed:
        html = re.sub(r'<div class="col[^"]*">\s*<a[^>]+href="' + re.escape(dead) + r'".*?</div>\s*', '', html, flags=re.S)
    open(p, 'w', encoding='utf-8').write(html)

size = sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(OUT) for x in fs)
print('games bundled : %d' % len(os.listdir(os.path.join(OUT, 'g'))))
print('game pages    : %d kept, %d removed' % (len(kept), len(removed)))
print('total size    : %.0f MB' % (size / 1048576))
