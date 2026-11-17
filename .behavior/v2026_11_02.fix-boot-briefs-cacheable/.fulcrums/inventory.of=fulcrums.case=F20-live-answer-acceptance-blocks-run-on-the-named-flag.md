# F20 — an acceptance block whose assert needs a live answer runs on the named flag

## .the fork

the director settled F7 as B: a test that needs a funded key skips by default behind `LIVE_BRAIN=1`.
two repo rules kept every real brain-cli acceptance test in the default gate
(`rule.forbid.faked-or-quarantined-acceptance`, the scope table of
`rule.require.live-brain-tests-run-on-a-named-flag`).

- **A** — apply the gate and amend both rules to one boundary: gate only a block whose assert spends the
  paid key; spawn, socket, reach, render, and the `-p` path stay in the default gate
- **B** — apply the gate and leave the rules as they read; the tree then breaks its own rule
- **C** — refuse the gate and keep the reds, against the director's call

## .taken

A. the call is the director's, and a tree that breaks its own rule is the worse state. the boundary
keeps what the forbid rule guards: the gate holds no separate config, and every case that needs no live
answer still runs per PR. main's `describeBrainLiveOnDemand` (F11) moves the same way.

## .rework

clean: two rule paragraphs and the `runIf` marks; a revert is a text edit.

## .confidence — 80%

the director answers for the foreman seat; whether that seat may amend a durable rule, rather than
rule within it, is for the council.

## .where

- `.agent/repo=.this/role=any/briefs/rule.require.live-brain-tests-run-on-a-named-flag.md`
- `.agent/repo=.this/role=any/briefs/rule.forbid.faked-or-quarantined-acceptance.md`
- `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts`, `blackbox/cli/clone.screen-dogfood.realbrain.acceptance.test.ts`,
  `blackbox/cli/clone.transcript-lag.realbrain.acceptance.test.ts`, `blackbox/sdk/replDoorRealSupplier.realnode.acceptance.test.ts`

## .verdict

open, for the council at the end
