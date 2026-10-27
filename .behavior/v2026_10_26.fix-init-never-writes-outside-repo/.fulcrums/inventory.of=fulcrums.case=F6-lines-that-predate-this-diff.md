# F6 — lines that predate this diff are out of its scope (a dispute)

## .the fork
several lanes grade code that main already held before this branch: the
`CLAUDE_SETTINGS_FILENAMES` import in the brain dir layout, the `BrainDirBootRender` type file,
the shield's `(input, logic)` shape, `delEntryIfPresent`'s arrow-only `UNLINKED` effect (a real
file in a grove-less box is dropped with no row), the fork-copy pattern, the fs calls not
injected, the `set` verb on a findsert, the `setBrainDirBoot` catch, the seed fallbacks, the
`O_NOFOLLOW` asymmetry, and the effects the layout omits. so:
- A: repair each here
- B: leave each to its own change

## .taken
B, for what remains. each line is in `origin/main` as written; measure it with
`git show origin/main:src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`, which
holds the `CLAUDE_SETTINGS_FILENAMES` import and `delEntryIfPresent` verbatim. this branch split
that file in two (the leaf moved to `setBrainDirSettingsLayoutWithinLock.ts`), so these lines now
show in the diff as a move, not as new code.

the silent drop is the wisher's prior decision: one answer, no kept-aside copy
(`inventory.of=requirements.case=7`). a move of the filenames constant to a shared module, or a
new effect variant, touches every importer and every layout snapshot across actor, enroll and
init. that would widen a hotfix that dev-env#167 waits on.

where a graded line sat beside a touched one and the fix was safe and clean, it was fixed here
instead of disputed: the second export (split into its own file), the named return type (now
inline), the `existsSync` grove probe (now `isFile`), the `found` ternary (now
`asEntryFoundText`), the writer that throws before its first await (clamped, red then green), and
the non-Error rejection (normalized, with a hint).

two more, raised at 5.3:
- **the `jest.mock` calls in `execUpgrade.test.ts`.** each mock sits in `origin/main` as is; this
  diff edits only the comments above them. a move to an `.integration.test.ts`, or to injected
  fakes, rewrites a suite this change does not otherwise open
- **the actor row's `hash=<h>: <error>` label, and the `roles` key.** `asEnrolledActorHookSyncRow`
  prints the row as `<exid>: <outcome>` in `origin/main`, for every actor row, fault or change;
  this diff hangs its detail leaves beneath that row and does not touch it. the colon there is
  one rule (`rule.forbid.colons-in-stdout`, fix forward on touch); its repair moves every actor
  row in every hook snapshot, so it rides with dream item 13's tree reshape. `roles` names a list,
  and a list of one is still a list: the key reads the same for an actor of one role or of four

two more, raised at 5.3 i004:
- **the `✨ rhachet upgraded locally` banner after a fault, in the upgrade journey.** the banner and
  its place after the hook section sit in `upgrade.acceptance` on `origin/main`; this diff adds a
  journey that meets it and does not touch the render. a banner gated on the exit is its own change
  to `execUpgrade`'s output
- **`execUpgrade.test.ts` whens that re-run the act per then.** every site r7 names, `[case1h]`
  among them, is on `origin/main` as is; this diff's 12 lines there are comment and title edits
  (`git diff origin/main -- src/domain.operations/upgrade/execUpgrade.test.ts`). a `useThen` per
  when rewrites a suite this change does not otherwise open

two more, raised at 5.3 i005:
- **upgrade's last line, `then rerun \`rhx upgrade\``, beside a row hint that names
  `rhx init --hooks`.** the last line is `execUpgrade`'s own on `origin/main`; the row fixes one
  actor, the last line re-runs the command the human ran
- **the `💥 MalfunctionError: N hook sync error` header over a `✋ ConstraintError` row.** the header
  and its class predate this diff, which only moved it after the loop; it classes the run, the row
  classes its own error. a reclass is a change to the summary contract

## .rework
clean — each is its own small change, none ripples into this diff.

## .confidence
93%. main is the record; the doubt is whether the wisher wants any of them folded in.

## .where
the files above; `git show origin/main:<file>` shows each line before this branch.
