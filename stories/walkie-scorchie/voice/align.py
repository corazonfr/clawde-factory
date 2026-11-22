# Fit a new narration take onto the timing of the old one, so the rendered picture stays in sync.
# Usage: python3 align.py new_raw.wav new_words.json old_words.json out.wav
# Cuts the new take at the pauses of the old one, time-stretches each spoken phrase (ffmpeg rubberband,
# pitch kept) to the old phrase's length and makes each pause the old pause's length.
import json, re, subprocess, sys, os, tempfile, difflib, wave
import numpy as np

src, nw_path, ow_path, out = sys.argv[1:5]
GAP = 0.12            # a pause in the old take at least this long is a cut point
TMIN, TMAX = 0.75, 1.6  # allowed tempo per phrase; anything outside drifts and the next pause absorbs it

def norm(w):
    w = re.sub(r"[^a-z0-9]", "", w.lower())
    return {"metres": "meters", "centimetres": "centimeters"}.get(w, w)

def read(p):
    w = wave.open(p); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; w.close()
    return a, sr

old, new = json.load(open(ow_path)), json.load(open(nw_path))
a, sr = read(src)
sm = difflib.SequenceMatcher(a=[norm(x["word"]) for x in old], b=[norm(x["word"]) for x in new], autojunk=False)
match = {}
for blk in sm.get_matching_blocks():
    for k in range(blk.size): match[blk.a + k] = blk.b + k
print(f"matched {len(match)}/{len(old)} old words")

# phrases: runs of words with no pause inside (a pause >= GAP in the old take, or >= NGAP in the new one)
NGAP = 0.2
phrases, cur = [], [0]
for i in range(1, len(old)):
    ngap = new[match[i]]["start"] - new[match[i - 1]]["end"] if i in match and i - 1 in match else 0
    if old[i]["start"] - old[i - 1]["end"] >= GAP or ngap >= NGAP: phrases.append(cur); cur = []
    cur.append(i)
phrases.append(cur)

def ends(ph):
    i0 = next((i for i in ph if i in match), None); i1 = next((i for i in reversed(ph) if i in match), None)
    if i0 is None: return None
    return old[ph[0]]["start"], old[ph[-1]]["end"], new[match[i0]]["start"], new[match[i1]]["end"]

def db(t):  # level of the 20 ms window at t in the new take
    s = a[max(0, int(t * sr)):int((t + 0.02) * sr)]
    return 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9) if len(s) else -120

def snap(s):  # whisper word edges can sit in silence: move them onto where the sound really starts / stops
    os_, oe, ns, ne = s
    run, t = 0, ns  # a real pause just after the start means the start is the previous word's tail: skip past it
    while t < min(ne, ns + 1.0):
        run = run + 1 if db(t) < -60 else 0
        if run == 0 and t > ns + 0.35: break  # only a pause that starts right away
        t += 0.02
        if run >= 8:
            while db(t) < -60 and t < ne: t += 0.02
            ns = t; break
    for _ in range(50):
        if db(ns) > -45 or ns + 0.02 >= ne: break
        ns += 0.02
    return os_, oe, ns, ne

segs = [snap(e) for e in (ends(p) for p in phrases) if e]
# merge phrases whose new-take spans overlap or run backwards (bad matches)
clean = [segs[0]]
for s in segs[1:]:
    if s[2] < clean[-1][3]: clean[-1] = (clean[-1][0], s[1], clean[-1][2], max(s[3], clean[-1][3]))
    else: clean.append(s)

def quiet(t): return all(db(t + 0.02 * k) < -50 for k in range(3))
for k, (os_, oe, ns, ne) in enumerate(clean):  # word ends are also unreliable: run each phrase on until the sound stops
    lim = clean[k + 1][2] - 0.02 if k + 1 < len(clean) else len(a) / sr
    while ne < lim and not quiet(ne): ne += 0.02
    lo = clean[k - 1][3] if k else 0
    while ns - 0.02 > lo and not quiet(ns - 0.06): ns -= 0.02
    clean[k] = (os_, oe, ns, min(ne, lim))

tmp = tempfile.mkdtemp()
def stretch(x, tempo):
    i, o = os.path.join(tmp, "i.wav"), os.path.join(tmp, "o.wav")
    w = wave.open(i, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", i, "-af", f"rubberband=tempo={tempo:.5f}:pitchq=quality:transients=smooth:formant=preserved", o], check=True)
    return read(o)[0]

PAD = 0.03  # keep a little breath/release around each phrase
total = int(round((old[-1]["end"] + 1.0) * sr))
y = np.zeros(total, np.float32)
report = []
for k, (os_, oe, ns, ne) in enumerate(clean):
    ns0, ne0 = max(0, ns - PAD), min(len(a) / sr, ne + PAD)
    tempo = (ne0 - ns0) / max(0.05, (oe - os_) + 2 * PAD)
    t = min(max(tempo, TMIN), TMAX)
    z = stretch(a[int(ns0 * sr):int(ne0 * sr)], t)
    f = int(0.008 * sr); z[:f] *= np.linspace(0, 1, f); z[-f:] *= np.linspace(1, 0, f)
    p = int(round((os_ - PAD) * sr)); p = max(0, p)
    seg = z[: max(0, total - p)]; y[p:p + len(seg)] += seg
    report.append(f"{os_:6.2f}-{oe:6.2f}s  tempo {tempo:.2f}" + ("" if t == tempo else f" (clamped {t:.2f})"))
print("\n".join(report))
w = wave.open(out, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print(f"wrote {out}: {len(y) / sr:.2f}s, {len(clean)} phrases")
