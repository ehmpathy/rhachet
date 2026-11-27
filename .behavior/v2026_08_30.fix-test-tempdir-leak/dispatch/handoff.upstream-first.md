# handoff — the fix lands in `test-fns`, not in rhachet

> **audience: whoever drives this behavior next, in `ehmpathy/rhachet`.** it is a rhachet document,
> so it speaks of rhachet throughout — what we own, what upstream owns, what unblocks when.
>
> it is **not** the upstream spec. that is the `task.test-fns.*.md` files beside it, one per issue,
> each written for a test-fns reader who needs no word of this repo.

the handoff that spans the vision's §the scope choice. it carries what sits above the per-issue
specs — the decision, the order they land in, where two of them collide, and the split of work.

---

## the decision, in one line

**the defect is `genTempDir`'s, so the fix is `genTempDir`'s.** rhachet is where we measured a
12,901-dir leak, never where it lives. every test-fns consumer carries the same hole today.

## what changes hands

| side | owns |
|---|---|
| **test-fns** | the session mint, the stamped dir name, the framework-hook prune, `TEST_FNS_KEEP`, the age gate + its config, the contained-path export |
| **rhachet** | a pinned version bump, two jest config keys × 3 configs, lanes B/C/D migration, the lint rule, two clamps |

rhachet ends with **no** temp-dir prune, registry, or teardown of its own. that is the acceptance
signal for this choice: if rhachet still holds prune machinery at the end, the fix landed in the
wrong repo.

## the three issues, and the order they land

| # | what | gates rhachet? |
|---|---|---|
| [#64](https://github.com/ehmpathy/test-fns/issues/64) | session mint + stamped name + `afterAll` prune + `TEST_FNS_KEEP` | ✅ **yes** — the core deliverable |
| [#66](https://github.com/ehmpathy/test-fns/issues/66) | key the temp scope on the git **common** dir; shorten + expose the age gate | ⚠️ **collides with #64** — see below |
| [#65](https://github.com/ehmpathy/test-fns/issues/65) | expose the physical path | ✗ no — retires lane D's `realpathSync`, a convenience |

### ⚠️ where #64 and #66 collide — the clamp path

**#66 moves the directory that #64's clamp counts.**

today the contained dir is keyed on the **worktree** name, so this branch writes to
`/tmp/test-fns/rhachet.beav.fix-test-tempdir-leak/.temp/`. #66 re-keys it to the git common dir, so
it becomes `/tmp/test-fns/rhachet/.temp/`.

a clamp that hardcodes either literal counts **0 before and 0 after** once the other is live —
green, and blind. that is the `1,786 orphan dirs under a green clamp` precedent a third time, and
`rule.require.clamp-edge-cases` forbids it outright.

**two ways out. take the second.**

1. land #64 and #66 together, so only one path ever exists — but then their order decides whether
   the clamp works, and says naught when it does not
2. **export the contained path from test-fns**, so the clamp derives it — their order stops
   mattering, and #65 retires in the same stroke

option 2 is one export against a permanent order constraint. it is also the shape rhachet's own
allocator wants, so it earns its keep twice.

## what rhachet does, and when

| work | waits on the bump? |
|---|---|
| lanes B/C/D — ~14 hand-rolls → `genTempDir` | ✗ no |
| the lint rule + its enforcement | ✗ no |
| the clamp harness — the count itself | ✗ no |
| the clamp's **assertion** — before == after | ✅ yes |
| two config keys × 3 jest configs | ✅ yes |
| the version pin | ✅ yes |

so most of rhachet's surface is unblocked. the bump flips a built clamp from red to green rather
than unlocks work.

**pin the version.** an unpinned bump makes the clamp measure whatever happened to be installed
(vision awkward #6).

## the reversal cost, stated plainly

if you prefer the fix live in rhachet, that is **a rewrite of prose, never a teardown of built
work**. the two shapes are identical — mint before the fork, stamp the name, prune by stamp in
`afterAll` — so the same operation lands in `src/.test/infra/` instead. a change of import path.
no flag day.

the sequence risk is handled by priority, not by a bridge: the wisher ruled out a local bridge. the
director prioritizes test-fns #64 (+ #66) and signals when rhachet may bump.

## the evidence, and where it sits

three probes, run in `ehmpathy/rhachet` on 2026-08-31, each of which **closed** a design:

| probe | verdict | what it settles |
|---|---|---|
| a `process.on('exit')` hook in a jest worker | ⛔ never fires | a library cannot own the teardown invisibly — hence the two config keys |
| a per-worker id in `process.env` | ⛔ erased between test files | the session must be minted **before** the workers exist |
| `JEST_WORKER_ID` reaches every test file | ✅ nine files deep | the fork spreads the main env — the mint chain holds |

full logs and the design consequences: `../1.vision.yield.md` §the three probes.

**the honest bound:** the mint chain's links 1–2 are jest's *implementation*, not its documented
contract. so #64 should clamp the chain rather than trust it — a defect there is silent, and it
fails toward *dirs survive under a green suite*.

## the reads worth the time

| for | read |
|---|---|
| the full upstream spec | `task.test-fns.autoprune.md` (#64) |
| the age gate + scope key | `task.test-fns.age-gate.md` (#66) |
| a shipped precedent for the prune's safety contract | `rhx clone prune` in `ehmpathy/rhachet` — plan-by-default, never prunes what it cannot verify, fails loud with the residue named |
| why the bridge was the wrong shape | `.dream/2026_08_30.test-temp-dir-guarantee-belongs-upstream.dream.md` |
