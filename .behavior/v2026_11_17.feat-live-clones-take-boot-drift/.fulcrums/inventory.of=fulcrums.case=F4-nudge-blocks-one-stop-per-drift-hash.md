# F4 · the nudge blocks one stop per drift hash, latched in the clone dir

## .the fork

- **a.** exit 0 with stdout — the human sees it in the transcript view; the clone never does
- **b.** exit 2 with stderr, every stop while over the threshold
- **c.** exit 2 with stderr, once per drift hash; a latch file in the clone dir

## .taken = c

the wish asks that the clone "knows". a Stop hook reaches the brain only by a block (exit 2 or
`decision: block`), so (a) fails the wish. (b) turns every stop into a forced extra turn, the shape of
the 2026-09-22 incident in `rule.forbid.framework-owned-hooks`. (c) tells once per drift state. the
latch derives from this run (what this session was told), so it belongs in the clone dir.

## .rework = clean

## .confidence = 75%, why

a forced extra turn per drift change may still be one too many for a print-shaped work clone; an
alternative is a `systemMessage` to the human alone.

## .verdict

reversed by the commander, review on ehmpathy/rhachet#770, 2026-11-23: a clone cannot compact itself,
so a block spends a turn for naught. the hook never blocks: it prints `{"systemMessage": …}` on
stdout, exits 0, once per drift hash (the latch stays), and names `/compact`, the
`rhx clone say … --what /compact` send, and respawn.
