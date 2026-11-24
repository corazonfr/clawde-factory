# Sound for "The Town That Blew Up a Whale": an original jaunty seaside score (our own melody: pizzicato, tuba, horn,
# vibes, glock), synthesized SFX on the picture's cue times, and the final mix. Uses the synthesis modules of the
# cartoon-3d-short skill (dsp, instruments, sfx_gen). Standard mix: music bed ~7.5 LU under the voice, ducked 3 dB under
# speech; SFX events placed relative to the voice's loudest moment; master -15 LUFS integrated, true peak <= -1.2 dBTP;
# 48 kHz stereo, exact length. Picture timing is locked in studio/src/videos/whale/story.ts (W cues); change both together.
# usage: python whale_audio.py   (writes mix.wav, stem_*.wav and cues.md next to this file)
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
Q = 60 / 120  # quarter note at 120 bpm

def TREM(rate, depth=0.2):
    return lambda t: 1 - depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t))

_seed = [3000]
def R():
    _seed[0] += 1
    return rng(_seed[0])

# word cues (seconds), the same ones story.ts uses
C = dict(dynamite=4.02, florence=4.88, fortyFive=6.46, tons=9.07, smellier=10.12, highway=11.82, boulder=14.32, blow=15.9,
         tiny=16.52, seagulls=17.84, leftovers=18.66, twenty=21.52, used=23.04, cases=23.62, crowds=24.72, tv=25.64,
         everyone=27.25, quarter=28.34, pushed=29.8, button=30.2, BOOM=30.3, luckily=30.68, hurt=31.46, unluckily=31.96,
         enough=33.96, chunks=34.47, crowd=36.08, crushed=37.08, car=38.46, gullsB=39.46, blast=40.52, away=41.54,
         blubber=43.08, rubbery=43.92, dynamiteB=45.1, dust=46.34, throws=47.22, stomp=48.06, mist=50.26, big=51.22,
         splats=51.66, everywhere=52.42, bulldozed=54.12, buried=54.86, today=56.02, land=58.56, crushedB=59.68,
         owner=61.04, whaleDeal=62.96, deal=63.38, voted=65.42, winner=67.0, exploding=67.3, parkB=68.56)

# ================= music =================
class Band:
    def __init__(self):
        self.out = np.zeros((2, N)); self.send = np.zeros((2, N))
    def add(self, x, t, p=0.0, g=1.0, send=0.15):
        if t >= DUR or t < 0: return
        x = pan(x, p) if np.ndim(x) == 1 else x
        place(self.out, x, t, g); place(self.send, x, t, g * send)

B = Band()
# theme (our own), F major, a bouncy seaside tune: (beat offset in quarters, length in quarters, midi)
THEME = [(0, .5, 72), (.5, .5, 69), (1, .5, 72), (1.5, .5, 77), (2, 1, 76), (3, .5, 74), (3.5, .5, 72),
         (4, .5, 70), (4.5, .5, 74), (5, .5, 72), (5.5, .5, 70), (6, 1, 69), (7, 1, 65)]
THEME2 = [(0, .5, 67), (.5, .5, 70), (1, .5, 74), (1.5, .5, 72), (2, 1, 70), (3, 1, 67),
          (4, .5, 69), (4.5, .5, 72), (5, .5, 76), (5.5, .5, 74), (6, 2, 77)]
CH = {"F": (41, [57, 60, 65]), "C": (36, [55, 60, 64]), "Bb": (34, [58, 62, 65]), "C7": (36, [58, 60, 64]),
      "Dm": (38, [57, 62, 65]), "Gm": (43, [58, 62, 67]), "A": (45, [57, 61, 64]), "Db": (37, [56, 61, 65])}

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
        if t >= DUR: break
        B.add(I.brass(F(lo), 0.22, vel, R(), "tuba", scoop=-25), t, -0.15)
        for j, m in enumerate(tri):
            B.add(I.pluck(F(m), pah, R(), dur=0.3, bright=0.45), t + Q + 0.006 * j, -0.3 + 0.15 * j, 0.7)
        if snare: B.add(I.snare(0.26, R(), 0.18), t + Q, 0.15)

