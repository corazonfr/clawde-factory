#!/bin/bash
# Renders PisaShort in 300-frame chunks (restartable: finished chunks are skipped), CPU WebGL, 2x MSAA.
cd "$(dirname "$0")/.."
mkdir -p out/pisa/chunks
TOTAL=2118; STEP=300
for ((a=0; a<TOTAL; a+=STEP)); do
  b=$((a+STEP-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=$(printf "out/pisa/chunks/c_%04d.mp4" $a)
  [ -s "$f" ] && continue
  echo "$(date +%T) chunk $a-$b"
  npx remotion render src/index.ts PisaShort "$f.tmp.mp4" --frames=$a-$b --gl=swangle --concurrency=4 --timeout=600000 \
    --codec h264 --crf 16 --log=error --props='{"post":{"msaa":2}}' 2>&1 | grep -v GroupMarker | grep -iE "error" | head -3
  [ -s "$f.tmp.mp4" ] && mv "$f.tmp.mp4" "$f" && echo "$(date +%T) done $a-$b"
done
echo "$(date +%T) ALL DONE"
