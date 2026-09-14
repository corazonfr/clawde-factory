#!/usr/bin/env python3
"""
Make a downloaded unblocked-games archive work as a local folder.

Archives like D3ch/hell, selenite-cc/selenite-old and Prollhouse2/gamesite are
built to run at the root of a web domain. Dropped into a folder they break,
because their pages link to things like href="/index" -- which points at the
root of your disk, not at the archive.

This rewrites those links to be relative, strips the analytics and ad tags that
hang for 30 seconds with no internet, and writes PLAY.html listing every game
it can find.

USAGE
  1. Download and extract an archive (GitHub -> Code -> Download ZIP).
  2. Put this file INSIDE the extracted folder, next to its index.html.
  3. Double-click it, or run:   python3 fix-archive.py
  4. Then run START-Windows.bat (or serve.py) from the same folder and open
     PLAY.html.

Safe to re-run. It only touches .html files, and only the link forms above.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# tags that reach out to the network -- they only ever stall an offline copy
JUNK = re.compile(
    r'<script[^>]+src="[^"]*(?:googletagmanager|google-analytics|analytics\.js|'
    r'gtag/js|adsbygoogle|pagead2|doubleclick|hotjar|clarity\.ms)[^"]*"[^>]*>\s*</script>',
    re.I)
JUNK_INLINE = re.compile(
    r'<script[^>]*>[^<]{0,4000}?(?:gtag\(|dataLayer\.push|adsbygoogle|GoogleAnalytics)'
    r'[^<]{0,4000}?</script>', re.I | re.S)

# href="/thing" or src="/thing" -- but NOT "//cdn.example.com"
ABS = re.compile(r'(\b(?:href|src|data-src)=")/(?!/)')

SKIP_DIRS = {'.git', 'node_modules', '.github'}


def rel_prefix(path):
    """How many '../' to climb from this file back to the archive root."""
    depth = os.path.relpath(os.path.dirname(path), ROOT).count(os.sep)
    if os.path.relpath(os.path.dirname(path), ROOT) == '.':
        return ''
    return '../' * (depth + 1)


def main():
    html_files, changed, links, junked = [], 0, 0, 0

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn.lower().endswith(('.html', '.htm')):
                html_files.append(os.path.join(dirpath, fn))

    print('scanning %d html files...' % len(html_files))

    for path in html_files:
        try:
            with open(path, encoding='utf-8', errors='ignore') as f:
                original = f.read()
        except Exception:
            continue

        s = original
        n_junk = len(JUNK.findall(s)) + len(JUNK_INLINE.findall(s))
        s = JUNK.sub('', s)
        s = JUNK_INLINE.sub('', s)

        prefix = rel_prefix(path)
        n_links = len(ABS.findall(s))
        if n_links:
            s = ABS.sub(lambda m: m.group(1) + prefix, s)

        if s != original:
            try:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(s)
                changed += 1
                links += n_links
                junked += n_junk
            except Exception as e:
                print('  could not write %s: %s' % (path, e))

    # every folder holding an index.html is a game
    games = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if 'index.html' in filenames and os.path.abspath(dirpath) != ROOT:
            rel = os.path.relpath(dirpath, ROOT).replace(os.sep, '/')
            if rel.count('/') > 2:
                continue
            name = os.path.basename(dirpath).replace('-', ' ').replace('_', ' ')
            name = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', name).strip().title()
            games.append((name, rel + '/index.html'))

    games.sort()
    cards = '\n'.join(
        '  <a href="%s">%s</a>' % (href.replace('"', '&quot;'), name)
        for name, href in games)

    page = """<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline Arcade</title>
<style>
 body{margin:0;padding:28px 20px 60px;background:#07070d;color:#eef0ff;
      font-family:"Segoe UI",system-ui,sans-serif}
 h1{font-size:28px;margin:0 0 6px}
 p.sub{color:#8e93b5;margin:0 0 22px;font-size:14px}
 #q{width:100%;max-width:420px;padding:11px 14px;border-radius:10px;font-size:14px;
    background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#eef0ff}
 #grid{display:grid;gap:10px;margin-top:22px;
       grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
 a{display:block;padding:14px 15px;border-radius:12px;text-decoration:none;color:#eef0ff;
   background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
   font-size:14px;font-weight:600;transition:.15s}
 a:hover{background:rgba(124,92,255,.22);border-color:rgba(124,92,255,.6);transform:translateY(-2px)}
 .warn{display:none;background:#3a1020;border:1px solid #ff3ea5;padding:14px 16px;
       border-radius:12px;margin-bottom:20px;font-size:13.5px;line-height:1.6}
</style>
<h1>Offline Arcade</h1>
<p class="sub">__COUNT__ games in this folder. Not every one will run &mdash; some need
a server they can't reach offline. The ones that work, work completely.</p>
<div class="warn" id="w"><b>You opened this as a file.</b><br>
Most of these games can't load their artwork from a <code>file://</code> page &mdash; that's a
browser rule. Run <b>START-Windows.bat</b> (or <code>python3 serve.py</code>) in this folder
and open the address it prints instead.</div>
<input id="q" placeholder="Search games..." autocomplete="off">
<div id="grid">
__CARDS__
</div>
<script>
 if (location.protocol === 'file:') document.getElementById('w').style.display = 'block';
 var all = [].slice.call(document.querySelectorAll('#grid a'));
 document.getElementById('q').addEventListener('input', function (e) {
   var v = e.target.value.toLowerCase();
   all.forEach(function (a) {
     a.style.display = a.textContent.toLowerCase().indexOf(v) >= 0 ? '' : 'none';
   });
 });
</script>
"""
    page = page.replace('__COUNT__', str(len(games))).replace('__CARDS__', cards)
    with open(os.path.join(ROOT, 'PLAY.html'), 'w', encoding='utf-8') as f:
        f.write(page)

    print('')
    print('  rewrote %d files' % changed)
    print('  fixed   %d root-absolute links' % links)
    print('  removed %d analytics/ad tags' % junked)
    print('  found   %d games -> PLAY.html' % len(games))
    print('')
    print('  Next: run START-Windows.bat in this folder, then open PLAY.html')
    print('')
    if os.name == 'nt':
        input('  Press Enter to close.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
