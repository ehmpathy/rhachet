# F32 · the probe skills keep `npx rhx`, not `pnpm exec rhx`

## .the fork

- **a.** keep `npx rhx` in `boot.compact.probe.sh`, as every probe skill in `.agent/repo=.this/role=any/skills/` does
- **b.** switch the probe to `pnpm exec rhx`, per r1.nitpick.1 (5.3, i001)

## .taken = a

- `rule.forbid.node-modules-bin-rhx` names `npx rhx` as the one canonical invocation of this repo's
  built cli: it resolves through node_modules the way a consumer does, so the `link:.` self-link
  that makes a local build the live code is honored
- seven peer probe skills use `npx rhx`; one skill on a second form is a second convention

## .rework = clean

a find-and-replace across the probe skills; no contract moves.

## .confidence = 85%, why

the repo rule is explicit; the only doubt is whether `rule.require.pnpm-over-npm` meant to reach
`npx` as an exec form, which its text does not say.

## .where

`.agent/repo=.this/role=any/skills/boot.compact.probe.sh`. answers r1.nitpick.1 (5.3, i001).

## .verdict

owed — a council rules at the close.