def theme_block(t0, bars=4, vel=0.6, bright=False, inst="pluck"):
    seq = ["F", "C", "F", "Bb", "Gm", "F", "C7", "F"][: bars * 2]
    march(t0, seq, 0.55 + (0.08 if bright else 0))
    melody(t0, THEME, vel, inst=inst)
    if bars >= 4: melody(t0 + 8 * Q, THEME2, vel, inst=inst)
    if bright:
        for k in range(bars): B.add(I.glock(F(84 + (k % 2) * 5), 0.3, R()), t0 + k * 4 * Q + 3 * Q, 0.4)

def stinger(t, chord=(65, 69, 72, 77), vel=0.7):
    for m in chord: B.add(I.brass(F(m), 0.5, vel, R(), "stab"), t, 0.0, 0.6)

# 0-4.85: the hook. A low, slightly ominous sea pad, a curious tuba, a timpani hit into the flash
B.add(I.pad([F(50), F(57), F(62), F(65)], 4.7, 0.28, R(), att=0.6, trem=TREM(3.0)), 0.0, 0.0)
for k, m in enumerate([62, 65, 69, 67, 65]): B.add(I.vibes(F(m + 12), 0.32, R()), 0.2 + k * 0.42, 0.3)
B.add(I.brass(F(38), 0.6, 0.6, R(), "tuba"), 2.5, 0.0)
B.add(I.brass(F(37), 0.8, 0.6, R(), "tuba", fall=-3.0), 3.3, 0.0)
for (tr, vr) in I.snare_roll(3.9, 4.8, 0.1, 0.55, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
B.add(I.timpani(F(41), 0.9, R()), C["florence"] - 0.03)
B.add(I.cymbal(0.45, R(), 2.0), C["florence"] - 0.03, 0.0)
# 4.85-11.35: Florence: the theme, bright; a sour tuba slide on "smellier"
theme_block(4.9, bars=3, vel=0.62, bright=True)
B.add(I.brass(F(43), 1.1, 0.7, R(), "tuba", fall=-7.0), C["smellier"] - 0.02, 0.0)
for k, m in enumerate([66, 65, 64]): B.add(I.pluck(F(m), 0.4, R(), 0.4, 0.5), C["smellier"] + 0.25 + k * 0.22, 0.3)
# 11.35-15.3: the highway department: a brisk official march; a stinger on "boulder"
march(11.4, ["F", "C", "F", "C", "Bb", "F", "C", "C"], 0.55)
melody(11.4, THEME[:7], 0.5, inst="horn", p=0.15)
stinger(C["boulder"] - 0.02, (60, 64, 67, 72), 0.55)
B.add(I.timpani(F(36), 0.7, R()), C["boulder"] - 0.02)
# 15.3-19.3: the plan: cheeky pizzicato, a glock sparkle on "tiny pieces", a whistle-ish trill for the gulls
for k in range(8):
    t = 15.35 + k * Q
    B.add(I.pluck(F([41, 48, 45, 48][k % 4]), 0.42, R(), 0.25, 0.5), t, -0.2)
    if k % 2: B.add(I.brush(0.28, R()), t, 0.2)
for k in range(6): B.add(I.glock(F(84 + (k % 3) * 2), 0.3, R(), 0.5), C["tiny"] + k * 0.07, 0.3)
for k in range(8): B.add(I.vibes(F(81 if k % 2 else 79), 0.3, R(), dur=0.4), C["seagulls"] + 0.05 + k * 0.08, 0.35)
B.add(I.glock(F(89), 0.4, R(), 1.0), C["leftovers"] + 0.1, 0.3)
# 19.3-24.55: the veteran: a sensible tick-tock; then the cases pile up with rising stabs and a crash
for k in range(int((23.0 - 19.35) / Q)):
    t = 19.35 + k * Q
    B.add(I.pluck(F(84 if k % 2 else 79), 0.28, R(), 0.2, 0.8), t, 0.35 if k % 2 else -0.35)
    if k % 4 == 0: B.add(I.brass(F(41 if k % 8 == 0 else 36), 0.25, 0.35, R(), "tuba"), t, -0.1)
B.add(I.glock(F(84), 0.4, R(), 0.9), C["twenty"], 0.3)
for k, m in enumerate([60, 62, 64, 65, 67, 69]): B.add(I.brass(F(m), 0.12, 0.45 + 0.05 * k, R(), "stab"), C["used"] + k * 0.09, 0.0, 0.6)
stinger(C["cases"] - 0.02, (65, 69, 72, 77, 81), 0.8)
B.add(I.cymbal(0.6, R(), 2.0), C["cases"] - 0.02, 0.0)
B.add(I.timpani(F(29), 0.9, R()), C["cases"] - 0.02)
# 24.55-29.35: crowds and cameras: the theme, festive; a descending brass gag on "a quarter of a mile"
theme_block(24.6, bars=2, vel=0.6, bright=True)
for k, m in enumerate([77, 74, 72, 69, 65, 62, 60, 57]): B.add(I.brass(F(m), 0.16, 0.5, R(), "horn"), C["quarter"] - 0.1 + k * 0.09, 0.1)
# 29.35-31.9: the button: a snare roll to a dead stop, then the BOOM (sfx carries it); bright vibes on "luckily"
for (tr, vr) in I.snare_roll(28.95, C["pushed"], 0.12, 0.8, R()): B.add(I.snare(vr, R(), 0.2, buzz=True), tr, 0.1)
B.add(I.timpani(F(29), 1.0, R()), C["BOOM"])
for m, t in [(72, 30.75), (76, 31.0), (79, 31.25), (84, 31.5)]: B.add(I.vibes(F(m), 0.4, R()), t, 0.2)
# 31.9-36.65: unluckily: a minor stab, a falling whistle, then chaos: a fast march with crashes
stinger(C["unluckily"] - 0.02, (62, 65, 69, 74), 0.6)
for k in range(14): B.add(I.pluck(F(93 - k * 2), 0.36, R(), 0.2, 0.9), 32.6 + k * 0.1, 0.2)
B.add(I.brass(F(50), 0.8, 0.6, R(), "tuba", fall=-5.0), C["enough"] - 0.02, 0.0)
march(34.45, ["Dm", "A", "Dm", "A", "Gm", "A", "Dm", "A"], 0.6, 0.36)
for k, m in enumerate([74, 73, 74, 77, 76, 74, 73, 69]): B.add(I.brass(F(m), 0.2, 0.55, R(), "horn"), 34.45 + k * Q * 0.5, 0.15)
B.add(I.cymbal(0.55, R(), 1.6, bright=1.2), C["chunks"] - 0.02, 0.0)
# 36.65-39.15: the car: a crash stinger on "crushed", a sad tuba on "car"
stinger(C["crushed"] - 0.03, (62, 65, 68, 74), 0.8)
B.add(I.timpani(F(38), 0.9, R()), C["crushed"] - 0.03)
B.add(I.brass(F(41), 1.0, 0.6, R(), "tuba", fall=-6.0), C["car"] + 0.05, 0.0)
# 39.15-42: the gulls leave: a flutter run up
for k in range(12): B.add(I.pluck(F(72 + k * 2), 0.32, R(), 0.18, 0.9), C["blast"] + k * 0.06, 0.3)
B.add(I.glock(F(96), 0.35, R(), 0.8), C["away"], 0.3)
# 42-47.9: the explanation: a curious tick-tock; a rubbery "boing" (tuba scoop); a whoosh-stinger on "throws"
for k in range(int((47.1 - 42.05) / Q)):
    t = 42.05 + k * Q
    B.add(I.pluck(F(79 if k % 2 else 74), 0.28, R(), 0.2, 0.8), t, 0.35 if k % 2 else -0.35)
    if k % 4 == 0: B.add(I.brass(F(38 if k % 8 == 0 else 33), 0.25, 0.32, R(), "tuba"), t, -0.1)
for k in range(3): B.add(I.brass(F(43 + k * 5), 0.25, 0.55, R(), "tuba", scoop=-80), C["rubbery"] + k * 0.17, 0.0)
stinger(C["throws"] - 0.03, (65, 69, 72, 77), 0.7)
# 47.9-53.35: the picnic: a light waltz-y pluck; a timpani on the stomp, a cymbal splash on the splats
for k in range(int((53.3 - 47.95) / Q)):
    t = 47.95 + k * Q
    lo, tri = CH[["F", "C", "Bb", "C"][(k // 4) % 4]]
    B.add(I.pluck(F(lo + 12 if k % 4 == 0 else tri[k % 3] + 12), 0.36, R(), 0.3, 0.6), t, -0.2 if k % 2 else 0.2)
B.add(I.timpani(F(41), 0.8, R()), C["stomp"] - 0.02)
B.add(I.cymbal(0.5, R(), 1.8), C["big"] - 0.02, 0.0)
stinger(C["everywhere"] - 0.02, (65, 69, 72, 77), 0.5)
# 53.35-59: bulldozer: a slow tuba trudge; today: a calm warm pad and vibes
for k in range(5): B.add(I.brass(F([41, 40, 38, 36, 41][k]), 0.4, 0.45, R(), "tuba"), 53.4 + k * 0.5, -0.1)
B.add(I.pad([F(53), F(57), F(60), F(65)], 3.1, 0.3, R(), att=0.8), 55.9, 0.0)
melody(56.0, THEME[:9], 0.38, inst="vibes", p=0.1)
# 59-63.65: the dealership: a lounge swing (walking bass, brushes, vibes); a ding on "whale of a deal"
B.add(I.brass(F(41), 0.8, 0.5, R(), "tuba", fall=-3.0), C["crushedB"], 0.0)
for k in range(int((63.6 - 60.85) / Q)):
    t = 60.85 + k * Q
    B.add(I.pluck(F([41, 45, 48, 50, 46, 50, 53, 48][k % 8]), 0.5, R(), 0.45, 0.35), t, -0.25)
    B.add(I.brush(0.3 if k % 2 else 0.22, R(), swish=(k % 2 == 0)), t, 0.25)
for (b, d, m) in [(0, 1.5, 77), (1.5, .5, 81), (2, 2, 84), (4, 1.5, 82)]: B.add(I.vibes(F(m), 0.36, R(), dur=1.6), 60.9 + b * Q, 0.3)
for m, dt in [(84, 0.0), (88, 0.12)]: B.add(I.glock(F(m), 0.5, R(), 1.4), C["deal"] + dt, 0.3)
# 63.65-70.5: the park at golden hour: the theme in full brass; a big finish on "Exploding Whale Memorial Park"
B.add(I.cymbal(0.45, R(), 2.2), 63.65, 0.0)
march(63.7, ["F", "C", "F", "Bb", "Gm", "C7"], 0.6)
melody(63.7, THEME, 0.6, inst="horn", p=0.1)
stinger(C["exploding"] - 0.03, (65, 69, 72, 77, 81), 0.8)
B.add(I.timpani(F(29), 1.0, R()), C["exploding"] - 0.03)
B.add(I.cymbal(0.6, R(), 2.4, bright=1.2), C["parkB"], 0.0)
stinger(C["parkB"] + 0.4, (53, 65, 69, 72, 77), 0.7)
B.add(I.triangle(0.6, R(), 1.8), C["parkB"] + 0.4, 0.3)
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

def surf(dur, seed):
    """Pacific surf: low rolling noise with slow wave swells and a hissy wash on each break"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    body = lp(colored(n, r, -1.0), 700, 2)
    hiss = hp(colored(n, r, 0.0), 2500, 2) * 0.25
    env = np.zeros(n)
    tb = r.uniform(0, 2)
    while tb < dur:
        k = (t - tb); env += np.where(k > 0, (k / 0.6).clip(0, 1) * np.exp(-np.maximum(k - 0.6, 0) / 2.2), 0)
        tb += r.uniform(5.5, 8.5)
    env = 0.35 + env
    x = (body + hiss) * env
    return np.stack([x, np.roll(x, 2400)])

def gull_cry(seed, n=2):
    """a herring-gull 'kee-ow': a falling, rough, harmonic glide, repeated"""
    r = rng(seed); out = np.zeros(ns(0.36 * n + 0.2))
    for k in range(n):
        d = r.uniform(0.22, 0.32); tt = np.arange(ns(d)) / SR
        f = r.uniform(1700, 2100) * (1 - 0.38 * (tt / d) ** 0.7)
        ph = 2 * np.pi * np.cumsum(f) / SR
        rough = 1 + 0.3 * np.sin(2 * np.pi * 70 * tt)
        x = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)) * rough
        x *= np.minimum(1, tt / 0.02) * np.exp(-tt / (d * 0.7))
        o = ns(k * r.uniform(0.3, 0.4)); out[o: o + len(x)] += x
    return hp(out, 600, 2)

def boom(seed):
    """the blast: a sub thump, a long low rumble, a crackle of debris and a sand hiss"""
    r = rng(seed); n = ns(4.5); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (48 - 20 * np.minimum(t, 1)) * t) * np.exp(-t / 0.5)
    rumble = lp(colored(n, r, -1.5), 220, 3) * np.exp(-t / 1.4) * 2.0
    crack = hp(colored(n, r, 0.0), 800, 2) * np.exp(-t / 0.12) * 0.8
    sand = hp(lp(colored(n, r, 0.0), 6000, 2), 1500, 2) * np.minimum(1, t / 0.3) * np.exp(-np.maximum(t - 0.3, 0) / 1.2) * 0.25
    x = sub * 1.4 + rumble + crack + sand
    return np.stack([x, np.roll(x, 600)])

def squelch(seed, big=1.0):
    """a wet blubber / ketchup splat: a soft low thump with a quick slurp of bubbles"""
    r = rng(seed)
    th = G.push_thump(r)
    bub = G.bubbles(0.18, r, 140, f_lo=180, f_hi=900, tau=(0.004, 0.015))
    return mx((1.0 * big, lp(th, 900, 2)), (0.7, bub))

def crunch(seed):
    """car roof crushed: a heavy metal crumple with glass tinkle"""
    r = rng(seed)
    return mx(G.push_thump(r), (0.9, lp(G.rattle(0.5, r, 60, heavy=True), 2500, 2)), (0.5, G.clink(r, 900, 0.4, 0.8)),
              *[(0.25, np.pad(G.clink(r, 3500 + 400 * k, 0.12, 1.3), (ns(0.12 + 0.05 * k), 0))) for k in range(5)])

def engine(dur, seed):
    """a diesel bulldozer: low pulsing rattle"""
    r = rng(seed); n = ns(dur); t = np.arange(n) / SR
    pulses = np.sign(np.sin(2 * np.pi * 26 * t)) * 0.4 + np.sin(2 * np.pi * 52 * t) * 0.3
    x = lp(pulses + 0.5 * colored(n, r, -1.0), 500, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t))
    return x

def cheer(seed, n=8):
    r = rng(seed)
    return mx(*[(r.uniform(0.5, 1.0), pan(G.hurrah(r, r.uniform(110, 230), r.uniform(1.0, 1.2)), r.uniform(-0.7, 0.7))) for _ in range(n)])

def screams(seed, n=6):
    r = rng(seed)
    return mx(*[(r.uniform(0.5, 1.0), np.pad(G.whoa(r), (ns(r.uniform(0, 0.4)), 0))) for _ in range(n)])

# ambience beds
bed("beach: surf + wind", 0.0, mx(surf(47.95, 1), (0.6, G.breeze(47.95, R(), 0.9, gust=0.3))), -23)
bed("gulls far off", 0.4, mx(*[(0.6, np.pad(gull_cry(50 + k), (ns(1.4 * k + 0.3 * (k % 3)), 0))) for k in range(9)]), -27)
bed("locals murmur", 4.9, crowd(6.3, 6, 3), -26)
bed("crowd on the dunes", 24.6, crowd(4.7, 12, 4), -23)
bed("park: birds + breeze", 47.9, mx(G.bird_chirps(5.5, R(), 0.6), (0.6, G.breeze(5.5, R(), 0.6))), -22)
bed("beach again: surf", 53.35, mx(surf(5.65, 2), (0.6, G.breeze(5.65, R(), 0.8))), -24)
bed("dealership: traffic + bunting", 60.8, mx(lp(colored(ns(2.9), R(), -1.0), 300, 2), (0.6, G.flag_flutter(2.9, R()))), -26)
bed("park at golden hour: birds + people", 63.65, mx(G.bird_chirps(6.85, R(), 0.5), (0.8, crowd(6.85, 8, 9))), -24)

ev("gull calls on the post", 0.6, gull_cry(61, 2), -18, -0.3)
ev("whoosh into the flash", 4.35, G.whoosh(0.5, R(), peak=0.35), -11)
ev("locals 'ewww' at the smell", C["smellier"] + 0.15, mx(G.oof(R(), "oof"), (0.8, G.whoa(R()))), -15, -0.2)
ev("truck engine pulls up", 11.4, engine(1.6, 5), -18, 0.3)
ev("truck door", 12.2, mx(G.push_thump(R()), (0.4, G.clink(R(), 800, 0.08))), -15, 0.3)
for k in range(5): ev("boots on sand", 12.0 + k * 0.33, lp(G.stroll_step(R(), 0.8), 1500, 2), -22, 0.3)
ev("thought bubble pop", C["boulder"] - 0.08, G.clink(R(), 1600, 0.1, 1.2), -16, -0.2)
ev("gulls get excited", C["seagulls"] + 0.05, mx(gull_cry(71, 3), (0.7, gull_cry(72, 2))), -13, -0.3)
ev("cases stacked: thud thud thud", C["used"] + 0.05, mx(*[(0.8, np.pad(G.push_thump(R()), (ns(0.033 * k), 0))) for k in range(17)]), -12)
ev("crowd 'oooh' at the TV camera", C["tv"] + 0.1, crowd(1.2, 8, 6), -18)
ev("camera film whirr", C["tv"] + 0.6, hp(G.rattle(1.6, R(), 80), 1500, 2), -22, -0.3)
for k in range(8): ev("crowd shuffles back", C["everyone"] + k * 0.18, lp(G.stroll_step(R(), 0.9), 1600, 2), -20, (k % 3 - 1) * 0.4)
ev("plunger pushed (click-clunk)", C["pushed"] - 0.03, mx(G.clink(R(), 1100, 0.08), (0.8, G.push_thump(R()))), -12, 0.2)
ev("THE BLAST", C["BOOM"] - 0.02, boom(7), -2)
ev("crowd cheers (luckily)", C["luckily"] + 0.1, cheer(8, 8), -14)
ev("a whistle of something falling", 32.4, G.whoosh(1.5, R(), peak=1.2, f_lo=500, f_hi=2600), -16)
ev("crowd gasps", C["enough"] - 0.1, screams(9, 5), -14)
for k in range(14): ev("blubber lands (splat)", 33.2 + k * 0.28 + 0.1 * (k % 3), squelch(100 + k, 1.0 - 0.03 * k), -11 - (k % 3), (k % 5 - 2) * 0.3)
ev("people scream and run", C["chunks"] + 0.15, screams(10, 8), -12)
for k in range(10): ev("running feet", 34.6 + k * 0.17, lp(G.stroll_step(R(), 1.0), 1800, 2), -21, (k % 3 - 1) * 0.5)
ev("falling chunk whistle", 36.55, G.whoosh(0.5, R(), peak=0.45, f_lo=700, f_hi=3000), -15)
ev("CAR ROOF CRUSHED", C["crushed"] - 0.03, crunch(11), -6)
ev("owner's 'oof'", C["car"] - 0.2, G.oof(R(), "oof"), -15, 0.2)
ev("gulls flee (wings + cries)", C["blast"] - 0.05, mx(G.flag_flutter(1.0, R()), (0.8, gull_cry(81, 3))), -12, -0.3)
ev("rubbery wobble", C["rubbery"] - 0.03, mx(squelch(120, 0.7), (0.5, G.bubbles(0.6, R(), 25, f_lo=150, f_hi=500))), -14)
ev("fuse fizz", C["dynamiteB"] + 0.05, hp(G.bubbles(1.0, R(), 300, f_lo=3000, f_hi=8000, tau=(0.001, 0.004)), 2500, 2), -20)
ev("THROWN: whoosh + thump", C["throws"] - 0.08, mx(G.whoosh(0.6, R(), peak=0.1, f_lo=300, f_hi=3000), (0.8, squelch(121, 0.8))), -9)
ev("KETCHUP STOMP", C["stomp"] - 0.03, mx(G.push_thump(R()), (0.8, squelch(130, 1.0))), -10, 0.2)
for k in range(4): ev("splats", C["big"] + k * 0.08, squelch(131 + k, 0.8), -12, (k - 1.5) * 0.4)
for k in range(5): ev("more splats", C["everywhere"] + k * 0.06, squelch(140 + k, 0.7), -14, (k - 2) * 0.4)
ev("dad's dazed 'uhh'", C["everywhere"] + 0.4, G.oof(R(), "oof"), -17, -0.3)
ev("bulldozer", 53.4, engine(2.4, 6), -15, 0.3)
ev("sand pushed", 53.9, lp(colored(ns(1.8), R(), 0.0), 1800, 2) * np.minimum(1, np.arange(ns(1.8)) / SR / 0.3), -20, 0.2)
ev("gull call (today)", 57.0, gull_cry(90, 2), -20, 0.3)
ev("into the dealership (whoosh)", 60.6, G.whoosh(0.6, R(), peak=0.35), -15)
ev("cash-register ding", C["deal"] + 0.02, mx(G.clink(R(), 2600, 0.5, 1.3), (0.6, G.clink(R(), 3300, 0.4, 1.3))), -14, 0.3)
ev("into the park (whoosh)", 63.4, G.whoosh(0.6, R(), peak=0.35), -16)
ev("hands up: a cheer", C["voted"] + 0.1, cheer(12, 6), -16)
ev("the sign reveal: cheer + laugh", C["exploding"] + 0.05, cheer(13, 10), -13)
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
# peak limiter (look-ahead 3 ms, release 80 ms) to -1.6 dBFS (true peak lands near -1.2 dBTP)
ceil = dbg(-1.6)
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
    fh.write(f"# Sound cues: The Town That Blew Up a Whale\n\nMix: {integrated(y):.1f} LUFS integrated, true peak {true_peak(y):.1f} dBTP, {N / SR:.3f} s\n\n")
    fh.write("| time (s) | event | level vs voice peak (dB) |\n|---|---|---|\n")
    for t, nme, d in sorted(EV): fh.write(f"| {t:.2f} | {nme} | {d} |\n")
print(f"mix: {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {N / SR:.3f} s, {len(EV)} events")
