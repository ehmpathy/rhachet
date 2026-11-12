# F8 — the misplaced WebFetch border hook (old adapter) in its own pr, not fixed here

## .the fork

the 5.3 dogfood found the mechanic role's `posttooluse.guardBorder.onWebfetch` hook stored under
`PreToolUse`, re-upserted on every `init --hooks` and never moved, because the installed
`rhachet-brains-anthropic@0.4.3` lacks the bucket move this repo's `_topublish` copy holds. fix it
in this pr, or defer it.

## .taken, and why at the time

its own pr, `fix(hooks): publish the brains-anthropic hook bucket move, then bump it`, gated on a
publish of rhachet-brains-anthropic (F9); its brief is
`.dream/v2026_11_05.fix.publish-brains-anthropic-hook-bucket-move.md`. the cure is a
release of another package and a bump of it; this pr's bump did not touch that package, and the
defect predates the branch. a hand move of the hook in `settings.of.repo.json` would be a
workaround: the next sync under 0.4.3 would read it back the same way.

## .rework — clean

a separate pr either way; naught here depends on it.

## .confidence — 85%, and why it is not higher

the harm is behavioral (the guard fires before the fetch, so it never inspects the fetched
content). a wisher may prefer it fixed before this pr ships. it does not regress here, so the
deferral costs no new harm.

## .where

`node_modules/rhachet-brains-anthropic@0.4.3` (installed) vs
`src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts` lines 130–131

## .verdict

unruled.
