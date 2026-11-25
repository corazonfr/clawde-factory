# Sound for "The Warship That Sank Before It Left the Harbour": an original score (our own fanfare melody in G major:
# horn, fife, pizzicato, tuba, vibes, music box), synthesized SFX on the picture's cue times, and the final mix. Uses the synthesis modules of
# the cartoon-3d-short skill (dsp, instruments, sfx_gen). Standard mix: music bed ~7.5 LU under the voice, ducked 3 dB
# under speech; SFX events placed relative to the voice's loudest moment; master -15 LUFS integrated, limiter ceiling
# -1.6 dBFS; 48 kHz stereo, exact length. Picture timing is locked in studio/src/videos/vasa/story.ts (W cues).
# usage: python vasa_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
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
Q = 60 / 108  # quarter note at 108 bpm

def TREM(rate, depth=0.2):
    return lambda t: 1 - depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))

_seed = [5000]
def R():
    _seed[0] += 1
    return rng(_seed[0])

# word cues (seconds), the same ones story.ts uses
C = dict(sweden=1.56, mightiest=2.64, world=3.84, it=4.47, sank=4.6, harbour=5.74, flash=6.3, stockholm=6.4, crowds=8.28,
         shore=9.16, decks=10.82, cannon=11.52, fired=12.36, salute=12.9, sails=13.78, filled=14.08, gust=15.32, tipped=15.66,
         came=16.92, up=17.3, gust2=18.18, tipped2=18.52, further=19.04, water=19.92, poured=20.18, gunports=21.42,
         less=22.4, voyage=24.14, dock=26.28, sank2=27.02, luckily=27.6, tested=28.46, unluckily=30.76, thirty=32.0,
         running=32.64, rocked=35.12, stopped=36.16, then=37.28, anyway=37.86, bookcase=39.16, heavy=40.24, top=41.06,
         stands=42.26, still=43.16, somebody=44.08, leans=44.46, vasa=45.62, above=46.84, below=48.72, inquiry=49.94,
         nobody=50.97, punished=51.52, baltic=52.66, fresh=53.44, worms=54.06, eat=54.56, lay=56.02, mud=56.48,
         years=57.98, lifted=59.02, y1961=59.8, now=61.42, museum=62.42, scandinavia=63.1, ship2=64.2, stay=64.9,
         standing=66.6, y65=67.34, years2=67.84)

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
THEME = [(0, .5, 62), (.5, .5, 67), (1, 1, 71), (2, .5, 69), (2.5, .5, 71), (3, 1, 74), (4, .5, 72), (4.5, .5, 71),
         (5, 1, 69), (6, 2, 67)]
