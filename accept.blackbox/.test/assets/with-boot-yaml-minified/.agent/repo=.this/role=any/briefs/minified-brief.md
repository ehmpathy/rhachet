# minified brief

this is a brief WITH a minified counterpart. the full version contains verbose explanations
and extra context that helps humans understand the rule, but costs tokens for robots.

## .what

a test brief that validates boot.yml prefers minified content.

## .why

when a `.md.min` counterpart exists, the loader should prefer the minified variant for content
while the `.md` path remains the stable identity in the `<brief>` tag.

## .extra

this section contains extra verbose content that should NOT appear in the boot output
because the `.md.min` file should be used instead.
