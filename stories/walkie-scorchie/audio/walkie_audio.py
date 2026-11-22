# Sound for "The Skyscraper That Melted a Car": an original pizzicato + brass score (our own melody), synthesized SFX
# on the picture's cue times, and the final mix. Uses the synthesis modules of the cartoon-3d-short skill (dsp,
# instruments, sfx_gen). Standard mix: music bed ~7.5 LU under the voice, ducked 3 dB under speech; SFX events placed
# relative to the voice's loudest moment; master -15 LUFS integrated, true peak <= -1 dBTP; 48 kHz stereo, exact length.
# Picture timing is locked in studio/src/videos/walkie/story.ts (W cues); change both together.
# usage: python walkie_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
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
Q = 60 / 116  # quarter note at 116 bpm

def TREM(rate, depth=0.2):
    return lambda t: 1 - depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))

_seed = [2000]
def R():
    _seed[0] += 1
    return rng(_seed[0])

# word cues (seconds) from words.json, the same ones story.ts uses
C = dict(melted0=2.16, london=4.14, shiny=5.24, walkie=8.72, sunny=10.2, jaguar=12.0, hour=13.76, melted=15.06, badge=16.5,
         scorched=18.18, cracked=19.72, fried=22.44, ate=24.18, lunch=24.86, celsius=27.74, newspapers=28.52, scorchie=29.8,
         luckily=30.98, londonB=33.52, unluckily=34.24, sunniest=35.5, bounces=37.7, curves=40.16, spoon=41.98, spot=45.56,
         sun=47.66, paid=48.62, pounds=50.12, bolted=51.86, cut=56.86, money=57.6, knew=58.9, hot=61.48, odd=62.37,
         vegas=64.46, scorching=65.52, mistake=67.92, sequel=68.78)

# ================= music =================
class Band:
    def __init__(self):
        self.out = np.zeros((2, N)); self.send = np.zeros((2, N))
    def add(self, x, t, p=0.0, g=1.0, send=0.15):
        if t >= DUR: return
        x = pan(x, p) if np.ndim(x) == 1 else x
        place(self.out, x, t, g); place(self.send, x, t, g * send)

B = Band()
# theme (our own), Bb major, 2 bars of 4/4: (beat offset in quarters, length in quarters, midi)
THEME = [(0, .5, 70), (.5, .5, 72), (1, 1, 74), (2, .5, 77), (2.5, .5, 74), (3, 1, 72),
         (4, .5, 70), (4.5, .5, 67), (5, .5, 70), (5.5, .5, 72), (6, 1, 74), (7, 1, 70)]
THEME2 = [(0, .5, 77), (.5, .5, 75), (1, 1, 74), (2, .5, 72), (2.5, .5, 74), (3, 1, 75),
          (4, .5, 79), (4.5, .5, 77), (5, .5, 75), (5.5, .5, 72), (6, 2, 70)]
CH = {"Bb": (34, [58, 62, 65]), "F": (41, [57, 60, 65]), "Eb": (39, [58, 63, 67]), "Gm": (43, [58, 62, 67]),
      "Cm": (36, [55, 60, 63]), "F7": (41, [57, 63, 65]), "D": (38, [57, 62, 66]), "Ab": (44, [56, 60, 63])}

def melody(t0, notes, vel=0.6, transpose=0, inst="pluck", p=0.25):
    for (b, d, m) in notes:
        t = t0 + b * Q
        if inst == "pluck": B.add(I.pluck(F(m + transpose), vel, R(), dur=0.45, bright=0.7), t, p)
        elif inst == "horn": B.add(I.brass(F(m + transpose), d * Q * 0.9, vel, R(), "horn"), t, p)
        elif inst == "vibes": B.add(I.vibes(F(m + transpose), vel, R(), dur=1.2), t, p)
        else: B.add(I.glock(F(m + transpose), vel, R(), 1.0), t, p)

