# F9 — F6, F7 and F8 stay outside this pr, each planned as its own pr

## .the fork

review r1 blocker.4 cites `rule.forbid.deferrals-short-of-a-dedicated-pr`: none of the three is a
massive dirty refactor, so each is owed now. fix all three here, or keep each as its own pr.

## .taken, and why at the time

keep each as its own pr, with a title and a bounded diff. the `.dream/` notes stay as the shape of
each fix; the pr plan below is the record the rule asks for.

| case | planned pr | bounded diff | why not here |
|---|---|---|---|
| F6 | `fix(brain-dir): a box with no grove leaves the tracked settings arrow in place` | `setBrainDirSettingsLayout.ts` (or `BRAIN_DIR_NAMES_UNTRACKED`), plus a groveless clamp | either fix reverses a wisher call: keep an arrow to an absent file (`define.brain-dir-layout-is-one-for-every-actor`), or untrack `settings.json` against the 2026-09-29 call that the repo actor commits the settings names. a wisher call is not the driver's to make inside a pr about machine names |
| F7 | `fix(test): deflake the daemon, clone-say and pnpm probes under a full integration load` (with `vaultAdapterAwsConfig` unit timeouts, seen 2026-11-06) | one test file per flake, plus whatever product fix each diagnosis names | each needs a diagnosis under a full parallel load, and each load run unlocks aws sso, which waits on the human (ruled 2026-11-05). none of the four touches this diff |
| F8 | `chore(deps): publish rhachet-brains-anthropic with the hook bucket move, then bump it` | a release of the other package, then one version bump here | the code fix already exists in `src/_topublish/rhachet-brains-anthropic`; what is left is a publish, and this pr's bounds forbid any release until the commander approves |

## .rework — clean

each pr is independent; naught in this pr depends on any of them.

## .confidence — 65%, and why it is low

the rule sets its bar at a massive refactor, and none of the three is one by size. the case to keep
them out rests on gates the driver does not hold (a wisher call, the sso unlock, a release), not on
size. a council may read the rule as a bar that a gate does not lower.

## .where

`.fulcrums/inventory.of=fulcrums.case=F6-…`, `…F7-…`, `…F8-…`; the dreams under `$route/dreams/`

## .verdict

unruled.
