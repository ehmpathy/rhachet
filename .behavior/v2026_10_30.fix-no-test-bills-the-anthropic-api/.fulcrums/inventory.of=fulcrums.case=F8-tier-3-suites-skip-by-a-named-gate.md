# F8 — tier-3 live-brain suites skip by a named gate, not fail loud

## .the fork
- (a) a tier-3 suite runs as `describe.skip` under its own title, with a `test.todo` row that names the tier and the flag (`BRAIN_LIVE_SCOPE=all`), unless the flag is set
- (b) a tier-3 suite fails loud on every default run, as `rule.forbid.failhide` (mechanic) asks of an absent resource
- (c) a tier-3 suite runs live on every push, as before

## .taken
(a). the absent input is not a resource the caller forgot; it is spend the commander forbade. under S5 every live-brain test beyond the smoke tier is skipped unless a named flag targets it, and never silently. (b) would turn every default run red on purpose, so a real red reads the same as a gated suite. (c) is the spend this tree exists to stop — the $100 credit went this way. the todo row is the "never silent" half: jest prints each gated suite by name and the flag on every run, and `rule.forbid.live-brain-spend-beyond-the-smoke-tier` forbids a gate with no such row.

## .what (a) gives up
a regression in a tier-3 behavior is caught only on a flagged run. the claude-code contract keeps its live proof in tier 2 (`clone.realbrain`, ungated); `rule.always.replace-spend-when-a-live-brain-test-changes` asks a change to such a suite to run it flagged.

## .rework
clean: `describeBrainLiveOnDemand` is the one gate; flip its default, or move a suite back to `describe`.

## .confidence = 90%
the commander set the shape (S5); the mechanic rule's text reads against it, so the call rests on the commander's word, not the rule.

## .where
`src/.test/infra/describeBrainLiveOnDemand.ts`; the 18 suites it wraps; `rule.forbid.live-brain-spend-beyond-the-smoke-tier.md`.