def march(t0, chords, vel=0.55, pah=0.32, snare=True):
    for k, c in enumerate(chords):  # one chord per half bar
        lo, tri = CH[c]
        t = t0 + k * 2 * Q
        B.add(I.brass(F(lo), 0.22, vel, R(), "tuba", scoop=-25), t, -0.15)
        for j, m in enumerate(tri):
            B.add(I.pluck(F(m), pah, R(), dur=0.3, bright=0.45), t + Q + 0.006 * j, -0.3 + 0.15 * j, 0.7)
        if snare: B.add(I.snare(0.28, R(), 0.18), t + Q, 0.15)

def theme_block(t0, bars=4, vel=0.6, bright=False, inst="pluck"):
    seq = ["Bb", "F", "Bb", "F", "Eb", "Bb", "F", "Bb"][: bars * 2]
    march(t0, seq, 0.55 + (0.08 if bright else 0))
    melody(t0, THEME, vel, inst=inst)
    if bars >= 4: melody(t0 + 8 * Q, THEME2, vel, inst=inst)
    if bright:
        for k in range(bars): B.add(I.glock(F(82 + (k % 2) * 3), 0.32, R()), t0 + k * 4 * Q + 3 * Q, 0.4)

def stinger(t, chord=(58, 62, 65, 70), vel=0.7):
    for m in chord: B.add(I.brass(F(m), 0.5, vel, R(), "stab"), t, 0.0, 0.6)

# 0-4: the hook. A shimmering chord, a tuba droop as the mirror melts, a hit into the flash
B.add(I.cymbal(0.35, R(), 2.6), 0.05, 0.0, 0.5)
B.add(I.pad([F(58), F(62), F(65), F(69)], 2.1, 0.3, R(), att=0.3, trem=TREM(6.0)), 0.0, 0.0)
for k in range(6): B.add(I.vibes(F([82, 77, 74, 70, 74, 77][k]), 0.35, R()), 0.1 + k * 0.28, 0.3)
B.add(I.brass(F(46), 0.9, 0.7, R(), "tuba", fall=-6.0), C["melted0"] - 0.05, 0.0)
B.add(I.timpani(F(34), 0.8, R()), 4.03)
# 4-9.7: London, proud: the theme
theme_block(4.08, bars=3, vel=0.62, bright=True)
# 9.75-13.4: a jaunty walk to the car
for k in range(7):
    t = 9.8 + k * 2 * Q
    lo, tri = CH[["Bb", "Gm", "Cm", "F", "Bb", "Gm", "F"][k]]
    B.add(I.pluck(F(lo + 12), 0.5, R(), 0.35, 0.4), t, -0.2)
    B.add(I.pluck(F(tri[(k % 3)] + 12), 0.4, R(), 0.3, 0.7), t + Q, 0.25)
