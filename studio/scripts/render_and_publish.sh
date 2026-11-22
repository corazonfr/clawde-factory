#!/bin/bash
# Overnight pipeline for "The Tower Saved by a War":
#   1. render PisaShort in 300-frame chunks (CPU WebGL via SwiftShader, 2x MSAA), skipping chunks already done
#   2. commit + push every finished chunk to the current branch
#   3. join the chunks, add the final mix (audio/mix.wav), check durations, commit + push the final mp4
# Restartable: run it again and it carries on from the first missing chunk.
set -u
cd "$(dirname "$0")/.."
STUDIO=$(pwd)
REPO=$(git rev-parse --show-toplevel)
STORY="$REPO/stories/tower-saved-by-a-war"
CH="$STORY/render/chunks"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TOTAL=2118; STEP=300
mkdir -p "$CH"
frames() { ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=nw=1:nk=1 "$1" 2>/dev/null | tr -dc 0-9; }
log() { echo "$(date +%T) $*"; }

publish() { # commit the given paths and push, retrying network errors
  ( cd "$REPO" && git add "$@" && git commit -q -m "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011dsjjmbbC1MVh32i9zZgBS" ) || { log "nothing to commit"; return 0; }
  for d in 2 4 8 16 32; do
    ( cd "$REPO" && git push -q origin "$BRANCH" ) && { log "pushed"; return 0; }
    log "push failed, retrying in ${d}s"; sleep $d
  done
  log "PUSH FAILED (commit kept locally)"
}

for ((a=0; a<TOTAL; a+=STEP)); do
  b=$((a+STEP-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=$(printf "%s/c_%04d.mp4" "$CH" $a)
  [ -s "$f" ] && continue
  for try in 1 2; do
    log "chunk $a-$b (try $try)"
    if [ "$(frames "$f.tmp.mp4")" = "$((b-a+1))" ]; then mv "$f.tmp.mp4" "$f"; break; fi # a finished render from an interrupted run
    rm -f "$f.tmp.mp4"
    npx remotion render src/index.ts PisaShort "$f.tmp.mp4" --frames=$a-$b --gl=swangle --concurrency=4 --timeout=600000 \
      --codec h264 --crf 16 --log=error --props='{"post":{"msaa":2}}' 2>&1 | grep -v GroupMarker | grep -iE "error" | head -3
    n=$(frames "$f.tmp.mp4")
    if [ "${n:-0}" = "$((b-a+1))" ]; then mv "$f.tmp.mp4" "$f"; break; fi
    log "chunk $a-$b incomplete (${n:-0} frames)"
  done
  [ -s "$f" ] || { log "STOPPED: chunk $a-$b failed twice"; exit 1; }
  log "done $a-$b"
  MSG="Render chunk frames $a-$b of The Tower Saved by a War" publish "$f"
done

log "joining chunks"
ls "$CH"/c_*.mp4 | sort | sed "s/^/file '/; s/$/'/" > "$CH/list.txt"
OUT="$STORY/tower-saved-by-a-war.mp4"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$CH/list.txt" -i "$STORY/audio/mix.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -movflags +faststart "$OUT"
vf=$(frames "$OUT")
ad=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of default=nw=1:nk=1 "$OUT")
log "final: $vf video frames (want $TOTAL), audio ${ad}s (want 70.6)"
rm -f "$CH/list.txt"
MSG="Add final video: The Tower Saved by a War ($vf frames, 1080x1920, with sound)" publish "$OUT"
log "ALL DONE"
