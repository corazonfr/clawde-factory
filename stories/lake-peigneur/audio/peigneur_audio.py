# Sound for "The Lake That Went Down the Drain": an original score (our own bayou two-step melody in F major:
# fife, pizzicato, tuba, vibes, glock, horn), synthesized SFX on the picture's cue times, and the final mix. Uses the synthesis modules of
# the cartoon-3d-short skill (dsp, instruments, sfx_gen). Standard mix: music bed ~7.5 LU under the voice, ducked 3 dB
# under speech; SFX events placed relative to the voice's loudest moment; master -15 LUFS integrated, limiter ceiling
# -1.6 dBFS; 48 kHz stereo, exact length. Picture timing is locked in studio/src/videos/peigneur/story.ts (W cues).
# usage: python peigneur_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
import os, sys, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../.claude/skills/cartoon-3d-short/templates/audio"))
from dsp import (SR, ns, rng, lp, hp, pan, place, fades, dbg, integrated, momentary_max, true_peak, read_wav, write_wav,
                 make_ir, convolve_st, colored)
import instruments as I
import sfx_gen as G

FPS, TOTAL = 30, 2115
DUR = TOTAL / FPS
N = ns(DUR)
F = I.m2f
W = json.load(open(os.path.join(HERE, "../voice/words.json")))
Q = 60 / 112  # quarter note at 112 bpm

def TREM(rate, depth=0.2):
    return lambda t: 1 - depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))

_seed = [5000]
def R():
    _seed[0] += 1
    return rng(_seed[0])

# word cues (seconds), the same ones story.ts uses
C = dict(drilled=1.76, hole=2.76, later=5.0, gone=6.08, flash=6.85, boats=10.48, garden=11.24, stuck=17.66, tilt=19.28, water=20.02, spin=20.74, jumped=21.58, down=23.42, barges=24.5, trees=25.5, island2=27.0, punched=28.28, alive=33.48, unluckily=34.4, straw=39.06, sip=40.98, sip2=43.52, bigger=43.92, grew=46.68, rushed=48.0, backwards=51.78, waterfall=55.06, popped=58.72, found=67.04, plug=67.48)

# ================= music =================
class Band:
    def __init__(self):
        self.out = np.zeros((2, N)); self.send = np.zeros((2, N))
    def add(self, x, t, p=0.0, g=1.0, send=0.2):
        if t >= DUR or t < 0: return
        x = pan(x, p) if np.ndim(x) == 1 else x
        place(self.out, x, t, g); place(self.send, x, t, g * send)

B = Band()
# theme (our own), G major, a proud "ship of the line" fanfare that keeps rising: (beat offset in quarters, length, midi)
THEME = [(0, .5, 60), (.5, .5, 65), (1, .5, 69), (1.5, .5, 67), (2, 1, 65), (3, .5, 62), (3.5, .5, 65), (4, 1, 72),
         (5, .5, 70), (5.5, .5, 69), (6, 2, 67)]
THEME2 = [(0, .5, 69), (.5, .5, 72), (1, 1, 77), (2, .5, 76), (2.5, .5, 74), (3, 1, 72), (4, .5, 70), (4.5, .5, 69), (5, 1, 67), (6, 2, 65)]
CH = {"F": (41, [60, 65, 69]), "Bb": (46, [62, 65, 70]), "C7": (36, [58, 64, 67]), "Dm": (38, [62, 65, 69]), "G": (43, [62, 67, 71]), "C": (48, [64, 67, 72]), "D": (38, [62, 66, 69]), "Em": (40, [64, 67, 71]), "Am": (45, [64, 69, 72]),
      "D7": (38, [60, 66, 69]), "Gm": (43, [62, 67, 70]), "Cm": (48, [63, 67, 72]), "Eb": (39, [63, 67, 70]), "Bb": (46, [62, 65, 70])}

def melody(t0, notes, vel=0.6, transpose=0, inst="horn", p=0.2):
    for (b, d, m) in notes:
        t = t0 + b * Q
        if inst == "pluck": B.add(I.pluck(F(m + transpose), vel, R(), dur=0.45, bright=0.7), t, p)
        elif inst == "horn": B.add(I.brass(F(m + transpose), d * Q * 0.9, vel, R(), "horn"), t, p)
        elif inst == "fife": B.add(I.fife(F(m + transpose + 12), d * Q * 0.9, vel, R()), t, p)
        elif inst == "vibes": B.add(I.vibes(F(m + transpose), vel, R(), dur=1.4), t, p)
        else: B.add(I.glock(F(m + transpose), vel, R(), 1.0), t, p)

