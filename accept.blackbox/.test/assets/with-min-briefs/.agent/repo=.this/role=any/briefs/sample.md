# sample brief

this is a sample brief written in full human-readable prose. it contains verbose explanations
and extra context that helps humans understand the rule, but costs tokens for robots.

## .what

a test brief that validates compressed brief preference at boot time.

## .why

when a `.md.min` counterpart exists, the loader should prefer the minified variant for content
while the `.md` path remains the stable identity in the `<brief>` tag.
