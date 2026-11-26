# Hand-fix helper for whisper word timings: whisper puts word edges inside silence. Snap every word start to the
# first 10 ms frame above the speech threshold (searching -0.12..+0.35 s around whisper's start) and every word end
# to the last loud frame before the next word. Prints words whose edges moved a lot so they can be checked by ear.
# usage: python fix_edges.py voice.wav take_words.json words.json
import json, subprocess, sys
import numpy as np

src, inp, out = sys.argv[1:4]
pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
a = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
hop = 160
rms = np.sqrt(np.convolve(a * a, np.ones(400) / 400, "same"))[::hop]
db = 20 * np.log10(rms + 1e-9)
thr = np.percentile(db, 95) - 30  # 30 dB under the loud speech level
loud = db > thr
fr = lambda t: int(round(t * 100))
words = json.load(open(inp))
for i, w in enumerate(words):
    s0, s1 = max(0, fr(w["start"] - 0.12)), min(len(loud) - 1, fr(w["start"] + 0.35))
    on = next((k for k in range(s0, s1) if loud[k]), fr(w["start"]))
    if i and on < fr(words[i - 1]["end"]) - 2: on = fr(w["start"])  # never inside the previous word
    w["start"] = round(on / 100, 2)
for i, w in enumerate(words):
    nxt = fr(words[i + 1]["start"]) if i + 1 < len(words) else len(loud) - 1
    e = min(fr(w["end"]) + 25, nxt)
    k = e
    while k > fr(w["start"]) + 4 and not loud[k - 1]: k -= 1
    w["end"] = round(max(k, fr(w["start"]) + 6) / 100, 2)
moved = [(w["word"], w["start"]) for w, o in zip(words, json.load(open(inp))) if abs(w["start"] - o["start"]) > 0.15]
json.dump(words, open(out, "w"), indent=0)
print("moved >0.15 s:", moved)
