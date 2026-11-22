# Sound for "The Tower Saved by a War": an original mandolin + tuba score (our own melody), synthesized SFX on the
# picture's cue times, and the final mix. Uses the synthesis modules of the cartoon-3d-short skill (dsp, instruments,
# sfx_gen). Standard mix: music bed ~10 LU under the voice (+3 dB on the old -13), ducked 3 dB under speech; SFX
# events peak ~6 dB under the voice; master -15 LUFS integrated, true peak <= -1 dBTP; 48 kHz stereo, exact length.
# usage: python pisa_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
import os, sys, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../.claude/skills/cartoon-3d-short/templates/audio"))
from dsp import (SR, ns, rng, lp, hp, pan, place, fades, dbg, integrated, momentary_max, true_peak, read_wav, write_wav,
                 make_ir, convolve_st, colored)
import instruments as I
import sfx_gen as G

FPS, TOTAL = 30, 2118
DUR = TOTAL / FPS
N = ns(DUR)
F = I.m2f
W = json.load(open(os.path.join(HERE, "../voice/words.json")))
Q = 60 / 112  # quarter note at 112 bpm

_seed = [1000]
def R():
    _seed[0] += 1
    return rng(_seed[0])

# ================= music =================
class Band:
    def __init__(self):
        self.out = np.zeros((2, N)); self.send = np.zeros((2, N))
    def add(self, x, t, p=0.0, g=1.0, send=0.15):
        x = pan(x, p) if np.ndim(x) == 1 else x
        place(self.out, x, t, g); place(self.send, x, t, g * send)

B = Band()
# theme (our own): (beat offset in quarters, length in quarters, midi) in F major, 2 bars of 4/4
THEME = [(0, .5, 72), (.5, .5, 74), (1, 1, 76), (2, .5, 77), (2.5, .5, 76), (3, 1, 74),
         (4, .5, 72), (4.5, .5, 69), (5, 1, 72), (6, .5, 74), (6.5, .5, 72), (7, 1, 77)]
THEME2 = [(0, .5, 79), (.5, .5, 77), (1, 1, 76), (2, .5, 74), (2.5, .5, 76), (3, 1, 77),
          (4, .5, 81), (4.5, .5, 79), (5, .5, 77), (5.5, .5, 76), (6, 2, 77)]
CH = {"F": (41, [57, 60, 65]), "C": (36, [55, 60, 64]), "Bb": (34, [58, 62, 65]), "Dm": (38, [57, 62, 65]),
      "Gm": (43, [55, 58, 62]), "A": (45, [57, 61, 64]), "C7": (36, [55, 58, 64])}

def mandolin(m, t, dur, vel=0.6, p=0.25):
    """tremolo mandolin: fast repeated plucks over the note"""
    k = max(1, int(dur / 0.07))
    for i in range(k):
        B.add(I.pluck(F(m), vel * (1.0 if i == 0 else 0.55), R(), dur=0.25, bright=0.65), t + i * 0.07, p)

def melody(t0, notes, vel=0.6, tremolo=True, transpose=0):
    for (b, d, m) in notes:
        t = t0 + b * Q
        if tremolo and d >= 1: mandolin(m + transpose, t, d * Q * 0.95, vel)
        else: B.add(I.pluck(F(m + transpose), vel, R(), dur=0.5, bright=0.6), t, 0.25)

def oompah(t0, chords, vel=0.55, pah=0.35):
    for k, c in enumerate(chords):  # one chord per half bar (2 quarters)
        lo, tri = CH[c]
        t = t0 + k * 2 * Q
        B.add(I.brass(F(lo), 0.22, vel, R(), "tuba", scoop=-30), t, -0.15)
        for j, m in enumerate(tri):
            B.add(I.pluck(F(m), pah, R(), dur=0.3, bright=0.4), t + Q + 0.006 * j, -0.3 + 0.15 * j, 0.7)

def theme_block(t0, bars=4, vel=0.6, bright=False):
    seq = ["F", "C", "F", "C", "Bb", "F", "C", "F"][: bars * 2]
    oompah(t0, seq, 0.55 + (0.1 if bright else 0))
    melody(t0, THEME, vel)
    if bars >= 4: melody(t0 + 8 * Q, THEME2, vel)
    if bright:
        for k in range(bars): B.add(I.glock(F(84 + (k % 2) * 3), 0.35, R()), t0 + k * 4 * Q + 3 * Q, 0.4)

def stinger(t, chord=(53, 57, 60, 65), vel=0.7):
    for m in chord: B.add(I.brass(F(m), 0.5, vel, R(), "stab"), t, 0.0, 0.6)

