# F3 · the nudge threshold is 200 lines of delta

## .the fork

- **a.** any drift at all
- **b.** a fixed size, in lines, grounded in the brain cli's docs
- **c.** a fraction of the boot (say 10% of `boot.md`)
- **d.** a token figure, per role, set in `boot.yml`

## .taken = b, 200 lines

the delta rides a memory file, and the brain cli's docs name 200 lines as the line past which a
memory file costs adherence: *"target under 200 lines per CLAUDE.md file. Longer files consume more
context and reduce adherence"* (`code.claude.com/docs/en/memory`, quoted in
`define.claude-md-vs-system-prompt`). under it, the drift waits silently for the next compaction.

(a) nags on every one-line brief fix. (c) scales with the boot, and so tolerates a 44k-char carry on
this repo's boot. (d) is a new config surface for a p0 fast follow.

## .rework = clean

one constant.

## .confidence = 70%, why

the 200-line figure is documented for a memory file, not for a drift that supersedes blocks of a
system prompt.

## .verdict

owed, from the wisher at vision review.
