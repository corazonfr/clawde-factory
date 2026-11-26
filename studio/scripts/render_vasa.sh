#!/bin/bash
# Final render of "The Warship That Sank Before It Left the Harbour" on a local GPU (ANGLE), 2K vertical (1440x2560):
#   1. render VasaShort as JPEG frames (quality 95) in 300-frame chunks, skipping chunks already done (restartable),
#      checking every frame count. Frames, not mp4 chunks: with little free RAM, x264 inside each chunk render failed
#      to allocate memory, so the encode happens once at the end with a few threads.
#   2. encode the frames with the final mix (audio/mix.wav) at crf 19 (keeps the file under GitHub's 100 MB) and check
#      both durations
# Frames stay local (not committed). Bundles go to D:/remotion-tmp so the system drive does not fill.
set -u
cd "$(dirname "$0")/.."
export TEMP="D:/remotion-tmp" TMP="D:/remotion-tmp"
REPO=$(git rev-parse --show-toplevel)
STORY="$REPO/stories/vasa-warship"
FR="$STORY/render/frames"
TOTAL=2115; STEP=300
mkdir -p "$FR"
frames() { ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nw=1:nk=1 "$1" 2>/dev/null | tr -dc 0-9; }
log() { echo "$(date +%T) $*"; }
have() { local n=0; for ((i=$1; i<=$2; i++)); do [ -s "$(printf "%s/f_%04d.jpg" "$FR" $i)" ] && n=$((n+1)); done; echo $n; }

for ((a=0; a<TOTAL; a+=STEP)); do
  b=$((a+STEP-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  [ "$(have $a $b)" = "$((b-a+1))" ] && continue
  for try in 1 2; do
    log "chunk $a-$b (try $try)"
    TMPD="$FR/tmp_$a"; rm -rf "$TMPD"; mkdir -p "$TMPD"
    npx remotion render src/index.ts VasaShort "$TMPD" --sequence --image-format=jpeg --jpeg-quality=95 --frames=$a-$b \
      --gl=angle --concurrency=1 --timeout=600000 --scale 1.3333 --log=error 2>&1 | grep -v GroupMarker | grep -iE "error" | grep -viE "shader|VALIDATE" | head -3
    for f in "$TMPD"/element-*.jpeg; do [ -e "$f" ] || continue; n=$(basename "$f" .jpeg); n=$((10#${n#element-})); mv "$f" "$(printf "%s/f_%04d.jpg" "$FR" $n)"; done
    rm -rf "$TMPD"
    [ "$(have $a $b)" = "$((b-a+1))" ] && break
    log "chunk $a-$b incomplete ($(have $a $b) frames)"
  done
  [ "$(have $a $b)" = "$((b-a+1))" ] || { log "STOPPED: chunk $a-$b failed twice"; exit 1; }
  log "done $a-$b"
done

# blank frames: a lost WebGL context (low RAM) writes plain white JPEGs (~24 KB; a real frame is ~400 KB). The hook's
# white flash makes a few legitimate ones, so more than 8 means a bad stretch: stop, delete them and re-run.
blank=$(find "$FR" -name 'f_*.jpg' -size -60k | wc -l)
if [ "$blank" -gt 8 ]; then log "STOPPED: $blank blank frames (delete them: find \"$FR\" -name 'f_*.jpg' -size -60k -delete, then re-run)"; exit 1; fi
log "encoding"
OUT="$STORY/vasa-warship.mp4"
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$FR/f_%04d.jpg" -i "$STORY/audio/mix.wav" \
  -map 0:v:0 -map 1:a:0 -c:v libx264 -crf 19 -preset slow -threads 4 -pix_fmt yuv420p -c:a aac -b:a 320k -t 70.5 -movflags +faststart "$OUT"
vf=$(frames "$OUT")
ad=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of default=nw=1:nk=1 "$OUT")
log "final: $vf video frames (want $TOTAL), audio ${ad}s (want 70.5), $(du -h "$OUT" | cut -f1)"
log "ALL DONE"
