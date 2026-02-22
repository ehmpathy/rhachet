# compressed brief

this brief has a `.md.min` counterpart. the loader should prefer the minified variant.
it contains verbose prose that helps humans understand the context but costs tokens for robots.

## .what

a brief with a compressed counterpart for mixed-mode test validation.

## .why

validates that briefs with `.md.min` load from the minified file while briefs without `.md.min`
load from the `.md` file directly.
