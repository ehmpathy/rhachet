# F13 — extant output in a file this PR touched is left as found

## .the fork
- (a) a peer point that grades output or test code this PR did not change, inside a file it did
  change, is held: the line stays as found, and the point is answered with the diff
- (b) every such point is fixed here, since the reviewer saw it in a target file

## .taken
(a). a review in push mode reads a target file whole, so it grades lines the diff never moved.
`git diff origin/main -- blackbox/cli/__snapshots__/brain-dir-boot.journey.acceptance.test.ts.snap`
shows one line changed (the no-login hint, cell 13); every other snapshot in that file is the extant
render of `rhx init`, `rhx roles link`, `rhx enroll` and `rhx clone get`, owned by those commands.
the same holds for `blackbox/cli/clone.screen-dogfood.realbrain.acceptance.test.ts`, whose diff is
the gate wrap alone (4 lines).

to fix (b) here is a sweep of shared renders: header glyphs, blank-line frames, error markers and
key names across every init, link and enroll snapshot in the repo, under a wish about test spend.
`rule.forbid.colons-in-stdout` and `rule.prefer.scouts-honor` both bound a fix to the lines a change
touches, and forbid a bulk rewrite of extant output.

one point in this class is no blemish at all: jest's own serializer prints a comma after the final
member of a snapped object (`"input_tokens": "__NUMBER__",`). it is jest's format, never the cli's
bytes; the [t3] envelope is a parsed object, snapped as one.

the two auth snapshots r6 compares (`enroll.shared-brain-auth` and `assertBrainAuthNotDead`) differ
in key order and frame because one is the cli's rendered stderr and the other the error object a
unit test snaps; this PR changed one line in each, the hint text, and neither shape.

## .what (a) gives up
the blemishes stay visible in the reviewed snapshots until a change to those commands touches them.

## .rework
clean: each is a render change in its own command, free to land in its own PR.

## .confidence = 85%
the line between a touched file and a touched line is the one this rests on; a reviewer may hold
that a touched file owes its whole contents.

## .where
`.reviews/peer/5.3.verification._.review.i001.*.r006.*` (all 15 points), `r003` nitpick.2,
`r009` nitpick.2.
