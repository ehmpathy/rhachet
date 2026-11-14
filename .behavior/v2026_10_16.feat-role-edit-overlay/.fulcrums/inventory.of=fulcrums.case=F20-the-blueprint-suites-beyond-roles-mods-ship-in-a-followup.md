# F20 — the blueprint suites beyond roles.mods ship in a follow-up

## .the fork

the blueprint's test tree names six acceptance suites. #702 carries `roles.mods` (31 cases) and
`init.same-slug-roles` (5 cases), plus unit and integration clamps over the mods subdomain. the
r010 peer lane asks for the rest before passage:

- `enroll.mods`: an `of:` that is absent, bare, or unlinked; a usecase 7 delete; a live clone; an
  enroll that usecase 12 refuses
- `init.mods`: usecase 11, `.mods` is no supplier
- `upgrade` [~]: the notice, exit 0
- the `run.skill` and `list` suites over a modded role
- usecase 12 in full: no `boot.md` for the refused actor, and an enroll with the role and one
  without
- same-slug identity: a bare-slug re-enroll keeps its actor dir, `roles boot --role surfer` is
  refused as ambiguous, `roles cost` shows two rows, a `.this` role boots beside a package role
- snapshots of the onStop pester stderr, a mode mismatch, and the `budget:` / `of:` keys
- a token count that moves with the modded payload

the choice: **a — ship #702 with the core suites, and owe the rest as one follow-up PR** (taken), or
**b — hold #702 until all six suites exist**.

## .taken, and why

a. the commander's verdict of 2026-11-06 sets the nano path to the done gate: #702 green and ready
for his review. each extra blackbox suite costs about 10 minutes per run on this host, and five
suites with their fixtures is a second change of the size of the first.

what #702 already proves, end to end: shadow, add and not; the `.md.min` drop; a skill that sources
a shadowed peer; `rhx run` of a shadowed skill; a stale view refused at boot and named in the cost
sweep; a typo refused with the held path it missed; a refusal that leaves an unmodded role's boot
whole; the onStop pester and its fix; a mod deleted; `boot.md` that carries the notice and the tags.

the gaps are coverage of paths that share the code these cases run. no gap is a path with no code.

## .rework

clean. the follow-up adds test files and fixtures only. no contract moves.

## .confidence — 80%, and why it is low

- usecase 12 for the refused actor's `boot.md` is reasoned from the render code, never asserted
- the same-slug ambiguity refusal at `roles boot` is unit-covered and not run as a subprocess

## .risk

medium. a bug in an untested path, such as an enroll that usecase 12 refuses, would reach a clone
of a repo that uses mods. mods are new, so no extant repo carries one yet.

## .where

- `blackbox/cli/roles.mods.acceptance.test.ts`, `blackbox/cli/init.same-slug-roles.acceptance.test.ts`
- `3.3.1.blueprint.product.yield.md`, the test coverage tree

## .verdict

closed — the suites landed in #702. `rule.forbid.deferrals-short-of-a-dedicated-pr` forbids option a,
so the follow-up was pulled in at i004 of `5.1.execution.from_vision`:

- `blackbox/cli/enroll.mods.acceptance.test.ts` — an `of:` absent, unlinked, `.this`, bare over two
  repos then pinned; a mod deleted (usecase 7); usecase 12 — an enroll without the role succeeds
  where the mod is refused
- `blackbox/cli/init.mods.acceptance.test.ts` — usecase 11, `.mods` is no supplier; the stop hook a
  mod arms in `settings.of.repo.json`; usecase 12 at init, then the fix
- `blackbox/cli/enroll.same-slug-roles.acceptance.test.ts` — a bare-slug enroll boots both repos; a
  re-enroll and a second repo of the slug keep the actor dir; a `repo/role` pin; a bare
  `roles boot --role surfer` refused and names `--repo`
- `blackbox/cli/roles.mods.subject.acceptance.test.ts` — a subject-mode role modded: a ref'd add, a
  shadow demoted from say to ref, a shadow of an unnamed brief, a not'd skill; an enroll at a subject
- `blackbox/cli/roles.mods.acceptance.test.ts` — a shadow skill that sources its peer; the stop before
  a render; a release that removes a shadowed or a not'd path; a content edit with no render; a typo
  `not` and its fix; a mod `.md.min`, an orphan `.min`; a glob of three adds; one `[~]` mark among two
  roles. the `roles.cost.mods` suite of the blueprint is folded in here (`[case1]` `[t2]`,
  `[case2]` `[t0.1]`, `[case10]`), since every cost case needs this suite's fixture
- `src/domain.operations/mods/assertRoleModdedViewFresh.integration.test.ts`,
  `setRoleModdedView.integration.test.ts`, `asRoleModFaultsHookReadout.test.ts`,
  `src/domain.operations/role/asRepoSlugKind.scanners.integration.test.ts`
- the requirements inventory, cases 11–23, one per mod behavior, each with its proof by path

- `blackbox/cli/upgrade.mods.acceptance.test.ts` — `rhx upgrade --which local` over a mod pinned
  behind the install: exit 0, the drift notice, its snapshot
- `blackbox/cli/roles.mods.acceptance.test.ts` `[case11.1–11.3]` — the `budget:`, `of:` and mode
  refusals, each snapped; `[case12]` — the token count moves with the modded payload; `[case13]` — a
  not'd skill is not found by `rhx run`; `[case14]` — a hooked role's real package load, and the
  refusal of a not of the skill its hook invokes
- `blackbox/cli/init.same-slug-roles.acceptance.test.ts` `[t3]` — `roles cost --all`, one row per repo

all green 2026-11-07. `rhx list` is proven through `rhx run --skill` instead: `list` needs a
`rhachet.use.ts` config the fixtures do not carry, and both read the one skill discovery.
