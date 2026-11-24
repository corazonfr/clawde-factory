# Sound for "The Jet That Ran Out of Fuel" (the Gimli Glider): an original airy score in D major (our own melody: pizzicato,
# tuba, horn, vibes, glock, snare), synthesized SFX on the picture's cue times, and the final mix. Uses the synthesis
# modules of the cartoon-3d-short skill (dsp, instruments, sfx_gen). Standard mix: music bed ~7.5 LU under the voice,
# ducked 3 dB under speech; SFX events placed relative to the voice's loudest moment; master -15 LUFS integrated, limiter
# ceiling -1.6 dBFS; 48 kHz stereo, exact length. Picture timing is locked in studio/src/videos/gimli/story.ts (W cues).
# usage: python gimli_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
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

_seed = [5000]
def R():
    _seed[0] += 1
    return rng(_seed[0])

# word cues (seconds), the same ones story.ts uses
C = dict(fuel=2.76, feet=4.12, cut2=4.55, maths=5.0, metric=7.34, boeing=8.46, measured=9.64, kilograms=10.64, broken=12.1,
         hand=13.48, pounds=14.74, needed=15.53, kilos=17.16, loaded=17.99, poundsB=19.46, less=20.12, half=20.56,
         warning=22.16, beeped=22.42, stopped=23.6, one=24.7, dark=26.64, sixtyNine=27.23, glider=29.32, luckily=30.08,
         gliders=31.2, fun=31.76, unluckily=32.06, winnipeg=33.32, gimli=36.38, race=38.52, raceB=40.42, on=40.58,
         pound=42.46, kilo=43.56, flour=46.08, weigh=46.88, same=48.03, less2=48.89, cake=49.58, high=51.24,
         sideways=52.84, dropped=54.88, touch=55.5, folded=56.08, stop=57.74, noseB=58.3, nobody=58.97, hurt=59.76,
         why=60.36, served=62.18, before=63.22, patched=64.88, flew=65.62, nickname=67.76, gimliC=68.44, gliderB=68.76)

# ================= music =================
class Band:
    def __init__(self):
        self.out = np.zeros((2, N)); self.send = np.zeros((2, N))
    def add(self, x, t, p=0.0, g=1.0, send=0.15):
        if t >= DUR or t < 0: return
        x = pan(x, p) if np.ndim(x) == 1 else x
        place(self.out, x, t, g); place(self.send, x, t, g * send)

B = Band()
# our own theme, D major, a light "up in the air" tune that climbs and floats: (beat in quarters, length, midi)
THEME = [(0, .5, 74), (.5, .5, 78), (1, 1, 81), (2, .5, 79), (2.5, .5, 78), (3, 1, 76),
         (4, .5, 74), (4.5, .5, 76), (5, .5, 78), (5.5, .5, 81), (6, 1.5, 83), (7.5, .5, 81)]
THEME2 = [(0, .5, 79), (.5, .5, 78), (1, .5, 76), (1.5, .5, 74), (2, 1, 76), (3, 1, 69),
          (4, .5, 71), (4.5, .5, 74), (5, .5, 78), (5.5, .5, 76), (6, 2, 74)]
CH = {"D": (38, [57, 62, 66]), "A": (45, [57, 61, 64]), "G": (43, [59, 62, 67]), "Em": (40, [59, 64, 67]),
      "Bm": (47, [59, 62, 66]), "A7": (45, [55, 61, 64]), "Dm": (38, [57, 62, 65]), "Bb": (46, [58, 62, 65]), "F#m": (42, [57, 61, 66])}

def melody(t0, notes, vel=0.6, transpose=0, inst="pluck", p=0.25):
    for (b, d, m) in notes:
        t = t0 + b * Q
        if inst == "pluck": B.add(I.pluck(F(m + transpose), vel, R(), dur=0.45, bright=0.7), t, p)
        elif inst == "horn": B.add(I.brass(F(m + transpose), d * Q * 0.9, vel, R(), "horn"), t, p)
        elif inst == "vibes": B.add(I.vibes(F(m + transpose), vel, R(), dur=1.2), t, p)
        else: B.add(I.glock(F(m + transpose), vel, R(), 1.0), t, p)