def comp(t0, chords, vel=0.5, pah=0.3, snare=False):
    for k, c in enumerate(chords):
        lo, tri = CH[c]
        t = t0 + k * 2 * Q
        if t >= DUR: break
        B.add(I.brass(F(lo), 0.22, vel, R(), "tuba", scoop=-25), t, -0.15)
        for j, m in enumerate(tri):
            B.add(I.pluck(F(m), pah, R(), dur=0.3, bright=0.45), t + Q + 0.006 * j, -0.3 + 0.15 * j, 0.7)
        if snare: B.add(I.snare(0.24, R(), 0.18), t + Q, 0.15)

def stinger(t, chord=(55, 62, 67, 71), vel=0.7):
    for m in chord: B.add(I.brass(F(m), 0.5, vel, R(), "stab"), t, 0.0, 0.6)

def tick(t0, t1, hi=(79, 74), lo=(43, 38), vel=0.26):
    for k in range(int((t1 - t0) / Q)):
        t = t0 + k * Q
        B.add(I.pluck(F(hi[0] if k % 2 else hi[1]), vel, R(), 0.2, 0.8), t, 0.35 if k % 2 else -0.35)
        if k % 4 == 0: B.add(I.brass(F(lo[0] if k % 8 == 0 else lo[1]), 0.25, 0.3, R(), "tuba"), t, -0.1)

# 0-6.85: the hook: a jaunty bayou two-step on pluck + fife; on "a few hours later" it drains away down a glugging slide
comp(0.25, ["F", "Bb", "C7", "F"], 0.45, 0.28, snare=True)
melody(0.25, THEME, 0.45, inst="fife", p=0.2)
for k, m in enumerate([65, 63, 60, 57, 53, 48]): B.add(I.brass(F(m - 12), 0.28, 0.5, R(), "tuba", fall=-2.0 if k < 5 else -12.0), C["later"] + 0.35 + k * 0.2, 0.0)
B.add(I.timpani(F(29), 0.9, R()), C["flash"] - 0.03)
B.add(I.cymbal(0.45, R(), 2.0), C["flash"] - 0.03, 0.0)
# 6.85-12.3: the calm lake: lazy pluck comp, the theme on vibes, a little glock sparkle on "garden island"
comp(6.9, ["F", "Dm", "Bb", "C7", "F", "Bb"], 0.4, 0.26)
melody(6.9, THEME, 0.36, inst="vibes", p=0.2)
for k, m in enumerate([77, 81, 84, 89]): B.add(I.glock(F(m), 0.28, R(), 0.8), C["garden"] + k * 0.08, 0.3)
# 12.3-15.7: down into the salt mine: a low, hollow pad and a deep tick
B.add(I.pad([F(38), F(45), F(50), F(53)], 3.5, 0.26, R(), att=0.4, trem=TREM(2.0, 0.25)), 12.3, 0.0)
tick(12.4, 15.6, (62, 57), (38, 33), 0.22)
# 15.7-22.7: stuck, tilt, spin, run: tension rising, chromatic tuba steps, a racing pluck for the run
B.add(I.brass(F(41), 0.5, 0.5, R(), "tuba"), C["stuck"] - 0.03, 0.0)
stinger(C["stuck"] - 0.03, (41, 47, 53, 56), 0.5)
B.add(I.brass(F(40), 0.9, 0.55, R(), "tuba", fall=-4.0), C["tilt"] - 0.03, 0.0)
B.add(I.pad([F(38), F(44), F(50), F(56)], 3.4, 0.28, R(), att=0.3, trem=TREM(5.0, 0.4)), 19.5, 0.0)
for k in range(int((22.7 - 21.3) / (Q / 2))):
    t = 21.3 + k * Q / 2; B.add(I.pluck(F([62, 65, 69, 65][k % 4] + (12 if k % 8 >= 4 else 0)), 0.3, R(), 0.2, 0.8), t, 0.3 if k % 2 else -0.3)
