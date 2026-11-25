# Sound for "The Space Telescope That Needed Glasses": an original score (our own melody in D major: vibes, glock,
# horn, pizzicato, tuba), synthesized SFX on the picture's cue times, and the final mix. Uses the synthesis modules of
# the cartoon-3d-short skill (dsp, instruments, sfx_gen). Standard mix: music bed ~7.5 LU under the voice, ducked 3 dB
# under speech; SFX events placed relative to the voice's loudest moment; master -15 LUFS integrated, limiter ceiling
# -1.6 dBFS; 48 kHz stereo, exact length. Picture timing is locked in studio/src/videos/hubble/story.ts (W cues).
# usage: python hubble_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
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
C = dict(telescope=2.7, glasses=4.74, flash=5.7, april=5.84, shuttle=7.7, LIFT=7.55, hubble=8.9, above=9.18, stars=10.98,
         sharp=12.08, first=12.84, blurry=14.48, adjust=15.76, still=17.23, adjust2=18.12, two=19.24, nasa2=20.42, why=21.16,
         mirror=22.24, wrong=24.76, edge=25.62, flat=26.34, hair=29.14, luckily=29.85, polished=30.74, unluckily=32.01,
         wrong2=34.06, tool=35.08, lens=36.38, out=38.42, same=40.04, eyesight=41.08, light=41.66, middle=43.38,
         nothing=45.12, fix=47.14, in1993=48.47, caught=50.96, spacewalks=52.52, box=53.72, mirrors=56.48, glasses2=57.76,
         pictures2=59.16, sharp2=59.96, backup=60.88, company=62.3, right=65.44, never=66.9, flew=67.1, museum=68.02,
         washington=68.58)

# ================= music =================
class Band:
    def __init__(self):
        self.out = np.zeros((2, N)); self.send = np.zeros((2, N))
    def add(self, x, t, p=0.0, g=1.0, send=0.2):
        if t >= DUR or t < 0: return
        x = pan(x, p) if np.ndim(x) == 1 else x
        place(self.out, x, t, g); place(self.send, x, t, g * send)

B = Band()
# theme (our own), D major, a wide-eyed "looking up" tune: (beat offset in quarters, length in quarters, midi)
THEME = [(0, 1, 69), (1, .5, 74), (1.5, .5, 76), (2, 1.5, 78), (3.5, .5, 76), (4, 1, 74), (5, .5, 71), (5.5, .5, 73),
         (6, 2, 69)]
THEME2 = [(0, 1, 71), (1, .5, 74), (1.5, .5, 79), (2, 1.5, 78), (3.5, .5, 74), (4, 1, 76), (5, 1, 73), (6, 2, 74)]
CH = {"D": (38, [62, 66, 69]), "G": (43, [62, 67, 71]), "A": (45, [61, 64, 69]), "Bm": (47, [62, 66, 71]),
      "Em": (40, [64, 67, 71]), "A7": (45, [61, 67, 69]), "Dm": (38, [62, 65, 69]), "Gm": (43, [62, 67, 70]), "F": (41, [60, 65, 69])}

def melody(t0, notes, vel=0.6, transpose=0, inst="vibes", p=0.25):
    for (b, d, m) in notes:
        t = t0 + b * Q
        if inst == "pluck": B.add(I.pluck(F(m + transpose), vel, R(), dur=0.45, bright=0.7), t, p)
        elif inst == "horn": B.add(I.brass(F(m + transpose), d * Q * 0.9, vel, R(), "horn"), t, p)
        elif inst == "vibes": B.add(I.vibes(F(m + transpose), vel, R(), dur=1.4), t, p)
        else: B.add(I.glock(F(m + transpose), vel, R(), 1.0), t, p)

def comp(t0, chords, vel=0.5, pah=0.3, snare=False):
    for k, c in enumerate(chords):  # one chord per half bar: bass, then an off-beat pluck chord
        lo, tri = CH[c]
        t = t0 + k * 2 * Q
        if t >= DUR: break
        B.add(I.brass(F(lo), 0.22, vel, R(), "tuba", scoop=-25), t, -0.15)
        for j, m in enumerate(tri):
            B.add(I.pluck(F(m), pah, R(), dur=0.3, bright=0.45), t + Q + 0.006 * j, -0.3 + 0.15 * j, 0.7)
        if snare: B.add(I.snare(0.24, R(), 0.18), t + Q, 0.15)