def march(t0, chords, vel=0.55, pah=0.32, snare=True, until=DUR):
    for k, c in enumerate(chords):  # one chord per half bar
        lo, tri = CH[c]
        t = t0 + k * 2 * Q
        if t >= until: break
        B.add(I.brass(F(lo), 0.22, vel, R(), "tuba", scoop=-25), t, -0.15)
        for j, m in enumerate(tri):
            B.add(I.pluck(F(m), pah, R(), dur=0.3, bright=0.45), t + Q + 0.006 * j, -0.3 + 0.15 * j, 0.7)
        if snare: B.add(I.snare(0.24, R(), 0.18), t + Q, 0.15)

def theme_block(t0, bars=4, vel=0.6, bright=False, inst="pluck", until=DUR):
    seq = ["D", "A", "G", "D", "Em", "A", "G", "D"][: bars * 2]
    march(t0, seq, 0.55 + (0.08 if bright else 0), until=until)
    melody(t0, [n for n in THEME if t0 + n[0] * Q < until], vel, inst=inst)
    if bars >= 4: melody(t0 + 8 * Q, [n for n in THEME2 if t0 + (8 + n[0]) * Q < until], vel, inst=inst)
    if bright:
        for k in range(bars):
            if t0 + k * 4 * Q + 3 * Q < until: B.add(I.glock(F(86 + (k % 2) * 4), 0.3, R()), t0 + k * 4 * Q + 3 * Q, 0.4)

def stinger(t, chord=(62, 66, 69, 74), vel=0.7):
    for m in chord: B.add(I.brass(F(m), 0.5, vel, R(), "stab"), t, 0.0, 0.6)

def ticktock(t0, t1, hi=81, lo=76, bass=(38, 33)):
    for k in range(int((t1 - t0) / Q)):
        t = t0 + k * Q
        B.add(I.pluck(F(hi if k % 2 else lo), 0.28, R(), 0.2, 0.8), t, 0.35 if k % 2 else -0.35)
        if k % 4 == 0: B.add(I.brass(F(bass[0] if k % 8 == 0 else bass[1]), 0.25, 0.32, R(), "tuba"), t, -0.1)