# 22.7-27.7: everything goes down: a descending minor line and four falling tuba notes on rig, barges, trees, island
B.add(I.pad([F(38), F(45), F(50), F(53)], 5.0, 0.3, R(), att=0.4, trem=TREM(3.0)), 22.7, 0.0)
melody(22.75, [(0, 2, 69), (2, 2, 67), (4, 2, 65), (6, 2, 64), (8, 2, 62)], 0.38, inst="horn", p=0.0)
for w, m in [("down", 45), ("barges", 43), ("trees", 41), ("island2", 38)]: B.add(I.brass(F(m), 0.8, 0.55, R(), "tuba", fall=-7.0), C[w] - 0.04, 0.0)
# 27.7-32.1: into the mine: timpani hits and a long low swell
for k in range(4): B.add(I.timpani(F(29), 0.55 + 0.1 * k, R()), C["punched"] - 0.03 + k * 2 * Q, 0.0)
B.add(I.pad([F(26), F(38), F(45), F(50)], 4.3, 0.3, R(), att=0.6), 27.8, 0.0)
# 32.1-36.4: "luckily" (bright vibes), "unluckily" (sour stab, a bubbly underwater music box)
for m, t in [(65, 32.25), (69, 32.45), (72, 32.65), (77, 32.85)]: B.add(I.vibes(F(m + 12), 0.36, R()), t, 0.2)
stinger(C["unluckily"] - 0.03, (50, 53, 56, 62), 0.55)
for k, m in enumerate([74, 77, 81, 77, 74, 72]): B.add(I.musicbox(F(m), 0.26, R(), 1.2), 34.6 + k * 0.3, 0.3 if k % 2 else -0.3)
# 36.4-44.4: the sugar straw: a curious kitchen tick, the theme on music box, slurps get a rising pluck
tick(36.5, 44.3, (72, 69), (41, 36), 0.22)
melody(37.6, THEME, 0.3, inst="musicbox", p=0.15)
for t0 in (C["sip"], C["sip2"]):
    for k, m in enumerate([65, 69, 72]): B.add(I.pluck(F(m + 12), 0.3, R(), 0.2, 0.9), t0 + 0.05 + k * 0.06, -0.2)
