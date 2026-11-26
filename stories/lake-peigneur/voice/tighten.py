# Cap long pauses in the narration, then time-stretch to the target length.
import subprocess, sys, re, numpy as np, wave
src, out, cap, target = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
log = subprocess.run(["ffmpeg","-hide_banner","-i",src,"-af","silencedetect=noise=-38dB:d=0.18","-f","null","-"],capture_output=True,text=True).stderr
starts=[float(x) for x in re.findall(r"silence_start: ([\d.]+)",log)]; ends=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",log)]
w=wave.open(src); sr=w.getframerate(); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16); w.close()
keep=[]; pos=0
for s,e in zip(starts,ends):
    if e-s>cap:
        mid=(s+e)/2; keep.append((pos,int((mid-cap/2)*sr))); pos=int((mid+cap/2)*sr)
keep.append((pos,len(a)))
y=np.concatenate([a[i:j] for i,j in keep if j>i])
tmp=out+".tmp.wav"; w=wave.open(tmp,"wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes()); w.close()
dur=len(y)/sr; tempo=min(max(dur/target,1.0),1.25)
subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",tmp,"-af",f"atempo={tempo:.4f}","-ar","48000",out],check=True)
print(f"after pause cap {dur:.2f}s, tempo {tempo:.3f}, final {dur/tempo:.2f}s")