THEME2 = [(0, .5, 71), (.5, .5, 74), (1, 1, 79), (2, .5, 78), (2.5, .5, 76), (3, 1, 74), (4, 1, 72), (5, 1, 69), (6, 2, 71)]
CH = {"G": (43, [62, 67, 71]), "C": (48, [64, 67, 72]), "D": (38, [62, 66, 69]), "Em": (40, [64, 67, 71]), "Am": (45, [64, 69, 72]),
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

# 0-6.3: the hook: a proud fanfare with snare; it collapses into a sinking tuba slide on "it sank"
for (tr, vr) in I.snare_roll(0.0, 0.9, 0.15, 0.55, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
B.add(I.cymbal(0.35, R(), 1.8), 0.95, 0.0)
comp(0.95, ["G", "C", "D"], 0.5, snare=True)
melody(0.95, THEME[:6], 0.55, inst="horn", p=0.1)
for k, m in enumerate([55, 54, 53, 50]): B.add(I.brass(F(m - 12), 0.32, 0.55, R(), "tuba", fall=-2.0 if k < 3 else -9.0), C["sank"] - 0.05 + k * 0.3, 0.0)
B.add(I.timpani(F(31), 0.9, R()), C["flash"] - 0.03)
B.add(I.cymbal(0.45, R(), 2.0), C["flash"] - 0.03, 0.0)
# 6.3-11.9: Stockholm: a bouncy harbour march on pluck + fife
comp(6.35, ["G", "Em", "C", "D", "G", "C"], 0.45, 0.28, snare=True)
melody(6.35, THEME, 0.4, inst="fife", p=0.2)
stinger(C["cannon"] - 0.03, (43, 55, 62, 67), 0.55)
# 11.9-19.7: salute (timpani), sails (glock run), the gusts (slippery tuba wobbles), back up (relieved vibes)
B.add(I.timpani(F(43), 1.0, R()), C["fired"] - 0.02)
for k, m in enumerate([67, 71, 74, 79, 83, 86]): B.add(I.glock(F(m + 12), 0.3, R(), 0.7), C["sails"] - 0.05 + k * 0.07, 0.3)
B.add(I.pad([F(43), F(55), F(62), F(67), F(71)], 1.4, 0.24, R(), att=0.3), 13.7, 0.0)
tick(14.4, 19.5, (74, 71), (43, 38), 0.24)
B.add(I.brass(F(50), 0.7, 0.5, R(), "tuba", fall=-3.0), C["tipped"] - 0.03, 0.0)
for m, t in [(74, 16.9), (79, 17.12), (83, 17.34)]: B.add(I.vibes(F(m), 0.35, R()), t, 0.2)
B.add(I.brass(F(48), 1.1, 0.6, R(), "tuba", fall=-5.0), C["tipped2"] - 0.03, 0.0)
stinger(C["further"] - 0.03, (55, 61, 64, 70), 0.55)
# 19.7-27.6: the sinking: a minor descending line, timpani, a long low fall on "sank"
B.add(I.pad([F(43), F(50), F(55), F(58)], 7.6, 0.28, R(), att=0.5, trem=TREM(3.0)), 19.75, 0.0)
melody(19.8, [(0, 2, 67), (2, 2, 65), (4, 2, 63), (6, 2, 62), (8, 4, 55)], 0.4, inst="horn", p=0.0)
for k in range(5): B.add(I.timpani(F(31), 0.5 + 0.08 * k, R()), 22.4 + k * 2 * Q, 0.0)
B.add(I.brass(F(43), 1.6, 0.7, R(), "tuba", fall=-12.0), C["sank2"] - 0.05, 0.0)
# 27.6-38.55: "luckily" (bright), "unluckily" (sour stab); the running test: a running pizzicato; the stop; "anyway": a shrug
for m, t in [(67, 27.65), (71, 27.85), (74, 28.05)]: B.add(I.vibes(F(m + 12), 0.36, R()), t, 0.2)
stinger(C["unluckily"] - 0.03, (55, 58, 62, 67), 0.55)
for k in range(int((36.1 - 32.6) / (Q / 2))):
    t = 32.6 + k * Q / 2; B.add(I.pluck(F([62, 67, 71, 67][k % 4] + (12 if k % 8 >= 4 else 0)), 0.3, R(), 0.22, 0.8), t, 0.3 if k % 2 else -0.3)
B.add(I.brass(F(50), 0.5, 0.45, R(), "tuba"), 33.0, 0.0); B.add(I.brass(F(43), 0.5, 0.45, R(), "tuba"), 34.1, 0.0); B.add(I.brass(F(50), 0.5, 0.45, R(), "tuba"), 35.2, 0.0)
stinger(C["stopped"] - 0.03, (43, 55, 62, 67), 0.6)
for k, m in enumerate([71, 74]): B.add(I.pluck(F(m), 0.35, R(), 0.3, 0.6), C["anyway"] + 0.05 + k * 0.25, 0.2)
# 38.55-45.55: the bookcase: a curious tick; a sour wobble when it tips; a crash cymbal
tick(38.6, 44.3, (76, 72), (48, 43), 0.24)
melody(38.6, [(0, 1, 72), (1, 1, 76), (2, 2, 79), (4, 1, 77), (5, 1, 76), (6, 2, 74)], 0.34, inst="vibes", p=0.15)
B.add(I.brass(F(47), 0.9, 0.6, R(), "tuba", fall=-6.0), C["leans"] + 0.15, 0.0)
B.add(I.cymbal(0.55, R(), 2.0), C["leans"] + 0.5, 0.0)
# 45.55-49.55: the explanation: a calm pluck comp, theme on vibes
comp(45.6, ["G", "C", "D", "G"], 0.4, 0.26)
melody(45.6, THEME[:6], 0.34, inst="vibes", p=0.2)
# 49.55-51.85: the inquiry: a stern low chord; then the innocent whistle-ish fife on "nobody"
B.add(I.pad([F(38), F(50), F(57), F(62)], 1.4, 0.28, R(), att=0.2), 49.6, 0.0)
melody(C["nobody"] + 0.05, [(0, .5, 74), (.5, .5, 71), (1, .5, 74), (1.5, 1, 79)], 0.36, inst="fife", p=0.2)
# 51.85-58.7: the sea floor: a slow underwater pad and music box; the worm's retreat: a pluck slide
B.add(I.pad([F(40), F(52), F(59), F(64), F(67)], 6.9, 0.28, R(), att=1.0, trem=TREM(1.5, 0.3)), 51.9, 0.0)
for k, m in enumerate([76, 79, 83, 79, 76, 74, 71, 74, 76, 79, 83, 86]): B.add(I.musicbox(F(m), 0.28, R(), 1.4), 52.0 + k * 0.55, 0.3 if k % 2 else -0.3)
for k in range(5): B.add(I.pluck(F(79 - k * 3), 0.3, R(), 0.2, 0.9), C["fresh"] + 0.1 + k * 0.07, -0.3)
# 58.7-61.1: lifted out: a rising brass swell
for k, m in enumerate([43, 47, 50, 55]): B.add(I.brass(F(m), 0.5, 0.5, R(), "horn"), 58.75 + k * 0.3, 0.0)
stinger(C["y1961"] - 0.03, (55, 62, 67, 71), 0.6)
B.add(I.timpani(F(43), 0.9, R()), C["y1961"] - 0.03)
# 61.1-70.5: the museum: the full theme in brass, a cymbal on "standing", a warm last chord
B.add(I.cymbal(0.4, R(), 2.0), 61.1, 0.0)
comp(61.15, ["G", "C", "D", "G", "Em", "C", "D", "G", "C", "D", "G"], 0.5, 0.28, snare=True)
melody(61.15, THEME, 0.5, inst="horn", p=0.1)
melody(61.15 + 8 * Q, THEME2, 0.5, inst="horn", p=0.1)
B.add(I.cymbal(0.45, R(), 2.0, bright=1.1), C["standing"] - 0.03, 0.0)
B.add(I.pad([F(43), F(55), F(62), F(67), F(71)], 2.4, 0.3, R(), att=0.3), 68.0, 0.0)
stinger(68.3, (43, 55, 62, 67, 71), 0.55)
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

# ambience beds
bed("harbour: water lapping, gulls-free breeze, crowd murmur", 0.0, mx(G.water_bed(19.7, R(), 0.8), (0.7, G.breeze(19.7, R(), 0.7, gust=0.2)), (0.6, crowd(19.7, 10, 1))), -24)
bed("sinking: water bed", 19.7, mx(G.water_bed(7.9, R(), 1.0, 1.2), (0.5, crowd(7.9, 8, 2))), -22)
bed("quay: water + rigging creaks", 27.6, mx(G.water_bed(10.95, R(), 0.7), (0.5, G.breeze(10.95, R(), 0.6, gust=0.15))), -25)
bed("room: quiet", 38.55, hum(7.0, 3, 50, 300), -31)
bed("harbour: water", 45.55, G.water_bed(4.0, R(), 0.8), -25)
bed("inquiry room: quiet + quill", 49.55, hum(2.3, 4, 50, 300), -31)
bed("sea floor: underwater room", 51.85, mx(underwater(6.85, 5), (0.5, G.bubbles(6.85, R(), 2.0))), -24)
bed("harbour: water + crane motors", 58.7, mx(G.water_bed(2.4, R(), 1.0), (0.5, hum(2.4, 6, 90, 600))), -23)
bed("museum: hall murmur", 61.1, mx(crowd(9.4, 8, 8), (0.6, hum(9.4, 9, 50, 300))), -26)

ev("crowd cheer at the start", 0.6, cheer(11, 8), -18)
ev("flag flutter", 1.4, G.flag_flutter(2.5, R()), -24, 0.3)
ev("it sank: a big gloop splash", C["sank"] - 0.05, G.splash_big(R()), -10)
ev("whoosh into the flash", 5.85, G.whoosh(0.5, R(), peak=0.4), -11)
ev("crowd cheering on the shore", C["crowds"], cheer(12, 10), -16, 0.1)
ev("cannon trucks creak", 10.4, G.creak(1.0, R(), 90, 140), -20, -0.2)
ev("SALUTE: cannon", C["fired"] - 0.04, cannon(13), -4, 0.2)
ev("sails fill: a canvas snap", C["sails"] + 0.05, mx(G.whoosh(0.4, R(), peak=0.12, f_lo=200, f_hi=1200), (0.8, G.flag_flutter(0.8, R()))), -12, -0.2)
ev("gust 1", C["gust"] - 0.35, G.breeze(1.6, R(), 1.0, gust=0.8, bright=1400), -12, -0.4)
ev("hull creak (tip)", C["tipped"] - 0.05, G.creak(1.0, R(), 70, 120, scale=1.4), -14)
ev("crowd 'ooh'", C["tipped"] + 0.2, mx(G.whoa(R()), (0.7, G.oof(R(), "oof"))), -18, 0.3)
ev("crowd relief 'ahh'", C["up"], G.oof(R(), "oof"), -19, -0.2)
ev("gust 2 (bigger)", C["gust2"] - 0.35, G.breeze(2.0, R(), 1.2, gust=1.0, bright=1600), -9, -0.4)
ev("hull groan (big tip)", C["tipped2"] - 0.05, G.creak(1.6, R(), 50, 90, scale=1.8), -11)
ev("crowd gasp", C["further"], mx(G.whoa(R()), (0.8, G.whoa(R()))), -16, 0.2)
ev("water pours in", C["water"] - 0.1, pour(2.6, 14), -10)
ev("sinking: bubbles and glugs", 22.4, G.bubbles(4.6, R(), 8, f_lo=150, f_hi=900), -14)
ev("timbers groan under water", 23.2, G.creak(2.2, R(), 40, 70, scale=2.0), -16)
ev("she sank: the last gulp", C["sank2"] - 0.1, G.splash_big(R()), -11)
ev("crowd 'oh no'", C["sank2"] + 0.2, mx(G.oof(R(), "oof"), (0.8, G.whoa(R()))), -16)
ev("whoosh into the flashback", 27.4, G.whoosh(0.5, R(), peak=0.35), -16)
ev("thirty men running: footsteps", C["running"] - 0.2, mx(*[(0.6, np.pad(G.stroll_step(R()), (ns(k * 0.16), 0))) for k in range(22)]), -16)
ev("ship rocks: creaks", 34.4, G.creak(1.8, R(), 60, 110, scale=1.5), -15)
ev("STOP: a whistle", C["stopped"] - 0.04, G.clink(R(), 2900, 0.3, 1.0), -18, 0.3)
ev("whoosh into the room", 38.35, G.whoosh(0.5, R(), peak=0.35), -16)
ev("kid's footsteps", 42.1, mx(*[(0.5, np.pad(G.stroll_step(R(), 0.3), (ns(k * 0.4), 0))) for k in range(4)]), -22, -0.3)
ev("bookcase tips: creak", C["leans"] + 0.1, G.creak(0.5, R(), 120, 200), -15, 0.2)
ev("CRASH: bookcase + books", C["leans"] + 0.5, mx(G.wood_crack(R()), (0.8, G.push_thump(R())), (0.6, G.rattle(0.6, R(), 40, heavy=True))), -5, 0.2)
ev("kid 'whoa'", C["leans"] + 0.7, G.whoa(R()), -19, -0.3)
ev("whoosh to the harbour", 45.35, G.whoosh(0.5, R(), peak=0.35), -17)
ev("whoosh into the inquiry", 49.35, G.whoosh(0.5, R(), peak=0.35), -17)
ev("paper shuffle", 50.2, hp(colored(ns(0.4), R(), 0.0), 2500, 2) * np.linspace(1, 0, ns(0.4)), -24, 0.2)
ev("whoosh down to the sea floor", 51.6, G.whoosh(0.7, R(), peak=0.4, f_lo=150, f_hi=900), -14)
ev("the worm turns: a squeaky retreat", C["fresh"] + 0.1, G.swing_squeak(R(), 0.6), -20, 0.3)
ev("cranes: chains groan", 58.75, G.chain_groan(2.2, R(), 0.3, 0.9), -15)
ev("the wreck breaks the surface", C["lifted"] + 0.3, G.splash_big(R()), -11)
ev("whoosh into the museum", 60.9, G.whoosh(0.6, R(), peak=0.35), -17)
ev("museum applause", C["standing"] + 0.2, G.applause(2.5, R(), 20), -20)
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
    fh.write(f"# Sound cues: The Warship That Sank Before It Left the Harbour\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