# 44.4-49.2: the hole grows: the pad swells, timpani gets faster
B.add(I.pad([F(38), F(45), F(50), F(53), F(57)], 4.8, 0.3, R(), att=0.8, trem=TREM(4.0, 0.35)), 44.4, 0.0)
for k, t in enumerate([44.6, 45.6, 46.4, 47.0, 47.5, 47.9, 48.2, 48.45]): B.add(I.timpani(F(29 + (k // 3) * 2), 0.45 + 0.05 * k, R()), t, 0.0)
# 49.2-56.5: the canal runs backwards (a theme played upside down), the waterfall (a big rising swell and cymbal)
comp(49.25, ["Dm", "Bb", "C7", "Dm"], 0.4, 0.26)
melody(49.25, [(0, .5, 72), (.5, .5, 69), (1, 1, 65), (2, .5, 67), (2.5, .5, 65), (3, 1, 62), (4, 1, 64), (5, 1, 60)], 0.36, inst="fife", p=0.2)
B.add(I.brass(F(48), 0.6, 0.45, R(), "tuba", fall=-5.0), C["backwards"] - 0.03, 0.0)
for k, m in enumerate([41, 45, 48, 53, 57]): B.add(I.brass(F(m), 0.45, 0.5, R(), "horn"), 53.7 + k * 0.25, 0.0)
stinger(C["waterfall"] - 0.03, (41, 53, 57, 60, 65), 0.6)
B.add(I.cymbal(0.45, R(), 2.4, bright=1.1), C["waterfall"] - 0.03, 0.0)
# 56.5-60.4: barges pop up like corks: pizzicato "pops" (high plucks) on each barge
comp(56.55, ["F", "C7", "F", "Bb"], 0.42, 0.28)
for k in range(5): B.add(I.pluck(F(77 + [0, 4, 7, 5, 9][k]), 0.42, R(), 0.25, 1.0), C["popped"] - 0.05 + k * 0.18 + 0.35, 0.3 if k % 2 else -0.3)
# 60.4-70.5: the end: the full theme warm and slow in brass, then the punchline: a little drain glug and a last chord
B.add(I.cymbal(0.35, R(), 2.0), 60.4, 0.0)
comp(60.45, ["F", "Dm", "Bb", "C7", "F", "Bb", "C7"], 0.42, 0.26)
melody(60.45, THEME, 0.45, inst="horn", p=0.1)
melody(60.45 + 8 * Q, THEME2, 0.42, inst="horn", p=0.1)
for k, m in enumerate([60, 57, 53]): B.add(I.brass(F(m - 12), 0.25, 0.45, R(), "tuba", fall=-3.0), C["plug"] - 0.05 + k * 0.16, 0.0)
B.add(I.pad([F(41), F(53), F(60), F(65), F(69)], 2.0, 0.3, R(), att=0.2), 68.3, 0.0)
stinger(68.3, (41, 53, 60, 65, 69), 0.55)
B.add(I.triangle(0.5, R(), 1.6), 68.3, 0.3)
music = B.out + 0.5 * convolve_st(B.send.mean(0), make_ir(1.5, 5, pre=0.015))
music = hp(music, 30, 2)

# ================= SFX =================
S = np.zeros((2, N))
EV = []
def ev(name, t, x, rel_db, p=0.0):
    """event x placed at t, peaking rel_db under the voice's loudest moment"""
    if t >= DUR: return
    x = pan(x, p) if np.ndim(x) == 1 else x
    m = momentary_max(x)
    if np.isfinite(m): x = x * dbg(VREF + rel_db - m)
    place(S, x, t); EV.append((t, name, rel_db))
def bed(name, t, x, rel_db):
    x = np.stack([x, x]) if np.ndim(x) == 1 else x
    m = integrated(x)
    if np.isfinite(m): x = x * dbg(VREF + rel_db - m)
    place(S, fades(x, 0.3, 0.5), t); EV.append((t, name, rel_db))
voice, _sr = read_wav(os.path.join(HERE, "../voice/voice.wav"))
if voice.ndim == 1: voice = voice[None, :]
if _sr != SR:
    import subprocess
    tmp = os.path.join(HERE, "_voice48k.wav")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", os.path.join(HERE, "../voice/voice.wav"), "-ar", str(SR), tmp], check=True)
    voice, _sr = read_wav(tmp); os.remove(tmp)
    if voice.ndim == 1: voice = voice[None, :]
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

def cheer(seed, n=8):
    r = rng(seed)
    return mx(*[(r.uniform(0.5, 1.0), pan(G.hurrah(r, r.uniform(110, 230), r.uniform(1.0, 1.2)), r.uniform(-0.7, 0.7))) for _ in range(n)])

def hum(dur, seed, f0=60.0, bright=400):
    """a quiet room tone: a low tone plus soft air"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    return 0.3 * np.sin(2 * np.pi * f0 * t) + lp(colored(n, r, -1.0), bright, 2)

def cannon(seed):
    """a salute gun: a deep boom with a crack and a rolling tail"""
    r = rng(seed); n = ns(2.2); t = np.arange(n) / SR
    boom = lp(colored(n, r, -1.5), 180, 3) * np.exp(-t / 0.45) * 3.0
    crack = hp(colored(n, r, 0.0), 900, 2) * np.exp(-t / 0.05)
    x = boom + crack
    return np.stack([x, np.roll(x, 1400)])

def underwater(dur, seed):
    """low, muffled water room with slow movement"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    return lp(colored(n, r, -1.6), 260, 3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.2 * t))

def pour(dur, seed):
    """water rushing in: a broad hiss with gurgles"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    x = lp(hp(colored(n, r, -0.5), 200, 2), 2200, 2) * np.minimum(1, t / 0.3)
    return mx(x, (0.6, G.bubbles(dur, r, 18)))

def drill(dur, seed):
    """a diesel drill rig: low engine chug with a grinding whine"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    chug = lp(colored(n, r, -1.2), 220, 2) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 7.5 * t)))
    whine = 0.15 * np.sin(2 * np.pi * (310 + 6 * np.sin(2 * np.pi * 0.7 * t)) * t)
    return chug + whine

def clunk(seed):
    """the drill jams: a metal clank and a stall"""
    r = rng(seed); n = ns(1.0); t = np.arange(n) / SR
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(410, 0.25), (930, 0.15), (1650, 0.08)])
    hit = lp(colored(n, r, -0.5), 1500, 2) * np.exp(-t / 0.03) * 2
    return ring * 0.5 + hit

def roar(dur, seed):
    """a whirlpool / waterfall roar: broad low rumble plus hiss"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    return lp(colored(n, r, -1.0), 900, 2) * 1.2 + 0.4 * hp(lp(colored(n, r, 0.0), 5000, 2), 1500, 2)

def slurp(seed):
    r = rng(seed)
    return mx(G.bubbles(0.5, r, 22, f_lo=300, f_hi=1400), (0.4, lp(colored(ns(0.5), r, -0.5), 1200, 2) * np.linspace(1, 0, ns(0.5))))

def pop(seed):
    """a cork-like pop plus a splash"""
    r = rng(seed); n = ns(0.25); t = np.arange(n) / SR
    p = np.sin(2 * np.pi * (520 - 900 * t) * t) * np.exp(-t / 0.04)
    return mx(p, (0.7, G.splash_big(r)))

# ambience beds
bed("lake: lapping water, breeze, birds-free", 0.0, mx(G.water_bed(5.4, R(), 0.6), (0.6, G.breeze(5.4, R(), 0.6, gust=0.2))), -25)
bed("rig: drill engine", 0.0, drill(5.4, 21), -27)
bed("drained crater: wind", 5.4, G.breeze(1.45, R(), 0.8, gust=0.3), -26)
bed("lake: calm water", 6.85, mx(G.water_bed(5.45, R(), 0.6), (0.6, G.breeze(5.45, R(), 0.5, gust=0.1))), -26)
bed("salt mine: hollow room tone, distant machine", 12.3, mx(hum(3.4, 3, 55, 300), (0.5, drill(3.4, 22))), -28)
bed("rig: drill engine", 15.7, mx(drill(3.8, 23), (0.5, G.water_bed(3.8, R(), 0.6))), -24)
bed("whirlpool roar", 19.5, roar(8.2, 24), -20)
bed("mine: flood roar", 27.7, mx(roar(4.4, 25), (0.6, G.bubbles(4.4, R(), 10))), -19)
bed("shaft head: open air", 32.1, G.breeze(2.25, R(), 0.6, gust=0.2), -27)
bed("flooded mine: underwater", 34.35, mx(underwater(2.05, 5), (0.5, G.bubbles(2.05, R(), 3.0))), -23)
bed("kitchen: quiet room", 36.4, hum(8.0, 4, 50, 300), -32)
bed("whirlpool roar (bigger)", 44.4, roar(4.8, 26), -18)
bed("canal: flowing water", 49.2, mx(G.water_bed(4.5, R(), 1.0, 1.2), (0.5, G.breeze(4.5, R(), 0.5))), -24)
bed("waterfall roar", 53.7, roar(2.8, 27), -17)
bed("lake: water", 56.5, G.water_bed(3.9, R(), 0.8), -25)
bed("evening lake: calm water, breeze", 60.4, mx(G.water_bed(10.1, R(), 0.5), (0.6, G.breeze(10.1, R(), 0.5, gust=0.1))), -27)

ev("drill bites: a low grind", C["drilled"], mx(drill(1.2, 30), (0.5, G.creak(1.0, R(), 70, 120))), -17)
ev("the lake drains: a long glug", C["later"] + 0.3, mx(G.bubbles(1.4, R(), 12, f_lo=120, f_hi=600), (0.6, roar(1.4, 31))), -12)
ev("whoosh into the flash", 6.4, G.whoosh(0.5, R(), peak=0.4), -11)
ev("fishing boat: a bell clink", C["boats"], G.clink(R(), 1900, 0.4, 1.4), -22, 0.3)
ev("whoosh down into the mine", 12.1, G.whoosh(0.7, R(), peak=0.4, f_lo=150, f_hi=900), -14)
ev("pick strikes on salt", 13.0, mx(*[(0.6, np.pad(G.clink(R(), 2400, 0.25, 0.4), (ns(k * 0.72), 0))) for k in range(4)]), -19, -0.2)
ev("whoosh up to the rig", 15.5, G.whoosh(0.5, R(), peak=0.35), -16)
ev("DRILL STUCK: clank + stall", C["stuck"] - 0.04, clunk(32), -7)
ev("rig groans as it tilts", C["tilt"] - 0.08, G.creak(1.4, R(), 45, 80, scale=1.8), -10)
ev("crew 'whoa'", C["tilt"] + 0.2, G.whoa(R()), -18, 0.2)
ev("water starts to swirl", C["water"] - 0.1, G.whoosh(1.2, R(), peak=0.6, f_lo=120, f_hi=700), -12)
ev("crew running: footsteps", 21.3, mx(*[(0.6, np.pad(G.stroll_step(R()), (ns(k * 0.17), 0))) for k in range(8)]), -16)
ev("crew shouting", 21.5, mx(G.whoa(R()), (0.8, G.oof(R(), "oof"))), -17, -0.2)
ev("THE RIG GOES DOWN: groan + splash", C["down"] - 0.1, mx(G.creak(1.6, R(), 40, 70, scale=2.0), (1.0, G.splash_big(R()))), -6)
ev("barges: clanks + gulps", C["barges"] - 0.1, mx(G.rattle(0.6, R(), 30, heavy=True), (0.8, G.splash_big(R()))), -9)
ev("trees: crack + swish", C["trees"] - 0.1, mx(G.wood_crack(R()), (0.7, G.whoosh(0.6, R(), peak=0.3))), -9)
ev("the island slides in: rumble", C["island2"] - 0.2, mx(roar(1.6, 33), (0.7, G.push_thump(R()))), -8)
ev("whoosh down to the mine", 27.5, G.whoosh(0.6, R(), peak=0.4, f_lo=150, f_hi=900), -14)
ev("BREAKTHROUGH: the roof bursts", C["punched"] - 0.05, mx(G.wood_crack(R()), (1.0, G.splash_big(R()))), -6)
ev("miners running", 27.8, mx(*[(0.5, np.pad(G.stroll_step(R()), (ns(k * 0.2), 0))) for k in range(10)]), -19, -0.3)
ev("whoosh up into daylight", 31.9, G.whoosh(0.5, R(), peak=0.35), -16)
ev("miners cheer", C["alive"] - 0.1, cheer(34, 6), -17)
ev("drips", 32.4, mx(*[(0.4, np.pad(G.clink(R(), 3200, 0.06, 0.15), (ns(k * 0.31), 0))) for k in range(6)]), -26, 0.3)
ev("whoosh down, glug", 34.15, mx(G.whoosh(0.5, R(), peak=0.35, f_lo=150, f_hi=800), (0.6, G.bubbles(0.8, R(), 10))), -15)
ev("whoosh into the kitchen", 36.2, G.whoosh(0.5, R(), peak=0.35), -16)
ev("sip 1: slurp", C["sip"] + 0.05, slurp(35), -15)
ev("sip 2: a bigger slurp", C["sip2"] + 0.05, slurp(36), -11)
ev("whoosh back to the lake", 44.2, G.whoosh(0.5, R(), peak=0.4), -14)
ev("the hole widens: rumble", C["grew"] - 0.1, mx(roar(1.4, 37), (0.7, G.push_thump(R()))), -11)
ev("the water rushes faster", C["rushed"] - 0.1, G.whoosh(1.4, R(), peak=0.7, f_lo=100, f_hi=800), -10)
ev("whoosh to the canal", 49.0, G.whoosh(0.5, R(), peak=0.35), -16)
ev("canal reverses: a slosh", C["backwards"] - 0.2, mx(G.whoosh(0.8, R(), peak=0.4, f_lo=150, f_hi=900), (0.6, G.bubbles(0.8, R(), 8))), -13)
ev("fisherman 'huh'", C["backwards"] + 0.4, G.oof(R(), "oof"), -21, 0.3)
ev("WATERFALL", C["waterfall"] - 0.05, mx(roar(2.0, 38), (0.6, G.splash_big(R()))), -8)
ev("whoosh to the barges", 56.3, G.whoosh(0.5, R(), peak=0.35), -16)
for k in range(5): ev(f"barge {k + 1} pops up", C["popped"] - 0.05 + k * 0.18 + 0.35, pop(40 + k), -11 + (k % 2), 0.3 if k % 2 else -0.3)
ev("whoosh to the evening lake", 60.2, G.whoosh(0.6, R(), peak=0.35), -17)
ev("plughole: a little drain gurgle", C["plug"] - 0.05, G.bubbles(1.2, R(), 14, f_lo=200, f_hi=900), -13)
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
# peak limiter (look-ahead 3 ms, release 80 ms) to -1.6 dBFS
ceil = dbg(-1.6)
pk = np.max(np.abs(y), axis=0)
win = ns(0.003)
pk0 = pk.copy()
for k in range(8, win, 8): np.maximum(pk, np.roll(pk0, -k), out=pk)
del pk0
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
    fh.write(f"# Sound cues: The Lake That Went Down the Drain\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