def arps(t0, t1, chords, vel=0.28, step=0.5):
    k = 0
    while t0 + k * step * Q < t1:
        c = chords[(k // 8) % len(chords)]; _, tri = CH[c]
        B.add(I.glock(F(tri[k % 3] + 12), vel, R(), 0.7), t0 + k * step * Q, 0.35 if k % 2 else -0.35, send=0.4)
        k += 1

def stinger(t, chord=(62, 66, 69, 74), vel=0.7):
    for m in chord: B.add(I.brass(F(m), 0.5, vel, R(), "stab"), t, 0.0, 0.6)

def tick(t0, t1, hi=(81, 76), lo=(38, 33), vel=0.28):
    for k in range(int((t1 - t0) / Q)):
        t = t0 + k * Q
        B.add(I.pluck(F(hi[0] if k % 2 else hi[1]), vel, R(), 0.2, 0.8), t, 0.35 if k % 2 else -0.35)
        if k % 4 == 0: B.add(I.brass(F(lo[0] if k % 8 == 0 else lo[1]), 0.25, 0.32, R(), "tuba"), t, -0.1)

# 0-5.7: the hook: a starry pad, glock twinkles, a proud horn, then a deflating trombone-ish fall on "glasses"
B.add(I.pad([F(50), F(57), F(62), F(66), F(69)], 4.8, 0.3, R(), att=0.8, trem=TREM(2.5)), 0.0, 0.0)
arps(0.1, 3.6, ["D", "G"], 0.24)
B.add(I.brass(F(69), 0.5, 0.45, R(), "horn"), C["telescope"] - 0.3, 0.1)
B.add(I.brass(F(74), 0.8, 0.5, R(), "horn"), C["telescope"] + 0.2, 0.1)
for k, m in enumerate([62, 61, 60]): B.add(I.brass(F(m - 12), 0.35, 0.55, R(), "tuba", fall=-2.0 if k < 2 else -6.0), C["glasses"] - 0.05 + k * 0.32, 0.0)
B.add(I.timpani(F(38), 0.9, R()), C["flash"] - 0.03)
B.add(I.cymbal(0.45, R(), 2.0), C["flash"] - 0.03, 0.0)
# 5.7-9.1: the launch: a snare roll building to liftoff, then the theme in brass
for (tr, vr) in I.snare_roll(5.9, C["LIFT"], 0.1, 0.7, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
B.add(I.timpani(F(33), 1.0, R()), C["LIFT"])
comp(C["LIFT"] + 0.05, ["D", "G", "D", "A"], 0.55, snare=True)
melody(C["LIFT"] + 0.05, THEME[:5], 0.55, inst="horn", p=0.1)
# 9.1-12.65: in orbit: the theme on vibes over a slow pad, glock sparkle on "stars"
B.add(I.pad([F(50), F(62), F(66), F(69)], 3.6, 0.26, R(), att=0.6), 9.1, 0.0)
melody(9.15, THEME, 0.45, inst="vibes", p=0.2)
for k in range(6): B.add(I.glock(F(86 + (k % 3) * 2), 0.28, R(), 0.6), C["stars"] + k * 0.08, 0.3)
B.add(I.glock(F(93), 0.35, R(), 1.0), C["sharp"], 0.3)
# 12.65-21.8: the control room: a busy tick-tock; a sour stab on "blurry"; boings on each "adjust"; a sad slide
tick(12.7, 17.1, (81, 76), (38, 33))
stinger(C["blurry"] - 0.03, (62, 65, 68, 74), 0.6)
for t in (C["adjust"], C["adjust2"]):
    for k in range(3): B.add(I.brass(F(50 + k * 4), 0.18, 0.45, R(), "tuba", scoop=-70), t + k * 0.13, 0.0)
B.add(I.brass(F(45), 1.0, 0.6, R(), "tuba", fall=-5.0), C["still"] + 0.05, 0.0)
tick(18.9, 21.7, (74, 69), (33, 31), 0.22)
B.add(I.pad([F(50), F(53), F(57), F(62)], 2.4, 0.22, R(), att=0.5), 19.2, 0.0)
stinger(C["why"] - 0.02, (62, 65, 69, 72), 0.5)
# 21.8-29.7: the mirror lab: curious minor pizzicato; stab on "wrong shape"; a tiny glock on "hair"
comp(21.85, ["Dm", "Gm", "Dm", "A7", "Dm", "Gm", "A7", "Dm"], 0.45)
melody(21.85, [(0, 1, 69), (1, 1, 70), (2, 1, 69), (3, 1, 65), (4, 2, 64)], 0.4, inst="pluck", p=-0.1)
stinger(C["wrong"] - 0.03, (62, 65, 68, 71), 0.65)
B.add(I.timpani(F(38), 0.7, R()), C["wrong"] - 0.03)
for k, m in enumerate([93, 91, 89, 86]): B.add(I.glock(F(m), 0.26, R(), 0.5), C["hair"] + k * 0.09, 0.3)
# 29.7-39.5: luckily (bright vibes) / unluckily (minor stab); the tool: a ticking clockwork; "out of place": a slip
for m, t in [(74, 29.9), (78, 30.15), (81, 30.4), (86, 30.65)]: B.add(I.vibes(F(m), 0.38, R()), t, 0.2)
melody(30.9, THEME[:5], 0.36, inst="vibes", p=0.15)
stinger(C["unluckily"] - 0.03, (62, 65, 69, 74), 0.6)
B.add(I.brass(F(41), 1.0, 0.55, R(), "tuba", fall=-4.0), C["wrong2"] + 0.05, 0.0)
tick(34.9, 38.3, (79, 74), (36, 31), 0.26)
for k in range(10): B.add(I.pluck(F(86 - k * 2), 0.3, R(), 0.2, 0.9), C["out"] - 0.05 + k * 0.06, 0.2)
B.add(I.timpani(F(36), 0.7, R()), C["out"] - 0.03)
# 39.5-48.3: the eye test: a gentle explanation pluck; then the fix: a bright rise
comp(39.55, ["D", "Bm", "G", "A", "D", "Bm", "Em", "A"], 0.4, 0.26)
melody(39.6, THEME, 0.34, inst="vibes", p=0.2)
melody(39.6 + 8 * Q, THEME2[:5], 0.34, inst="vibes", p=0.2)
for k, m in enumerate([69, 73, 76, 81, 85, 86]): B.add(I.glock(F(m + 12), 0.32, R(), 0.8), C["fix"] - 0.1 + k * 0.07, 0.3)
# 48.3-59.0: the repair: the theme in full brass, a march; a stinger on "caught"; glock bells on "glasses"
B.add(I.cymbal(0.4, R(), 2.0), 48.3, 0.0)
comp(48.35, ["D", "G", "D", "A", "Bm", "G", "A", "D", "D", "G", "A", "D", "G", "A", "D", "D", "G", "A", "D", "D"], 0.55, 0.3, snare=True)
melody(48.35, THEME, 0.55, inst="horn", p=0.1)
melody(48.35 + 8 * Q, THEME2, 0.55, inst="horn", p=0.1)
stinger(C["caught"] - 0.03, (62, 66, 69, 74), 0.55)
melody(48.35 + 16 * Q, THEME, 0.5, inst="vibes", p=0.2)
for k, m in enumerate([81, 86, 90]): B.add(I.glock(F(m), 0.4, R(), 1.0), C["glasses2"] + k * 0.1, 0.3)
# 59.0-60.65: sharp: a big major stinger
stinger(C["sharp2"] - 0.03, (62, 66, 69, 74, 78), 0.8)
B.add(I.timpani(F(38), 1.0, R()), C["sharp2"] - 0.03)
B.add(I.cymbal(0.55, R(), 2.2, bright=1.2), C["sharp2"] - 0.03, 0.0)
# 60.65-70.5: the museum: a calm pad and the theme on vibes; a soft twinkle on "never flew"; a warm last chord
B.add(I.pad([F(50), F(57), F(62), F(66)], 4.3, 0.26, R(), att=0.8), 60.7, 0.0)
B.add(I.pad([F(43), F(55), F(62), F(67)], 3.0, 0.24, R(), att=0.6), 64.9, 0.0)
melody(60.8, THEME, 0.4, inst="vibes", p=0.15)
B.add(I.brass(F(45), 0.5, 0.4, R(), "tuba"), 64.9, 0.0)
for k, m in enumerate([86, 90, 93]): B.add(I.glock(F(m), 0.3, R(), 1.0), C["flew"] + 0.1 + k * 0.1, 0.3)
B.add(I.pad([F(50), F(57), F(62), F(66), F(69)], 2.4, 0.3, R(), att=0.3), 67.9, 0.0)
stinger(C["washington"] + 0.65, (50, 62, 66, 69, 74), 0.55)
B.add(I.triangle(0.5, R(), 1.6), C["washington"] + 0.65, 0.3)
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
    """room / spacecraft hum: a low mains tone plus soft air"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    x = 0.5 * np.sin(2 * np.pi * f0 * t) + 0.25 * np.sin(2 * np.pi * 2 * f0 * t) + lp(colored(n, r, -1.0), bright, 2)
    return x

def launch(seed):
    """the liftoff: an ignition crackle, then a long roaring, rumbling burn that swells"""
    r = rng(seed); n = ns(3.0); t = np.arange(n) / SR
    roar = lp(colored(n, r, -1.0), 900, 2) * np.minimum(1, t / 0.4)
    rumble = lp(colored(n, r, -1.8), 120, 3) * 2.2 * np.minimum(1, t / 0.6)
    crack = hp(colored(n, r, 0.0), 1200, 2) * (0.35 + 0.25 * (r.random(n) > 0.995)) * np.minimum(1, t / 0.2)
    x = (roar + rumble + crack) * np.where(t > 2.4, np.exp(-(t - 2.4) / 0.25), 1)
    return np.stack([x, np.roll(x, 900)])

def beeps(seed, n=4, f=1800):
    r = rng(seed); out = np.zeros(ns(0.25 * n + 0.2))
    for k in range(n):
        d = 0.07; tt = np.arange(ns(d)) / SR
        x = np.sin(2 * np.pi * f * (1 + 0.25 * (k % 2)) * tt) * np.minimum(1, tt / 0.005) * np.minimum(1, (d - tt) / 0.01)
        o = ns(k * r.uniform(0.18, 0.3)); out[o: o + len(x)] += x
    return out

def servo(dur, seed):
    """the robot arm's motor whine"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    f = 320 + 80 * np.sin(2 * np.pi * 0.6 * t)
    x = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.2 * hp(colored(n, r, 0.0), 2000, 2)
    return lp(x, 2500, 2) * np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.15)

def rub(dur, seed):
    """polishing: a soft rhythmic swish"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    x = hp(lp(colored(n, r, 0.0), 3500, 2), 500, 2) * (0.25 + 0.75 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.875 * t)) ** 2)
    return x

# ambience beds
bed("space: a soft craft hum", 0.0, hum(5.7, 1, 55, 250), -30)
bed("pad: wind + steam", 5.7, mx(G.breeze(3.4, R(), 0.9, gust=0.3), (0.5, hp(colored(ns(3.4), R(), 0.0), 3000, 2))), -25)
bed("space: hum", 9.1, hum(3.55, 2, 55, 250), -30)
bed("control room: hum + murmur", 12.65, mx(hum(9.15, 3, 60, 500), (0.7, crowd(9.15, 6, 3))), -26)
bed("lab: clean-room fans", 21.8, mx(hum(17.7, 4, 60, 900), (0.6, G.breeze(17.7, R(), 0.4, gust=0.05, bright=2000))), -27)
bed("eye room: quiet room", 39.5, hum(8.8, 5, 50, 300), -31)
bed("space: hum + suit radio hiss", 48.3, mx(hum(10.7, 6, 55, 250), (0.4, hp(colored(ns(10.7), R(), 0.0), 2500, 2))), -29)
bed("control room: hum", 59.0, hum(1.65, 7, 60, 500), -27)
bed("museum: hall murmur + footsteps", 60.65, mx(crowd(9.85, 8, 8), (0.6, hum(9.85, 9, 50, 300))), -26)

ev("glasses pop on", C["glasses"] - 0.06, mx(G.clink(R(), 2400, 0.12, 1.2), (0.6, G.clink(R(), 3100, 0.1, 1.3))), -14, 0.2)
ev("whoosh into the flash", 5.25, G.whoosh(0.5, R(), peak=0.4), -11)
ev("pad: steam hiss", 6.2, hp(colored(ns(1.3), R(), 0.0), 2500, 2) * np.linspace(0.3, 1, ns(1.3)), -20, 0.3)
ev("LIFTOFF ROAR", C["LIFT"] - 0.05, launch(11), -3)
ev("whoosh into orbit", 8.75, G.whoosh(0.5, R(), peak=0.3), -15)
ev("arm servo (release)", 9.4, servo(1.6, 12), -22, 0.2)
ev("computer beeps", 12.9, beeps(13, 4), -22, 0.4)
ev("crowd 'ohh' at the blur", C["blurry"] + 0.05, mx(G.oof(R(), "oof"), (0.8, G.whoa(R()))), -16, -0.2)
for t in (C["adjust"], C["adjust2"]):
    ev("knob clicks", t - 0.03, mx(*[(0.8, np.pad(G.clink(R(), 1300, 0.04, 0.9), (ns(0.07 * k), 0))) for k in range(6)]), -16, 0.3)
ev("a disappointed 'oof'", C["still"] + 0.3, G.oof(R(), "oof"), -17, 0.2)
ev("head on the desk", C["nasa2"] - 0.05, G.push_thump(R()), -15, -0.3)
ev("whoosh into the lab", 21.6, G.whoosh(0.5, R(), peak=0.35), -16)
ev("polishing", 29.75, rub(2.2, 14), -20, -0.2)
ev("technician 'uh-oh'", C["wrong2"] + 0.1, G.whoa(R()), -16, -0.3)
ev("the lens slips: clink + slide", C["out"] - 0.05, mx(G.clink(R(), 1700, 0.15, 1.1), (0.7, G.whoosh(0.3, R(), peak=0.1, f_lo=900, f_hi=3000))), -13, 0.2)
ev("whoosh into the eye room", 39.25, G.whoosh(0.5, R(), peak=0.35), -16)
ev("marker squeak (rays drawn)", C["light"], hp(G.creak(1.2, R(), 600, 900, scale=1.0), 800, 2), -24, -0.3)
ev("glasses on: pop", C["fix"] - 0.04, mx(G.clink(R(), 2600, 0.12, 1.2), (0.6, G.clink(R(), 3400, 0.1, 1.3))), -15, 0.2)
ev("arm servo (reach)", 49.6, servo(1.4, 15), -20, 0.2)
ev("CAUGHT: the grapple clunk", C["caught"] - 0.04, mx(G.push_thump(R()), (0.7, G.clink(R(), 900, 0.2, 0.8))), -10, 0.1)
ev("spacewalk: suit radio blip", 52.5, beeps(16, 2, 1200), -22, -0.3)
ev("the box slides in: clunk", 56.9, mx(G.push_thump(R()), (0.6, G.clink(R(), 1100, 0.15, 0.9))), -14, -0.2)
ev("glasses on the telescope: pop", C["glasses2"] - 0.06, mx(G.clink(R(), 2400, 0.12, 1.2), (0.6, G.clink(R(), 3100, 0.1, 1.3))), -14, 0.2)
ev("whoosh into the control room", 58.75, G.whoosh(0.5, R(), peak=0.35), -16)
ev("engineers cheer", C["sharp2"] + 0.05, cheer(17, 6), -13)
ev("whoosh into the museum", 60.45, G.whoosh(0.6, R(), peak=0.35), -17)
ev("kid's surprised 'whoa'", C["never"] + 0.15, G.whoa(R()), -20, 0.3)
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
    fh.write(f"# Sound cues: The Space Telescope That Needed Glasses\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
