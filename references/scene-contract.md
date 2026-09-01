# Scene contract

Every file in `scenes/` is a standalone HTML file that draws one frame on demand.
The renderer owns time. The scene never animates itself.

## Required

```js
window.CLAWDE = {
  duration: 8,      // seconds, fallback if config doesn't override
  fps: 30,
  renderFrame(t) {  // t = seconds elapsed, called once per frame
    // draw the complete frame for time t
  }
};
```

`renderFrame(t)` must be **pure with respect to t** — calling it with t=3.5 has to
produce the identical frame whether it's the first call or the thousandth. That
means no accumulating state like `x += speed`. Derive everything from `t`.

```js
// wrong — depends on how many times it ran
y += velocity;

// right — depends only on t
const y = groundY - Math.abs(Math.sin(t * 3)) * 240;
```

## Config injection

Before the scene loads, the renderer sets `window.CLAWDE_CONFIG` to the contents
of config.json. Read hook text and palette from there so one scene makes many
different-looking videos:

```js
const cfg = window.CLAWDE_CONFIG ?? {};
const hook = cfg.hook ?? "placeholder hook";
const palette = cfg.palette ?? { bg: "#0f0e17", fg: "#ff8906", accent: "#e53170" };
```

## Canvas size

The page renders at 1080x1920. Draw to a canvas of exactly that size positioned at
the top-left with no margin, or the screenshot will include page chrome/whitespace.

```css
html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
canvas { display: block; width: 1080px; height: 1920px; }
```

## Banned

- `requestAnimationFrame` loops that drive the animation
- `setInterval` / `setTimeout` for timing
- CSS `@keyframes` / `transition` on anything that should appear in the video
- `Date.now()` or `performance.now()` anywhere in drawing logic
- non-deterministic `Math.random()` — if you need randomness, seed it from `t` or
  from a fixed seed in config, so a re-render produces the same clip

CSS animation is the most common one to get caught by when porting from Claude
Design. The screenshot fires at an arbitrary point in the CSS timeline, so
CSS-animated elements come out at random positions. Convert them to canvas
drawing or to inline styles set inside `renderFrame(t)`.

## Fonts

Load fonts with `<link>` and wait for them, or the first frames render in a
fallback face and the video visibly changes font mid-clip:

```js
await document.fonts.ready;
```

Do that before assigning `window.CLAWDE`, since the renderer waits for that global
to appear.