# 0-4.55: the hook. Cruise: an airy pad and vibes; a worried tuba on "fuel"; a roll into the flash
B.add(I.pad([F(50), F(57), F(62), F(66), F(69)], 4.5, 0.26, R(), att=0.6, trem=TREM(2.2, 0.15)), 0.0, 0.0)
for k, m in enumerate([74, 78, 81, 85, 83, 81]): B.add(I.vibes(F(m), 0.3, R()), 0.15 + k * 0.38, 0.3)
B.add(I.brass(F(38), 0.5, 0.55, R(), "tuba"), C["fuel"] - 0.05, 0.0)
B.add(I.brass(F(37), 0.9, 0.55, R(), "tuba", fall=-4.0), C["fuel"] + 0.5, 0.0)
for (tr, vr) in I.snare_roll(3.7, 4.5, 0.1, 0.55, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
B.add(I.timpani(F(38), 0.9, R()), C["cut2"] - 0.03)
B.add(I.cymbal(0.45, R(), 2.0), C["cut2"] - 0.03, 0.0)
# 4.55-9.5: the gate: the theme, bright; a "huh?" tuba on "maths"; a glock sparkle on "metric"
B.add(I.brass(F(43), 0.7, 0.6, R(), "tuba", scoop=-60), C["maths"] + 0.05, 0.0)
theme_block(5.85, bars=2, vel=0.6, bright=True, until=9.45)
for k in range(4): B.add(I.glock(F(86 + k * 3), 0.3, R(), 0.6), C["metric"] + k * 0.07, 0.3)
# 9.5-15.4: kilograms; the broken gauge; sums by hand; "in pounds"
ticktock(9.55, 12.05)
stinger(C["broken"] - 0.02, (61, 64, 67, 70), 0.6)
B.add(I.timpani(F(36), 0.7, R()), C["broken"] - 0.02)
ticktock(12.6, 14.6, 83, 79)
B.add(I.brass(F(45), 1.0, 0.65, R(), "tuba", fall=-5.0), C["pounds"] - 0.02, 0.0)
# 15.4-21: the tanks: a rising arpeggio while A fills; a smaller one for B that stops halfway; a sad slide on "half"
for k, m in enumerate([62, 66, 69, 74, 78, 81, 86, 90]): B.add(I.pluck(F(m), 0.4, R(), 0.3, 0.7), 15.6 + k * 0.2, 0.2)
B.add(I.glock(F(93), 0.4, R(), 1.0), C["kilos"], 0.3)
for k, m in enumerate([62, 66, 69, 74]): B.add(I.pluck(F(m), 0.4, R(), 0.3, 0.7), 18.05 + k * 0.38, -0.2)
B.add(I.brass(F(47), 1.2, 0.6, R(), "tuba", fall=-7.0), C["less"] - 0.02, 0.0)
stinger(C["half"] - 0.02, (62, 65, 68, 74), 0.55)
# 21-27.1: trouble: a low D-minor pad, timpani heartbeat; stabs on each engine; everything drops out on "dark"
B.add(I.pad([F(38), F(50), F(53), F(57)], 5.6, 0.3, R(), att=0.8, trem=TREM(1.5, 0.2)), 21.0, 0.0)
for k in range(11): B.add(I.timpani(F(38), 0.35 + 0.03 * k, R()), 21.2 + k * 0.5)
stinger(C["stopped"] - 0.02, (50, 53, 57, 62), 0.7)
stinger(C["one"] - 0.02, (49, 53, 56, 61), 0.8)
B.add(I.cymbal(0.4, R(), 1.4), C["one"] - 0.02, 0.0)
B.add(I.brass(F(38), 1.4, 0.7, R(), "tuba", fall=-12.0), C["dark"] - 0.02, 0.0)
# 27.1-29.95: a very heavy glider: only air and a high, floating vibes line
B.add(I.pad([F(62), F(69), F(74)], 2.9, 0.18, R(), att=1.0), 27.1, 0.0)
for k, m in enumerate([81, 78, 76, 74]): B.add(I.vibes(F(m), 0.26, R(), dur=1.4), 27.4 + k * 0.6, 0.3)
# 29.95-33.75: luckily (bright vibes up) / unluckily (minor stab, tuba fall)
for m, t in [(74, 30.1), (78, 30.35), (81, 30.6), (86, 30.85)]: B.add(I.vibes(F(m), 0.38, R()), t, 0.2)
B.add(I.glock(F(90), 0.4, R(), 1.2), C["fun"], 0.3)
stinger(C["unluckily"] - 0.02, (62, 65, 69, 74), 0.6)
B.add(I.brass(F(45), 1.0, 0.6, R(), "tuba", fall=-6.0), C["winnipeg"] + 0.05, 0.0)
# 33.75-41.2: Gimli: the theme as a festive race-day march; a big hit on "race on"
B.add(I.cymbal(0.4, R(), 2.0), 33.75, 0.0)
theme_block(33.8, bars=4, vel=0.6, bright=True, until=40.5)
stinger(C["on"] - 0.03, (62, 66, 69, 74, 78), 0.8)
B.add(I.timpani(F(38), 0.9, R()), C["on"] - 0.03)
# 41.2-50: the analogy: a curious tick-tock; a clank on the balance; a deflating tuba on "less than half a cake"
ticktock(41.25, 48.8, 79, 74, (43, 38))
B.add(I.glock(F(86), 0.35, R(), 0.8), C["kilo"], 0.3)
for k in range(3): B.add(I.brass(F(50 - k * 3), 0.3, 0.55, R(), "tuba"), C["less2"] + k * 0.22, 0.0)
B.add(I.brass(F(41), 1.0, 0.6, R(), "tuba", fall=-8.0), C["cake"] - 0.02, 0.0)
# 50-60.25: the landing: a building snare roll and rising horns, a hit on touchdown, a crash on the nose,
# held breath while it slides, then a warm relief chord on "nobody was seriously hurt"
B.add(I.pad([F(38), F(45), F(50), F(54)], 5.5, 0.24, R(), att=1.0, trem=TREM(4.0, 0.25)), 50.0, 0.0)
for (tr, vr) in I.snare_roll(51.6, 55.45, 0.07, 0.6, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
for k, m in enumerate([62, 64, 66, 67, 69, 71, 73]): B.add(I.brass(F(m), 0.45, 0.4 + 0.04 * k, R(), "horn"), 51.7 + k * 0.55, 0.1)
B.add(I.timpani(F(38), 1.0, R()), C["touch"] - 0.03)
B.add(I.timpani(F(33), 1.0, R()), C["folded"] - 0.03)
B.add(I.cymbal(0.6, R(), 2.4, bright=1.2), C["folded"] - 0.03, 0.0)
B.add(I.pad([F(50), F(57), F(62), F(66), F(69)], 1.4, 0.3, R(), att=0.4), C["nobody"] - 0.05, 0.0)
for m, t in [(74, 59.0), (78, 59.25), (81, 59.5), (86, 59.8)]: B.add(I.vibes(F(m), 0.4, R()), t, 0.2)
# 60.25-63.85: the flashback: warm, slower, the theme on vibes
B.add(I.pad([F(50), F(57), F(62), F(66)], 3.6, 0.26, R(), att=0.8), 60.25, 0.0)
melody(60.4, THEME[:8], 0.36, inst="vibes", p=0.1)
# 63.85-70.5: patched up, flying again: the theme in full brass; a big finish on "the Gimli Glider"
for k in range(4): B.add(I.glock(F(86 + (k % 2) * 5), 0.3, R(), 0.4), 64.0 + k * 0.3, 0.3)
B.add(I.cymbal(0.45, R(), 2.2), 65.55, 0.0)
march(65.6, ["D", "A", "G", "D", "Em", "A7"], 0.6, until=68.4)
melody(65.6, [n for n in THEME if 65.6 + n[0] * Q < 68.4], 0.6, inst="horn", p=0.1)
stinger(C["gimliC"] - 0.03, (62, 66, 69, 74, 78), 0.8)
B.add(I.timpani(F(38), 1.0, R()), C["gimliC"] - 0.03)
B.add(I.cymbal(0.6, R(), 2.4, bright=1.2), C["gliderB"] + 0.1, 0.0)
stinger(C["gliderB"] + 0.45, (50, 62, 66, 69, 74), 0.7)
B.add(I.triangle(0.6, R(), 1.8), C["gliderB"] + 0.45, 0.3)
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
    place(S, fades(x, 0.25, 0.4), t); EV.append((t, name, rel_db))

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

def jet_hum(dur, seed, whine=1.0, f_whine=2900.0, inside=False):
    """jet cruise: a broad low roar plus a thin turbine whine (inside: more muffled)"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    roar = lp(colored(n, r, -1.0), 450 if inside else 1400, 2)
    wh = (np.sin(2 * np.pi * f_whine * t + 0.3 * np.sin(2 * np.pi * 0.5 * t)) + 0.4 * np.sin(2 * np.pi * f_whine * 1.5 * t)) * 0.06 * whine
    x = roar + (lp(wh, 2000, 1) if inside else wh)
    return np.stack([x, np.roll(x, 900)])

def spool_down(seed, dur=1.8, f0=2900.0):
    """an engine winding down: whine falling in pitch and level, roar fading"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    f = f0 * (0.18 + 0.82 * np.exp(-t / 0.55))
    ph = 2 * np.pi * np.cumsum(f) / SR
    wh = (np.sin(ph) + 0.4 * np.sin(1.5 * ph)) * np.exp(-t / 0.9) * 0.5
    roar = lp(colored(n, r, -1.0), 900, 2) * np.exp(-t / 0.5)
    return wh + roar

def sputter(seed, n=4):
    """an engine coughing: a few low pops"""
    r = rng(seed); out = np.zeros(ns(0.25 * n + 0.3))
    for k in range(n):
        p = lp(colored(ns(0.12), r, -0.5), 600, 2) * np.exp(-np.arange(ns(0.12)) / SR / 0.03)
        o = ns(k * r.uniform(0.15, 0.28)); out[o: o + len(p)] += p * r.uniform(0.6, 1.0)
    return out

def beeps(n, f=1250.0, on=0.12, gap=0.21):
    out = np.zeros(ns(n * (on + gap)))
    tt = np.arange(ns(on)) / SR
    b = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.minimum(1, tt / 0.004) * np.minimum(1, (on - tt) / 0.01)
    for k in range(n): o = ns(k * (on + gap)); out[o: o + len(b)] += b
    return out

def power_down(seed):
    """the cockpit going dark: a falling electrical tone and a relay click"""
    r = rng(seed); n = ns(1.0); t = np.arange(n) / SR
    f = 400 * np.exp(-t / 0.35) + 40
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.4) * 0.6
    return mx(x, (0.8, G.clink(r, 1800, 0.05, 1.5)))

def racer(dur, seed, f0=70.0):
    """a drag racer: a hard pulsing engine roar rising in pitch"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    f = f0 * (1 + 1.2 * np.minimum(1, t / dur))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph) * 0.3 + 0.3 * colored(n, r, -0.5)
    return lp(x, 1800, 2)

def screech(seed, dur=0.8):
    """tyres touching down: a squeal and a puff"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    sq = np.sin(2 * np.pi * np.cumsum(1900 + 300 * np.sin(2 * np.pi * 9 * t)) / SR) * np.exp(-t / 0.25) * 0.4
    return mx(sq, (0.8, hp(colored(n, r, 0.0), 1200, 2) * np.exp(-t / 0.2)))

def scrape(dur, seed):
    """metal nose scraping along asphalt: harsh band noise with grit"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    x = hp(lp(colored(n, r, 0.0), 5000, 2), 700, 2) * (0.8 + 0.4 * r.random(n) ** 4)
    x *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.6)
    return x

def cheer(seed, n=8):
    r = rng(seed)
    return mx(*[(r.uniform(0.5, 1.0), pan(G.hurrah(r, r.uniform(110, 230), r.uniform(1.0, 1.2)), r.uniform(-0.7, 0.7))) for _ in range(n)])

def screams(seed, n=6):
    r = rng(seed)
    return mx(*[(r.uniform(0.5, 1.0), np.pad(G.whoa(r), (ns(r.uniform(0, 0.4)), 0))) for _ in range(n)])

def gurgle(dur, seed):
    r = rng(seed)
    return lp(G.bubbles(dur, r, 60, f_lo=120, f_hi=600, tau=(0.006, 0.02)), 1500, 2)

# ambience beds
bed("cruise: jet roar + whine", 0.0, jet_hum(4.55, 1), -22)
bed("airport apron: distant jets, wind", 4.55, mx(jet_hum(16.45, 2, 0.5, 3400), (0.7, G.breeze(16.45, R(), 0.7, gust=0.3))), -27)
bed("cockpit hum", 21.0, jet_hum(1.9, 3, 0.5, inside=True), -26)
bed("cruise: jet from outside", 22.9, jet_hum(2.05, 4), -22)
bed("cockpit hum (dying)", 24.95, jet_hum(1.7, 5, 0.3, inside=True), -27)
bed("glide: only wind", 27.1, G.breeze(2.85, R(), 1.0, gust=0.5), -21)
bed("cockpit: wind past the windows", 29.95, lp(G.breeze(3.8, R(), 1.0, gust=0.4), 1800, 2), -25)
bed("race day: crowd + far engines", 33.75, mx(crowd(7.45, 10, 6), (0.5, racer(7.45, 7, 45))), -25)
bed("kitchen: room tone + clock", 41.2, mx(lp(colored(ns(8.8), R(), -1.0), 400, 2), (0.6, beeps(26, 3000, 0.008, 0.33))), -32)
bed("landing: wind + crowd", 50.0, mx(G.breeze(10.25, R(), 1.0, gust=0.5), (0.7, crowd(10.25, 8, 8))), -25)
bed("flashback: birds + breeze", 60.25, mx(G.bird_chirps(3.6, R(), 0.6), (0.6, G.breeze(3.6, R(), 0.6))), -25)
bed("Gimli: birds + people", 63.85, mx(G.bird_chirps(1.7, R(), 0.5), (0.8, crowd(1.7, 6, 9))), -26)
bed("flying again: jet", 65.55, jet_hum(4.95, 10, 0.8), -24)

ev("engine coughs", 3.3, sputter(11, 5), -14, 0.3)
ev("whoosh into the flash", 4.2, G.whoosh(0.5, R(), peak=0.35), -11)
ev("fuel truck pump", 9.55, mx(lp(G.rattle(1.5, R(), 50), 700, 2), (0.8, gurgle(1.5, 12))), -18, 0.3)
ev("gauge needle jiggles", 11.2, G.clink(R(), 2400, 0.05, 1.2), -20)
ev("gauge glass cracks", C["broken"] - 0.03, mx(G.clink(R(), 2000, 0.3, 1.0), (0.7, G.clink(R(), 3400, 0.2, 1.3))), -12)
for k in range(6): ev("pencil scribble", 13.0 + k * 0.13, hp(colored(ns(0.1), R(), 0.0), 2500, 2) * np.hanning(ns(0.1)), -24, 0.2)
ev("tank A fills (gurgle)", 15.6, gurgle(1.6, 13), -17, -0.3)
ev("tank B fills, stops at half", 18.05, gurgle(1.45, 14), -17, 0.3)
ev("warning beeps", C["warning"], beeps(5), -14, 0.1)
ev("left engine spools down", C["stopped"] - 0.05, mx(spool_down(15), (0.8, sputter(16, 3))), -9, -0.4)
ev("right engine spools down", C["one"] - 0.05, mx(spool_down(17, 1.6, 3100), (0.8, sputter(18, 3))), -8, 0.4)
ev("screens power down", C["dark"] - 0.05, power_down(19), -11)
ev("air rushing past the silent jet", 27.2, G.whoosh(2.6, R(), peak=1.2, f_lo=300, f_hi=1500), -18)
ev("thought bubble pop", C["gliders"] - 0.08, G.clink(R(), 1600, 0.1, 1.2), -16, -0.2)
ev("into Gimli (whoosh)", 33.5, G.whoosh(0.6, R(), peak=0.35), -15)
ev("racers rev", 38.6, racer(0.9, 20, 60), -16, -0.2)
ev("drag race launch + pass", 39.35, mx(racer(1.85, 21, 55), (0.9, racer(1.85, 22, 62))), -8)
ev("crowd cheers the race", C["on"] - 0.1, cheer(23, 10), -14)
ev("into the kitchen (whoosh)", 41.0, G.whoosh(0.5, R(), peak=0.3), -16)
ev("balance tips (clank)", 42.75, mx(G.clink(R(), 900, 0.2, 0.9), (0.6, G.push_thump(R()))), -15)
ev("scale needle creak", C["weigh"] + 0.05, hp(G.rattle(0.5, R(), 30), 1500, 2), -22, 0.3)
ev("cake deflates (pfff)", C["less2"] - 0.02, mx(lp(colored(ns(0.6), R(), 0.0), 1500, 2) * np.exp(-np.arange(ns(0.6)) / SR / 0.25), (0.6, G.push_thump(R()))), -14)
ev("crowd gasps at the jet", 50.4, screams(24, 5), -18)
ev("sideslip: wind roar", C["sideways"] - 0.1, G.whoosh(1.8, R(), peak=0.9, f_lo=200, f_hi=1400), -12)
ev("the drop (whoosh)", C["dropped"] - 0.2, G.whoosh(0.7, R(), peak=0.55, f_lo=300, f_hi=2000), -12)
ev("TOUCHDOWN: tyres + thump", C["touch"] - 0.03, mx(screech(25), (1.0, G.push_thump(R())), (0.8, lp(colored(ns(0.4), R(), -1.0), 300, 2))), -6)
ev("NOSE GEAR FOLDS: crunch", C["folded"] - 0.03, mx(G.push_thump(R()), (0.9, lp(G.rattle(0.6, R(), 60, heavy=True), 2500, 2)), (0.5, G.clink(R(), 700, 0.3, 0.8))), -4)
ev("nose scraping along the runway", C["folded"] + 0.05, scrape(2.3, 26), -12)
ev("crowd screams", C["folded"] + 0.1, screams(27, 8), -15)
ev("jet comes to rest (creak)", C["stop"] + 0.1, mx(lp(G.rattle(0.7, R(), 20, heavy=True), 1200, 2), (0.5, G.clink(R(), 500, 0.3, 0.7))), -16)
ev("slides inflate (pfft)", 58.7, hp(colored(ns(0.6), R(), 0.0), 900, 2) * np.exp(-np.arange(ns(0.6)) / SR / 0.2), -16, 0.3)
ev("relief: cheer", C["hurt"] - 0.3, cheer(28, 8), -15)
ev("into the past (whoosh)", 60.0, G.whoosh(0.6, R(), peak=0.35), -17)
for k in range(3): ev("wrench clinks", 64.1 + k * 0.32, G.clink(R(), 1500 + 200 * k, 0.12, 1.1), -18, 0.3)
ev("jet flies by", 65.4, G.whoosh(1.4, R(), peak=0.6, f_lo=200, f_hi=1800), -14)
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
    fh.write(f"# Sound cues: The Jet That Ran Out of Fuel (the Gimli Glider)\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
