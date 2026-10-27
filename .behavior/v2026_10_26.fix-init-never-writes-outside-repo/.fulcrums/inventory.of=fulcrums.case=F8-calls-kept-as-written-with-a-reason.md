# F8 — calls of this diff kept as written, each with its reason (a dispute)

## .the fork
some concerns grade a choice this diff made on purpose. so:
- A: change each
- B: keep each, and say why

## .taken
B, per call:
- **the inline `instanceof BrainDirOutsideRepoError` guard** in the actor settlement. one
  `instanceof` and an early return of a literal is a simple conditional, which
  `rule.forbid.decode-friction-in-orchestrators` names as no friction. a transformer named
  `asSkippedActorOutcome` would hide a two-line guard behind a hop
- **the boot sweep and the hook sync each warn a skipped brain dir.** each phase names the skip it
  met, so a run that reaches only one phase (`rhx init --hooks` vs a boot-only sweep) still warns.
  to fold them would thread phase state through `invokeInit` and `execUpgrade`, a ripple past
  this hotfix. noted as a clean rework in the yield's `.deviations`
- **`setBrainDirBoot` imports the guard from `actor/enrolled`**, and the hook sync imports the
  skip helpers from there. the brain dir lives under the actor dir, so its guard is the actor
  context's; boot already reaches into `actor/enrolled` for `asRoleSlugsInEnrollmentOrder` and
  `REPO_ACTOR_EXID`. one owner of the guard beats a copy per context
  (`has-consistent-mechanisms`)
- **no read-only probe on an actor's fault path.** a faulted actor already prints its row, roles,
  path and fix. a probe there is one more fs read that can itself throw and so replace the fault
  the human must read — the same hazard a peer lane flagged in the shield
- **the shield test's `genScene` keeps its one `writeFileSync` inline.** it is a three-line fixture
  whose `.what` names that write, and no other test writes the file that way; a helper for one
  call adds a hop and no recomposition

- **the `assert*` and `emit*` prefixes.** `assertBrainCliVersionFloor` is this repo's precedent
  for a guard that throws or returns void; `emit*` is the extant name of each stdout printer in
  the init tree. a rename would split one family across two names
- **the `emit*` split of `syncAndReportBrainDirBoots`.** the boot phase gained a skip block of its
  own, so the file grew a third printer; one procedure per file
  (`rule.require.single-responsibility`) put each printer in its own file. the split moves no
  line of output; the acceptance snapshots hold byte-identical where no skip occurs

raised at 5.3:
- **the detail keys `path`, `found`, `lands at`.** they are not a pair of halves: `path` is where
  the name sits in the repo, `found` is what sits there (`not a file`, `a symlink to …`), and
  `lands at` is where a link reaches. three concepts, three keys, each a short phrase a human
  reads at once. `lands at` is the word the whole behavior uses, in the warn, the enroll refusal,
  the error metadata (`landsAt`) and the vision; a rename to fit a shape would fork that word
- **a given's `useBeforeAll` that sets the scene and runs the act once.** it is the extant form of
  every suite this diff touched (the layout, the shield, the actors root, the self-ignore), and of
  their cases before this branch. the new cases follow it, so each file reads one way. the one
  case that ran its whole scene inside a `then` (`setBrainDirBoot` case5) was moved to the form,
  and the layout's new case12 runs its act in `useThen`. a sweep of every extant case to
  `useThen` is a test-only refactor across five files, with no behavior change
- **`setRepoActorBrainDirLayoutBeforeInits` returns null on a fault.** it is the pre-init step;
  the boot sync re-runs the same step later in the same run and reports its fault there, with
  its row and exit code, so a fault is never lost — it prints once, at the phase that owns it.
  to carry the first error out too would print the same fault twice
- **the brain cli as an external contract.** the hook sync writes a file the brain cli reads; the
  real write is held by the built-binary acceptance suite (`init.hooks.outside-repo`, no mock),
  and the adapter's own write by `config.dao.writeOutside.integration.test.ts`, on a real fs. the
  real read by claude of that config predates this diff and has its own suites
  (`rule.allow.acceptance-spawns-real-brain-cli`). the mocked file `syncHooksForLinkedRoles.integration`
  documents each mock and names its `.real`
- **the dao's read of `settings.of.repo.json` follows a link and lets a raw `EISDIR` surface.** the
  dao is the leaf read; its contract is "absence alone reads as absent, every other fault
  surfaces", pinned by `config.dao.integration.test.ts` case5. the human never meets that raw
  errno: the derivation checks the name's shape before it reads (`setActorSettingsDerived.ts`, the
  `!statRepo.isFile()` branch), and the layout findsert, which runs before every sync, refuses a
  link or a dir with `settings.of.repo.json must be a real file`, the `found` text and a fix
  (acceptance `init.hooks.outside-repo` case15, case16). an `O_NOFOLLOW` read here would turn a
  surfaced fault into a silent `null` for a shape the layout already refuses, a second answer
  for one state
- **the enroll refusal prints as the cli's generic error block.** enroll throws the same
  `BrainDirOutsideRepoError` init catches; enroll does not catch it, so the cli's one error printer
  renders its header and metadata, as it does for every ConstraintError enroll throws. a bespoke
  treestruct for this one error is a second printer for one class; the header and the three keys
  are the same facts init prints
- **the upgrade skip has no journey of its own.** `execUpgrade` calls the same
  `syncHooksForLinkedRoles` that init calls, and the skip is decided and rendered inside it; the
  upgrade fault journey (case12) proves upgrade reaches that render. the skip cell is itemized in
  slice 0 as equivalent by code, never as walked
- **the `/TMP_OUTSIDE` and `/TMP_HOME` masks that a wider mask already covers.** they are a no-op
  today, and a guard the day `asSnapshotSafe` stops to mask a temp root. to remove them touches
  each call site for no change in any snapshot
- **`landsAt` in the enroll refusal, `lands at` in the init warn.** the first is the metadata key,
  camelCase as every metadata key is; the second is the treestruct label init renders from it
- **`skipped = outside the repo` as the skip row's leaf.** the key is the one word on that row that
  says the actor was skipped; `⚠️` marks every warn. `reason =` would carry a reason with no verdict

## .rework
clean — each is local to the diff.

## .confidence
93%. the reasons are on the page; the doubt is taste, chiefly the double warn.

## .where
`syncHooksForLinkedRoles.ts` · `syncAndReportBrainDirBoots.ts` · `setBrainDirBoot.ts` ·
`withBrainDirSettingsShield.integration.test.ts`.