# ---- the cue sheet of the score ----
def wt(word):
    return next(x["start"] for x in W if x["word"] == word)
B.add(I.cymbal(0.4, R(), 2.6), 0.15, 0.0, 0.5)
stinger(0.05, (53, 60, 65, 69), 0.55)
B.add(I.timpani(F(41), 0.7, R()), 2.72)
theme_block(2.75, bars=3)                         # town, cheerful
# 9.0 "tip": the band stops dead, a sliding tuba "wah"
B.add(I.brass(F(36), 0.7, 0.8, R(), "tuba", fall=-7.0), 9.0, 0.0)
B.add(I.timpani(F(36), 0.9, R()), 9.0)
# cross-section: low staccato bass, curious, D minor
for k, m in enumerate([50, 48, 46, 45, 43, 45, 46, 48, 50, 45, 38, 38]):
    B.add(I.pluck(F(m), 0.6, R(), dur=0.4, bright=0.3), 9.6 + k * Q * 0.75, -0.2)
B.add(I.brass(F(38), 0.9, 0.6, R(), "tuba"), 13.35, 0.0)  # "deep"
# war: snare roll, low minor brass; time passes on a glock run
for (tr, vr) in I.snare_roll(14.25, 15.4, 0.3, 0.8, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
for k, m in enumerate([50, 48, 46, 45]): B.add(I.brass(F(m), 0.5, 0.5, R(), "horn"), 14.3 + k * 0.6, 0.1)
for k in range(14): B.add(I.glock(F([72, 76, 79, 84][k % 4] + (k // 4) * 2), 0.32, R(), 0.8), 17.6 + k * 0.065, 0.3)
B.add(I.pad([F(57), F(62), F(65)], 2.4, 0.3, R()), 18.3, 0.0)
# sponge: playful pizzicato, fast squish run, then slow drips
for k, m in enumerate([72, 74, 72, 69, 72, 74, 76, 74]): B.add(I.pluck(F(m), 0.5, R(), 0.4, 0.7), 20.8 + k * Q / 2, 0.3)
for k in range(8): B.add(I.pluck(F(84 - k * 2), 0.55, R(), 0.25, 0.8), 22.9 + k * 0.045, 0.2)
for k, m in enumerate([77, 76, 74, 72, 69]): B.add(I.pluck(F(m), 0.45, R(), 0.7, 0.4), 24.8 + k * 0.42, 0.2)
B.add(I.pad([F(53), F(57), F(62)], 3.0, 0.28, R()), 26.6, 0.0)
# 1272: the theme returns, building, brighter
theme_block(29.3, bars=4, vel=0.62, bright=True)
B.add(I.cymbal(0.5, R(), 2.0), 33.85, 0.0)
# banana: glock boing + slide
for k, m in enumerate([84, 79, 76, 72]): B.add(I.glock(F(m), 0.45, R(), 1.0), 36.75 + k * 0.08, 0.3)
# 1838: light waltz figure, lucky chord, unlucky minor, splash timpani
for k in range(9):
    lo, tri = CH[["F", "C", "F", "Bb", "F", "C", "F", "C", "F"][k]]
    t = 37.5 + k * 3 * Q * 0.5
    B.add(I.brass(F(lo), 0.2, 0.45, R(), "tuba"), t, -0.1)
    for j in (1, 2): B.add(I.pluck(F(tri[j]), 0.35, R(), 0.25), t + j * Q * 0.5, 0.25)
stinger(42.0, (65, 69, 72, 77), 0.6)
stinger(43.3, (62, 65, 69, 74), 0.6)
B.add(I.timpani(F(38), 0.9, R()), 44.2)
# 1934: stern low brass march in D minor with snare
for k in range(12):
    t = 44.9 + k * Q
    B.add(I.brass(F([38, 45, 38, 45, 43, 50, 43, 45, 38, 45, 38, 33][k]), 0.3, 0.6, R(), "tuba"), t, -0.1)
    if k % 2: B.add(I.snare(0.45, R()), t, 0.15)
for k, m in enumerate([62, 62, 65, 64, 62, 60, 62]): B.add(I.brass(F(m), 0.38 if k < 6 else 0.9, 0.5, R(), "horn"), 45.3 + k * Q, 0.2)
B.add(I.timpani(F(33), 1.0, R()), 50.8); B.add(I.brass(F(33), 0.9, 0.8, R(), "tuba", fall=-5.0), 50.85, 0.0)
# 1990: suspense, stop on "shut"
B.add(I.pad([F(50), F(53), F(56)], 2.3, 0.35, R()), 51.75, 0.0)
B.add(I.snare(0.9, R()), 54.0, 0.0)
# engineers: tick-tock clock plucks, patient, then a rising arpeggio as it sinks back
for k in range(int((61.2 - 54.9) / (Q))):
    B.add(I.pluck(F(84 if k % 2 else 79), 0.35, R(), 0.2, 0.8), 54.9 + k * Q, 0.35 if k % 2 else -0.35)
    if k % 4 == 0: B.add(I.brass(F(41 if k % 8 == 0 else 36), 0.25, 0.4, R(), "tuba"), 54.9 + k * Q, -0.1)
for k, m in enumerate([65, 69, 72, 77, 81]): B.add(I.glock(F(m + 12), 0.4, R(), 1.2), 61.4 + k * 0.16, 0.3)
# finale: the full theme in the golden light
B.add(I.cymbal(0.45, R(), 2.4), 62.75, 0.0)
theme_block(62.8, bars=2, vel=0.65, bright=True)
# gag: the music stops dead on "Because"; one sad tuba note on "just a tower"
B.add(I.brass(F(41), 0.8, 0.55, R(), "tuba", fall=-3.0), 68.85, 0.0)
music = B.out + 0.5 * convolve_st(B.send.mean(0), make_ir(1.4, 5, pre=0.015))
music[:, ns(66.75):ns(68.8)] *= np.linspace(1, 0, ns(68.8) - ns(66.75))[None, :] ** 6  # hard stop into silence
music = hp(music, 30, 2)

# ================= SFX =================
S = np.zeros((2, N))
EV = []
def ev(name, t, x, rel_db, p=0.0):
    """event x placed at t, peaking rel_db under the voice's loudest moment"""
    x = pan(x, p) if np.ndim(x) == 1 else x
    m = momentary_max(x)
    if np.isfinite(m): x = x * dbg(VREF + rel_db - m)
    place(S, x, t); EV.append((t, name, rel_db))
def bed(name, t, x, rel_db):
    x = np.stack([x, x]) if np.ndim(x) == 1 else x
    m = integrated(x)
    if np.isfinite(m): x = x * dbg(VREF + rel_db - m)
    place(S, fades(x, 0.3, 0.6), t); EV.append((t, name, rel_db))

voice, _sr = read_wav(os.path.join(HERE, "../voice/voice.wav"))
assert _sr == SR, _sr
if voice.shape[0] == 1: voice = np.concatenate([voice, voice])
v = np.zeros((2, N)); v[:, : min(N, voice.shape[1])] = voice[:, :N]
VREF = momentary_max(v)
VI = integrated(v)

def mx(*parts):
    """sum mono sounds of different lengths: mx(a, (0.8, b), ...)"""
    xs = [(1.0, x) if not isinstance(x, tuple) else x for x in parts]
    xs = [(g, np.stack([x, x]) if np.ndim(x) == 1 else x) for g, x in xs]
    n = max(x.shape[1] for _, x in xs); out = np.zeros((2, n))
    for g, x in xs: out[:, : x.shape[1]] += g * x
    return out

def crowd(dur, n=10, seed=0):
    r = rng(seed); out = np.zeros((2, ns(dur)))
    for k in range(n):
        base, sc = (r.uniform(100, 150), 1.0) if k % 2 else (r.uniform(180, 240), 1.15)
        out += pan(lp(G.babble(dur, r, base, sc, r.uniform(3.6, 4.6), 0.7, fmax=3400), 3000, 1) * r.uniform(0.4, 1), r.uniform(-0.8, 0.8))
    return out

bed("breeze + birds (piazza)", 0.0, mx(G.breeze(DUR, R(), 0.8), (0.6, G.bird_chirps(DUR, R(), 0.35))), -24)
ev("whoosh into the flash", 2.35, G.whoosh(0.55, R(), peak=0.35), -10)
bed("proud townsfolk murmur", 2.9, crowd(4.7, 10, 3), -18)
ev("applause on 'proud'", 4.6, G.applause(1.8, R(), 30), -12)
ev("stone creak before the tip", 8.4, G.creak(0.7, R(), 60, 110, G.TIMBER, scale=1.4), -14)
ev("THE TIP: stone crack", wt("tip.") - 0.03, G.wood_crack(R()), -6)
ev("whoa from the builders", 9.05, mx(G.whoa(R()), (0.8, G.whoa(R()))), -12)
ev("bucket slides", 9.15, G.stick_slip(0.5, 40, R()), -16, 0.4)
bed("wet ground under the cut", 9.5, G.water_bed(4.4, R(), 0.4), -22)
ev("tools dropped", 15.45, mx(*[np.pad(G.clink(R(), 800 + 300 * k, 0.2), (ns(0.09 * k), 0)) for k in range(5)]), -12)
for k in range(10): ev("footsteps leaving", 15.8 + k * 0.32, G.stroll_step(R(), 0.6), -20, -0.3)
ev("a century passes (whoosh)", 17.4, G.whoosh(1.2, R(), peak=0.5, f_lo=200, f_hi=3000), -14)
ev("pigeon wings", 18.8, G.flag_flutter(0.9, R()), -14, 0.2)
ev("SQUISH (fast)", 22.88, mx(G.bubbles(0.45, R(), 90), (0.6, G.splash_big(R())[: ns(0.6)])), -9)
for k in range(5): ev("slow drip", 24.9 + k * 0.42, G.bubbles(0.06, R(), 40), -18, 0.1)
bed("clay seeping", 26.9, G.bubbles(2.1, R(), 8), -22)
for k in range(9): ev("chisels, new floors", 30.6 + k * 0.38, G.hammer_hit(R(), 0.6), -15, (k % 3 - 1) * 0.4)
ev("banana whoosh", 36.55, G.whoosh(0.5, R(), peak=0.3), -14)
for k in range(8): ev("architect steps", 38.0 + k * 0.4, G.stroll_step(R(), 0.4), -22, 0.2)
bed("water rising in the walkway", 43.4, G.water_bed(1.4, R(), 1.0), -16)
ev("SPLASH: the walkway floods", wt("water."), G.splash_big(R()), -8)
ev("tower sinks (groan)", 44.25, G.creak(0.9, R(), 40, 70, G.TIMBER, scale=1.6), -11)
bed("drills", 48.5, G.rattle(1.8, R(), 45), -16)
ev("cement glug", 49.9, G.bubbles(0.9, R(), 25, f_lo=120, f_hi=600), -12)
ev("tower sinks again (crack)", 50.8, mx(G.wood_crack(R()), (0.7, G.creak(0.8, R(), 35, 60, G.TIMBER, scale=1.8))), -6)
ev("gate clang", 53.98, mx(G.clink(R(), 420, 0.6, 0.6), G.rattle(0.4, R(), 30, heavy=True)), -8)
for k in range(5): ev("bucket of soil", 55.6 + k * 1.25, mx(G.clink(R(), 1500, 0.15), (0.5, G.bubbles(0.2, R(), 30, f_lo=150, f_hi=900))), -17, -0.3)
ev("tower eases back (long creak)", 59.8, G.creak(2.4, R(), 50, 30, G.TIMBER, scale=1.5), -13)
bed("tourists today", 62.7, crowd(4.1, 12, 9), -17)
ev("camera clicks", 63.5, G.clink(R(), 3200, 0.05), -20, 0.5)
bed("crickets (nobody cares)", 66.85, G.crickets(3.7, R()), -20)
sfx = S

# ================= mix =================
def env_db(spans, depth, pre=0.08, post=0.12):
    t = np.arange(0, DUR, 0.01); g = np.zeros_like(t)
    for a, b in spans: g[(t > a - pre) & (t < b + post)] = depth
    k = np.ones(25) / 25; g = np.convolve(g, k, mode="same")
    return np.interp(np.arange(N) / SR, t, g)
spans = [(x["start"], x["end"]) for x in W]
duck = dbg(env_db(spans, -3.0))
mus = music * (dbg(VI - 7.5 - integrated(music)))
mus = mus * duck[None, :]
mix0 = v + mus + sfx
G0 = -15.0 - integrated(mix0)
y = mix0 * dbg(G0)
# peak limiter (look-ahead 3 ms, release 80 ms) to -1.2 dBTP
ceil = dbg(-1.2)
pk = np.max(np.abs(y), axis=0)
win = ns(0.003)
pk = np.maximum.reduce([np.roll(pk, -k) for k in range(0, win, 8)])
g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
a = np.exp(-1 / (0.08 * SR)); gs = g.copy()
for i in range(1, len(gs)): gs[i] = min(g[i], a * gs[i - 1] + (1 - a) * g[i])
y = y * gs[None, :]
for it in range(3):  # re-level after limiting
    y = y * dbg(-15.0 - integrated(y))
    y = np.clip(y, -ceil, ceil)
end = ns(DUR - 0.15); y[:, end:] *= np.linspace(1, 0, N - end)[None, :]
write_wav(os.path.join(HERE, "mix.wav"), y)
for name, x in [("voice", v), ("music", mus), ("sfx", sfx)]: write_wav(os.path.join(HERE, f"stem_{name}.wav"), x * dbg(G0))
with open(os.path.join(HERE, "cues.md"), "w") as fh:
    fh.write(f"# Sound cues: The Tower Saved by a War\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
