#!/bin/bash
# Final render of "The Skyscraper That Melted a Car" on a local GPU (ANGLE), 2K vertical (1440x2560):
#   1. render WalkieShort in 300-frame chunks, skipping chunks already done (restartable), checking every frame count
#   2. join the chunks, add the final mix (audio/mix.wav; Remotion writes a silent track, so map 0:v + 1:a),
#      re-encode at crf 19 (keeps the file under GitHub's 100 MB) and check both durations
# Chunks stay local (not committed). Bundles go to D:/remotion-tmp so the system drive does not fill.
set -u
cd "$(dirname "$0")/.."
export TEMP="D:/remotion-tmp" TMP="D:/remotion-tmp"
REPO=$(git rev-parse --show-toplevel)
STORY="$REPO/stories/walkie-scorchie"
CH="$STORY/render/chunks"
TOTAL=2115; STEP=300
mkdir -p "$CH"
frames() { ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nw=1:nk=1 "$1" 2>/dev/null | tr -dc 0-9; }
log() { echo "$(date +%T) $*"; }

for ((a=0; a<TOTAL; a+=STEP)); do
  b=$((a+STEP-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=$(printf "%s/c_%04d.mp4" "$CH" $a)
  [ -s "$f" ] && continue
  for try in 1 2; do
    log "chunk $a-$b (try $try)"
    rm -f "$f.tmp.mp4"
    npx remotion render src/index.ts WalkieShort "$f.tmp.mp4" --frames=$a-$b --gl=angle --concurrency=2 --timeout=600000 \
      --codec h264 --crf 16 --scale 1.3333 --log=error 2>&1 | grep -v GroupMarker | grep -iE "error" | head -3
    n=$(frames "$f.tmp.mp4")
    if [ "${n:-0}" = "$((b-a+1))" ]; then mv "$f.tmp.mp4" "$f"; break; fi
    log "chunk $a-$b incomplete (${n:-0} frames)"
  done
  [ -s "$f" ] || { log "STOPPED: chunk $a-$b failed twice"; exit 1; }
  log "done $a-$b"
done

log "joining chunks"
ls "$CH"/c_*.mp4 | sort | sed "s/^/file '/; s/$/'/" > "$CH/list.txt"
OUT="$STORY/walkie-scorchie.mp4"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$CH/list.txt" -i "$STORY/audio/mix.wav" \
  -map 0:v:0 -map 1:a:0 -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -c:a aac -b:a 320k -t 70.5 -movflags +faststart "$OUT"
vf=$(frames "$OUT")
ad=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of default=nw=1:nk=1 "$OUT")
log "final: $vf video frames (want $TOTAL), audio ${ad}s (want 70.5), $(du -h "$OUT" | cut -f1)"
rm -f "$CH/list.txt"
log "ALL DONE"