# 13.45: an hour later: a time-passing glock run, then the heat: a slow, sticky low figure
for k in range(10): B.add(I.glock(F(70 + (k % 5) * 3 + 12 * (k // 5)), 0.28, R(), 0.6), 13.3 + k * 0.045, 0.3)
B.add(I.pad([F(51), F(58), F(62)], 4.2, 0.28, R(), att=0.8, trem=TREM(4.5)), 13.6, 0.0)
for k in range(8): B.add(I.brass(F([46, 45, 44, 43, 46, 45, 44, 41][k]), 0.4, 0.4, R(), "tuba"), 13.7 + k * 0.48, -0.1)
B.add(I.timpani(F(34), 0.9, R()), C["melted"] - 0.02)
B.add(I.brass(F(41), 1.0, 0.65, R(), "tuba", fall=-8.0), C["melted"], 0.0)
B.add(I.glock(F(79), 0.4, R(), 1.0), C["badge"], 0.3); B.add(I.glock(F(73), 0.4, R(), 1.0), C["badge"] + 0.2, 0.3)
# 17-25: doormat, crack, the egg: a cheeky pizzicato vamp over the heat pad
B.add(I.pad([F(50), F(57), F(62)], 8.0, 0.22, R(), att=1.0, trem=TREM(4.5)), 17.1, 0.0)
for k in range(15):
    t = 17.2 + k * Q
    B.add(I.pluck(F([46, 53, 50, 53][k % 4]), 0.42, R(), 0.25, 0.5), t, -0.2)
    if k % 2: B.add(I.brush(0.3, R()), t, 0.2)
stinger(C["scorched"] - 0.02, (57, 60, 63, 69), 0.45)
B.add(I.timpani(F(38), 0.7, R()), C["cracked"] - 0.02)
for k in range(9): B.add(I.pluck(F([70, 72, 74, 77, 74, 72, 70, 74, 77][k]), 0.42, R(), 0.35, 0.75), 20.7 + k * Q * 0.5, 0.3)
B.add(I.glock(F(82), 0.45, R(), 1.3), C["lunch"] + 0.15, 0.3)
B.add(I.glock(F(86), 0.45, R(), 1.3), C["lunch"] + 0.3, 0.3)
# 25.4-28.3: the thermometer: a rising run that pops
for k in range(16): B.add(I.pluck(F(58 + k * 1.5), 0.35 + 0.02 * k, R(), 0.2, 0.8), 25.7 + 2.0 * (k / 16) ** 0.8, 0.2)
B.add(I.cymbal(0.4, R(), 1.4, bright=1.3), C["celsius"] - 0.03, 0.0)
# 28.3-30.9: the newspapers: a brass headline chord on "Walkie-Scorchie"
for (tr, vr) in I.snare_roll(28.6, C["scorchie"] - 0.05, 0.15, 0.6, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
stinger(C["scorchie"] - 0.02, (58, 62, 65, 70), 0.75)
B.add(I.cymbal(0.5, R(), 2.0), C["scorchie"] - 0.02, 0.0)
# 30.9-36.9: luckily (cosy major, a gentle grey pad) / unluckily (minor stab, then a blazing crash)
for m, t in [(70, 31.0), (74, 31.4), (77, 31.8), (74, 32.6), (72, 33.0), (70, 33.5)]: B.add(I.vibes(F(m), 0.4, R()), t, 0.2)
B.add(I.pad([F(46), F(53), F(58), F(62)], 2.6, 0.32, R(), att=0.6), 31.6, 0.0)
stinger(C["unluckily"] - 0.02, (55, 58, 62, 67), 0.55)
for k in range(5): B.add(I.pluck(F(67 + k * 2), 0.4, R(), 0.3, 0.8), 34.6 + k * 0.17, 0.2)
B.add(I.cymbal(0.7, R(), 2.4, bright=1.2), C["sunniest"] - 0.03, 0.0)
B.add(I.timpani(F(34), 1.0, R()), C["sunniest"] - 0.03)
stinger(C["sunniest"] - 0.03, (58, 62, 65, 70, 74), 0.8)
# 36.9-48.2: the explanation: a curious tick-tock, the spoon's ding, then a swelling build to "the sun"
for k in range(int((40.8 - 36.95) / Q)):
    t = 36.95 + k * Q
    B.add(I.pluck(F(82 if k % 2 else 77), 0.3, R(), 0.2, 0.8), t, 0.35 if k % 2 else -0.35)
    if k % 4 == 0: B.add(I.brass(F(46 if k % 8 == 0 else 41), 0.25, 0.35, R(), "tuba"), t, -0.1)
B.add(I.glock(F(89), 0.4, R(), 0.9), C["bounces"], 0.4)
for k in range(6): B.add(I.vibes(F(70 + k * 2), 0.35, R()), C["curves"] - 0.1 + k * 0.1, 0.2)
melody(40.95, [(0, .5, 77), (.5, .5, 79), (1, 1, 82), (2, .5, 79), (2.5, .5, 77), (3, 1, 74)], 0.4, inst="glock")
B.add(I.triangle(0.5, R(), 1.6), C["spoon"] - 0.02, 0.3)
B.add(I.pad([F(46), F(53), F(58), F(62)], 4.6, 0.25, R(), att=3.2, rel=0.4), 43.4, 0.0)
for (tr, vr) in I.snare_roll(45.0, C["sun"] - 0.05, 0.1, 0.75, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
B.add(I.cymbal(0.75, R(), 2.4, bright=1.3), C["sun"] - 0.03, 0.0)
stinger(C["sun"] - 0.03, (58, 65, 70, 74, 77), 0.85)
# 48.2-57.9: the fix: a brisk march, a cash-register ding, scissors, coins
march(48.25, ["Bb", "F", "Bb", "F", "Eb", "Bb", "F", "Bb", "Bb", "F", "Bb", "F", "Eb", "Bb", "F", "Bb", "Eb", "F"], 0.5)
melody(51.35, THEME, 0.55, inst="horn", p=0.15)
melody(51.35 + 8 * Q, THEME2[:6], 0.55, inst="horn", p=0.15)
for m, dt in [(82, 0.0), (86, 0.12)]: B.add(I.glock(F(m), 0.5, R(), 1.4), C["pounds"] + dt, 0.3)
stinger(C["cut"] - 0.02, (57, 60, 63), 0.45)
for k, m in enumerate([86, 84, 82, 79, 77]): B.add(I.glock(F(m), 0.38, R(), 0.6), C["money"] + k * 0.06, 0.3)
# 57.9-62.3: the architect: the theme, small and polite on vibes; a sad tuba on "so hot"
melody(58.0, THEME, 0.42, inst="vibes", p=0.1)
B.add(I.brass(F(46), 0.9, 0.55, R(), "tuba", fall=-4.0), C["hot"] + 0.02, 0.0)
# 62.3-67.15: Las Vegas: a lazy lounge swing (vibes over a walking bass with brushes)
for k in range(int((67.1 - 62.4) / Q)):
    t = 62.4 + k * Q
    B.add(I.pluck(F([39, 43, 46, 48, 44, 48, 51, 46][k % 8]), 0.5, R(), 0.45, 0.35), t, -0.25)
    B.add(I.brush(0.3 if k % 2 else 0.22, R(), swish=(k % 2 == 0)), t, 0.25)
for (b, d, m) in [(0, 1.5, 75), (1.5, .5, 79), (2, 2, 82), (4, 1.5, 80), (5.5, .5, 79), (6, 2, 75)]:
    B.add(I.vibes(F(m), 0.38, R(), dur=1.6), 62.45 + b * Q, 0.3)
stinger(C["scorching"] - 0.03, (56, 60, 63, 68), 0.6)
# 67.15-70.5: back in London, golden: the theme in full brass; a final "ding" on the sequel
B.add(I.cymbal(0.45, R(), 2.2), 67.15, 0.0)
march(67.2, ["Bb", "F", "Eb", "Bb", "F", "Bb"], 0.6)
melody(67.2, THEME[:9], 0.6, inst="horn", p=0.1)
stinger(C["sequel"] - 0.02, (58, 62, 65, 70, 74), 0.7)
B.add(I.triangle(0.6, R(), 1.8), C["sequel"] - 0.02, 0.3)
music = B.out + 0.5 * convolve_st(B.send.mean(0), make_ir(1.3, 5, pre=0.015))
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

def traffic(dur, seed):
    """distant City traffic: low rumble with slow swells"""
    r = rng(seed)
    x = lp(colored(ns(dur), r, -1.0), 260, 2)
    t = np.arange(ns(dur)) / SR
    sw = 0.55 + 0.45 * np.sin(2 * np.pi * 0.07 * t + r.uniform(0, 6)) * np.sin(2 * np.pi * 0.031 * t + 1)
    return np.stack([x * sw, np.roll(x, 2400) * sw])

def sizzle(dur, seed, rate=70):
    """hot-pan / hot-metal sizzle: dense tiny high bubbles"""
    return hp(G.bubbles(dur, rng(seed), rate, f_lo=2500, f_hi=7500, tau=(0.002, 0.008)), 1800, 2)

def beep(t0, seed):
    """car key fob: two short electronic chirps"""
    r = rng(seed); out = np.zeros(ns(0.32)); tt = np.arange(ns(0.09)) / SR
    for k in range(2):
        b = np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 30) * 0.6
        out[ns(0.17 * k): ns(0.17 * k) + len(b)] += b
    return out

# ambience beds
bed("City street: traffic + breeze", 0.0, mx(traffic(40.9, 1), (0.6, G.breeze(40.9, R(), 0.7))), -25)
bed("City street: murmur", 4.05, crowd(5.7, 8, 3), -24)
bed("park: birds + breeze", 40.85, mx(G.bird_chirps(2.8, R(), 0.6), (0.6, G.breeze(2.8, R(), 0.6))), -21)
bed("City street again", 43.5, mx(traffic(18.9, 2), (0.6, G.breeze(18.9, R(), 0.7))), -26)
bed("Las Vegas pool: water + guests", 62.25, mx(G.water_bed(4.9, R(), 0.5), (0.7, crowd(4.9, 8, 7))), -23)
bed("London golden: traffic", 67.1, traffic(3.4, 3), -26)
# heat: a quiet sizzle under the hot-spot shots
bed("heat sizzle (hook)", 0.3, sizzle(3.7, 11, 40), -27)
bed("heat sizzle (street)", 13.5, sizzle(17.3, 12, 40), -28)

ev("whoosh into the flash", 3.55, G.whoosh(0.5, R(), peak=0.35), -10)
ev("mirror softens (creak)", C["melted0"] - 0.05, G.creak(0.6, R(), 50, 30, G.WOOD if hasattr(G, "WOOD") else G.TIMBER, scale=0.8), -16)
ev("office workers' 'ooh' on 'shiny'", C["shiny"], mx(G.whoa(R()), (0.7, G.whoa(R()))), -17)
ev("car door shuts", 11.4, mx(G.push_thump(R()), (0.4, G.clink(R(), 900, 0.08))), -12, 0.2)
ev("key fob chirp", C["jaguar"] - 0.05, beep(0, 4), -14, 0.2)
for k in range(7): ev("footsteps away", 12.3 + k * 0.38, G.stroll_step(R(), 0.4), -20, 0.4)
ev("an hour later (whoosh)", 13.3, G.whoosh(0.7, R(), peak=0.5, f_lo=200, f_hi=2600), -14)
ev("MIRROR MELTS: plastic sag", C["melted"] - 0.08, mx(G.creak(0.8, R(), 40, 18, G.TIMBER, scale=0.7), (0.5, sizzle(0.8, 21, 120))), -9)
for k in range(4): ev("melted drips", C["melted"] + 0.3 + k * 0.28, G.bubbles(0.06, R(), 40, f_lo=500, f_hi=1500), -18, 0.1)
ev("BADGE drips (plink)", C["badge"] + 0.05, mx(G.bubbles(0.12, R(), 30, f_lo=700, f_hi=1800), (0.6, sizzle(0.5, 22, 90))), -12)
ev("DOORMAT scorches (fffft)", C["scorched"] - 0.05, mx(G.whoosh(0.6, R(), peak=0.2, f_lo=800, f_hi=4000), (0.8, sizzle(0.7, 23, 150))), -10)
ev("shopkeeper 'whoa'", C["scorched"] + 0.1, G.whoa(R()), -14, 0.3)
ev("PAVING CRACKS", C["cracked"] - 0.03, G.wood_crack(R()), -7)
ev("pan set down on the stone", 21.9, G.clink(R(), 700, 0.25, 0.7), -15)
ev("EGG FRIES: sizzle", C["fried"] - 0.05, sizzle(2.4, 24, 220), -10)
ev("fork clink", C["ate"] - 0.1, G.clink(R(), 2800, 0.08), -18, 0.3)
ev("thermometer pops", C["celsius"] - 0.03, mx(G.clink(R(), 1900, 0.1, 1.2), (0.7, G.whoosh(0.3, R(), peak=0.1, f_lo=1500, f_hi=5000))), -10)
ev("pigeons take off", C["celsius"] + 0.05, G.flag_flutter(0.9, R()), -14, -0.2)
ev("newspaper slaps down", C["newspapers"] - 0.1, mx(G.push_thump(R()), (0.8, G.whoosh(0.2, R(), peak=0.1, f_lo=1200, f_hi=5000))), -10)
ev("crowd 'ooh' at the tower", C["scorchie"], crowd(1.0, 6, 5), -15)
ev("a sigh of relief under the clouds", 32.7, crowd(1.2, 6, 6), -20)
ev("crowd groans: sun's out", C["sunniest"] + 0.05, mx(G.whoa(R()), (0.8, G.whoa(R())), (0.7, G.whoa(R()))), -11)
for k in range(3): ev("light bounces (ping)", 37.2 + k * 0.5, G.clink(R(), 3600, 0.15, 1.3), -20, (k - 1) * 0.4)
ev("spoon glint", C["spoon"] - 0.02, G.clink(R(), 4200, 0.4, 1.4), -16, 0.2)
ev("ice cream drips", 42.9, G.bubbles(0.5, R(), 12, f_lo=400, f_hi=1200), -18)
ev("rays converge (rising whoosh)", 44.4, G.whoosh(1.3, R(), peak=0.8, f_lo=150, f_hi=4000), -13)
ev("SIX TIMES BRIGHTER: sizzle flare", C["sun"] - 0.1, mx(sizzle(1.6, 25, 260), (0.6, G.whoosh(0.6, R(), peak=0.2))), -9)
ev("paper rustle (cheque)", C["paid"] - 0.15, G.brush(0.6, R(), 0.4, swish=True) if hasattr(G, "brush") else I.brush(0.6, R(), 0.4, swish=True), -16, 0.2)
for k in range(6): ev("bolting the fins", C["bolted"] + k * 0.42, mx(G.hammer_hit(R(), 0.7), (0.5, G.clink(R(), 1200 + 150 * k, 0.15))), -16, (k % 3 - 1) * 0.4)
ev("crane hum", 51.4, lp(G.rattle(2.6, R(), 18, heavy=True), 400, 2), -24)
ev("SNIP", C["cut"] - 0.03, mx(G.clink(R(), 3000, 0.06, 1.2), (0.8, G.clink(R(), 2400, 0.08, 1.0))), -10)
ev("coins land", C["money"] - 0.05, mx(*[np.pad(G.clink(R(), 2200 + 180 * k, 0.15), (ns(0.05 * k), 0)) for k in range(6)]), -13, 0.3)
ev("architect's nervous gulp", C["hot"] + 0.3, G.oof(R(), "oof"), -20)
ev("into Las Vegas (whoosh)", 61.9, G.whoosh(0.7, R(), peak=0.4), -14)
ev("SUNBATHERS LEAP: yelps", C["scorching"] - 0.02, mx(G.whoa(R()), (0.9, G.whoa(R())), (0.8, G.oof(R(), "oof"))), -9)
ev("lounger clatter", C["scorching"] + 0.05, G.rattle(0.4, R(), 40), -15)
ev("back to London (whoosh)", 66.75, G.whoosh(0.6, R(), peak=0.35), -15)
ev("the glint: sparkle", C["sequel"] - 0.04, mx(G.clink(R(), 5200, 0.6, 1.5), (0.7, G.clink(R(), 6600, 0.5, 1.5))), -14, 0.3)
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
    fh.write(f"# Sound cues: The Skyscraper That Melted a Car\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
