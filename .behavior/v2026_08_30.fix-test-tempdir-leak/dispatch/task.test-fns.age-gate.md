## the ask

three changes to the age gate, in order of leverage:

1. **key the contained dir on the git *common* dir**, so sibling worktrees share one scope — this
   dissolves the orphan class rather than a cross-scope walk that hunts it
2. **default `maxAgeMs` to 24 hours**, down from 7 days (`pruneStale.ts:5`, `SEVEN_DAYS_MS`)
3. **let an unreachable dir declare itself deletable**, for the residue #1 cannot reach

## the mechanism, stated once

three properties of the gate, whose conjunction is the defect:

| property | where |
|---|---|
| **caller-triggered**, never scheduled — it runs inside `genTempDir` | `genTempDir.ts:107` |
| **self-scoped** — passed `tempInfra.pathPhysical`, so it scans only the calling repo's own contained dir | `genTempDir.ts:107` |
| age is read from the **dir name**; an unparseable name is preserved | `computeStaleDirs.ts:29` |

so a contained dir is reclaimed **only by a later `genTempDir` call from the same repo**. if no
such call can ever happen again, its whole tree is orphaned at any age. the gate cannot help — no
caller remains to trigger it, and no caller that does remain is scoped to look there.

## 1 — key on the git common dir (the cause fix)

```ts
// computeIsolatedTempBasePath.ts:15-18
const repoDirname = path.basename(input.gitRoot);
return path.join('/tmp', 'test-fns', repoDirname, '.temp');
```

`gitRoot` is the **worktree** root, so every `git worktree` gets its own contained dir. that is
what makes worktree deletion produce a permanent orphan: delete the worktree and its scope has no
future caller.

but a worktree is not a separate repo. its `.git` is a pointer file:

```
gitdir: /home/vlad/git/ehmpathy/rhachet/.git/worktrees/{worktree-name}
```

so the main checkout is always derivable — `git rev-parse --git-common-dir` yields
`/home/vlad/git/ehmpathy/rhachet/.git`, and its parent is the repo every worktree belongs to.

**key the scope there instead.** every worktree of `rhachet` then writes to
`/tmp/test-fns/rhachet/.temp/`, and a deleted worktree's stale entries are reclaimed by the next
run from **any** sibling — including the main checkout. the extant age gate reaches them unchanged:
no cross-scope walk, no liveness probe, no heuristic. the orphan class evaporates.

this preserves the stated purpose of the isolation. per `genIsolatedTempInfra.ts:11-16`, physical
dirs live in `/tmp/` to *"prevent upward module resolution from discovery of gitroot
dependencies"*. `/tmp/test-fns/rhachet/` satisfies that exactly as well as
`/tmp/test-fns/rhachet.some-branch/` — the isolation never needed worktree granularity.

### the one property it costs

today, worktree-level scopes give **accidental** peer-safety: two worktrees run in parallel and
cannot see each other's dirs. a shared scope removes that layer.

we judge the trade worth it, because that safety was never sufficient anyway — **two parallel runs
in the *same* worktree** were always possible and always shared a scope. so a correct consumer
already needs per-run ownership; the worktree layer only hid the need. downstream in
`ehmpathy/rhachet` we fold a run id into the slug and prune only our own, which holds under a
shared scope unchanged.

worth a changelog note either way, since a consumer who leaned on the accidental isolation would
want to know.

### a related latent hazard, while you are in here

`path.basename` collides for two distinct repos with the same directory name — `~/work/foo` and
`~/oss/foo` both map to `/tmp/test-fns/foo/.temp/`. that is extant today and is not caused by this
change, but the same edit is the moment to fix it. a shape like
`{basename}.{8-hex-of-full-path}` keeps the dir human-recognizable while it disambiguates.

## 2 — 24 hours, not 7 days

```ts
// src/domain.operations/genTempDir/pruneStale.ts:5
const SEVEN_DAYS_MS: number = 7 * 24 * 60 * 60 * 1000;
```

7 days is a long tail for a fixture whose useful life is one test run. the case the gate actually
serves — a human who opens a failed test's dir — is served fully by 24 hours. nobody returns to a
fixture on day 5.

the cost of the tail is measured: in `ehmpathy/rhachet` on 2026-08-30, **12,901** abandoned fixture
dirs against 2,484 of all else — ~84% of `/tmp`. that repo's acceptance suite alone makes **432
dirs per full run**, so a 7-day window holds ~21 runs' worth at 3 runs/day. a 24-hour window holds
~3.

rename the constant with the value (`ONE_DAY_MS`), and update the jsdoc at `genTempDir.ts:78` —
*"directories are auto-pruned after 7 days"*.

**expose the window as documented config, not merely an internal param.** a consumer with a
genuinely long-lived fixture must be able to raise it; a consumer who wants a tighter floor must be
able to lower it. an env key (`TEST_FNS_MAX_AGE`) reaches the jest-config path of #64 without a code
change, so the two land together well.

the default matters more than the upper bound: with #64 in place the gate is a **backstop**, not the
primary reclaim, so tune it for "the shortest window a human might still want a failed fixture",
never for safety margin.

## 3 — a self-declared tombstone for the residue

change #1 fixes worktree deletion, which is the common case. it does **not** fix a repo deleted or
moved entirely — `/tmp/test-fns/{repo}/` is then orphaned exactly as before, one level up.

for that residue, prefer a dir that **declares itself deletable** over a prune that guesses:

- `genIsolatedTempInfra` already findserts a `readme.md` + `.gitignore` into the contained dir. it
  could also record the `gitRoot` it was made for
- a later pass reads that record and makes a **checkable** claim — "the repo this belongs to is no
  longer at that path" — rather than a heuristic one
- **age-gate the mark, never act on it at once.** a repo can be temporarily unmounted, or a
  checkout moved and restored. mark on first observation, delete only if it is still absent after
  the gate window. that turns a fragile liveness probe into a two-phase confirmation

this also gives the `git worktree remove` path a natural hook, if a consumer wants to trigger the
mark deliberately rather than wait for the next pass to observe it.

**why a tombstone over a sibling walk.** a prune that walks `/tmp/test-fns/` and deletes what
*looks* abandoned is the same shape as `find -mtime +3` — it cannot tell a stale dir from a live
peer's, so its safety rests on a heuristic. a tombstone inverts that: the dir carries the evidence
of its own abandonment, so the prune verifies rather than guesses.

## context

filed from `ehmpathy/rhachet` behavior `v2026_08_30.fix-test-tempdir-leak` (see
`ehmpathy/rhachet#488`). that behavior builds no local prune — it depends on **#64** to land the
session-scoped teardown here, where every test-fns consumer inherits it.

the two cases #64 deliberately cannot reclaim — a `TEST_FNS_KEEP` hold, and a `kill -9`'d run whose
teardown never runs — both fall to this age gate. that is why the gate must stay (shortened and
exposed, never removed), and why its default is now a load-bearing choice rather than a long tail.

the orphan case is the one no downstream repo can reach at all: the reach needed is one level above
the per-repo scope, and only `test-fns` sits there.

**note on #64.** a session-scoped teardown is also caller-scoped, so a deleted worktree runs no
teardown either — #64 does not subsume any of this. but change #1 above helps #64 too: a shared
scope means a stale dir always has a future caller.

pairs with #64 (global autoprune) and #65 (expose the physical path).
