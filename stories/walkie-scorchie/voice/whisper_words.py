# Word timings for the narration: faster-whisper small.en, word_timestamps=True.
# usage: python whisper_words.py voice.wav take_words.json
# The audio goes in as a 16 kHz numpy array (decoded with ffmpeg), not a file path, to avoid the `av` decoder.
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

src, out = sys.argv[1], sys.argv[2]
pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
model = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = model.transcribe(audio, language="en", word_timestamps=True, beam_size=5, vad_filter=False)
words = [{"word": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)} for s in segs for w in s.words]
json.dump(words, open(out, "w"), indent=0)
print(len(words), "words;", " ".join(w["word"] for w in words))
