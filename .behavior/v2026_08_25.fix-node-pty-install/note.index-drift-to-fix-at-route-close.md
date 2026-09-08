# note — index drift to fix at route close

> ⚠️ **this note is instance-bound and dies with the behavior.** it exists because the wisher
> holds the stage lever (*"stage ability is only granted at the very end"*), so the index has
> drifted from the worktree over 76 iterations with no chance to reconcile. it is what the human
> needs at the moment they grant it, and it is useful to nobody after.

**measured 2026-09-07 (i076).**

## 🔴 THIRTY-EIGHT staged entries for files that no longer exist on disk

> 🚨 **re-measured. this section first read "three", and three was the count of ONE category.**
> the real predicate is `git ls-files --deleted`, and it returns **38**. the earlier figure came
> from a scan of `src/` alone — the same instrument error the route has now made twice: a subset
> measured, and its count reported as the whole.

```
git ls-files --deleted   →  38
   ├─ 16   .dream/*                      pruned after dispatch to github
   ├─ 16   $route/dreams/*               their symlink mirrors, pruned with them
   ├─  5   src/domain.operations/clone/  the two retired class names + a snapshot
   └─  1   .dream/2026_08_13.trait-firstclass-role-attribute.dream.md
```

`AD` = added to the index, then deleted from the worktree. **a commit today would resurrect all 38
— sixteen dreams already filed as github issues, their sixteen symlinks, and five retired sources.**

⚠️ **the sixteen dreams are the dangerous rows**, and not because they are many. they were pruned
*deliberately*, after dispatch — so to resurrect them is to re-open sixteen items the round already
closed, each now a **false record** in the same shape this route has named three times.

### the src rows, verified retired rather than reverted

they are genuinely retired, not lost. the operation was renamed twice as the class split landed:

```
computeCloneSocketFallback   →  asCloneSocketFallbackError   →  asCloneSocketOmissionReasonError
        (deleted)                     (deleted)                        (live, on disk)
```

✅ **verified retired, not reverted:** a grep of `src/` for `asCloneSocketFallbackError` and
`computeCloneSocketFallback` returns **no matches**, and `--what types` passes. the successor
`asCloneSocketOmissionReasonError.{ts,test.ts}` is on disk and referenced.

⇒ **the fix at close: drop all 38 from the index** rather than commit them. one command reconciles
every row, because each is the same condition:

```sh
git ls-files --deleted | xargs git rm --cached --
```

⚠️ **verify the dream rows before that runs.** each of the sixteen should have a github issue behind
it (`#503`, `#505`–`#507`, `#510`, `#515`–`#517`, and the rest). a dream pruned with no dispatch is a
lost find, not a closed one — and the prune trail is the only record that it happened.

## 🟡 24 untracked files under `src/` + `blackbox/`

`git ls-files --others --exclude-standard -- src blackbox` lists 24, and most are this round's
own deliverables — `asCloneSocketOmissionReasonError`, `asCloneReachBreadcrumb`,
`asCloneAddressHuman`, `delCloneStagedDir`, `asCliErrorClassified`, `getLibcFromProcess.test.ts`,
`classifiedErrorVocabulary.test.ts`, and more.

⚠️ **this does NOT blind the peer reviewers, and I checked rather than assumed.** the review's
own scope reader includes them:

```
src/domain.operations/review/getAllFileDiffsFromRange.ts:86
  const output = execSync('git ls-files --others --exclude-standard', { … });
```

⇒ so an untracked file IS in the review diff. **an earlier draft of this note claimed the
opposite and it was wrong** — the inference *"untracked ⇒ invisible to a git-diff-scoped
reviewer"* is plausible, and false here. recorded so the claim is not re-derived.

what it DOES do is enlarge that diff, which is the overflow cause already recorded in
`blocker/5.1.execution.from_vision.md`.

⇒ **the fix at close: stage them all.** they are the work.

## the lever

```sh
rhx git.commit.uses set --quant N --push block --stage allow
```

measured this round: `rhx git.commit.uses get` → `no quota set`, and `rhx git.stage.add <file>`
→ exit 2, `stage not allowed`. so the index cannot be reconciled by the driver.
