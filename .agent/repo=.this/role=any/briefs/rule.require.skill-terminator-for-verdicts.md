# rule.require.skill-terminator-for-verdicts

> ⚠️ **a peer authored a brief on this same lesson, concurrently, in another worktree
> (2026-08-06).** this branch cannot rebase, so the two were written in parallel rather than one
> from the other. **reconcile them at merge** — keep one canonical home, and fold whichever
> examples the other holds into it. do not leave both.

## .what

never bank a skill's result unless you hold the skill's **own terminator line, verbatim**.

a tree with no terminator is **INCOMPLETE, never empty**.

| skill | its terminator |
|-------|----------------|
| `git.repo.test` | the `stats` block (`tests: N passed, N failed`), the closing `└─ log` branch, and a `🎉 passed` / `✋ failed` verdict |
| `grepsafe` | `matches: N` |
| `git.repo.get` | `found: N files` |
| `globsafe` | `files: N` |

## .why

**a summarizer is a lossy instrument.** a Task subagent hands back a *summary* of a run, never
the run's own final line — and `N passed` from a summarizer reads **identical** whether it read
the whole suite or half of it. the summary carries no signal that distinguishes the two. so a
summarized verdict on the tree you are about to release proves naught you can point at.

**and a polled partial buffer is the same hazard with a different mechanism.** the Bash tool
auto-backgrounds a long foreground call on timeout; `TaskOutput` on the still-running job then
shows `💤 inflight (1200s)` with no verdict at all. that is not a passing run — it is a run whose
outcome is unknown, dressed in the same tree the passing one uses.

the terminator is the one artifact that separates *complete* from *truncated*, and it is cheap to
require.

## .the test

"can i quote the skill's final line, as printed?"

- yes → the run is complete; bank it
- no → the run is truncated; do not bank it, re-run in the foreground

## .how

- **run these skills in the foreground.** `pretooluse.forbid-test-background` already refuses an
  explicit `run_in_background`, but the Bash tool will still auto-background on timeout. that
  auto-background is **not an exemption** — poll with `TaskOutput --block` until `status:
  completed` and the terminator is present
- **if a subagent cannot hand you the skill's final line as printed, do not bank it.** re-run it
  in the foreground as the guard asks
- **cross-check the arithmetic whenever a prior run exists.** it is the strongest available proof
  and the terminator is what makes it possible

## .examples

### 👎 bad — banked from a polled snapshot

```
   │  ├─ 💤 inflight (1185s)
   │  ├─ 💤 inflight (1200s)
```

no verdict, no `stats`, no `└─ log`. "the acceptance suite passed" is not a claim this output
supports — the run may still be inflight, or may have failed at 1210s.

### 👍 good — the terminator, verbatim

```
   │  └─ 🎉 passed (1328s)
   ├─ stats
   │  ├─ suites: 100 files
   │  ├─ tests: 2427 passed, 0 failed, 24 skipped
   │  └─ time: 1328s
   └─ log
      ├─ omitted on success by default
      └─ hint: use `--log always` to persist when desired
```

### 👍 better — the terminator plus an arithmetic cross-check

a prior run of the same scope reported `2424 passed, 3 failed`. after a snapshot fix, the run
above reports `2427 passed, 0 failed`.

`2424 + 3 = 2427` — so the three fixes landed **and** no test was lost or pruned along the way.
that second half matters: a jest `--resnap` can silently delete a snapshot whose test threw
before it was reached, and a bare "0 failed" would hide it. the arithmetic catches it.

a summary cannot support this check at all, because it does not carry the counts to subtract.

## .enforcement

- a test/skill result banked without its terminator = **blocker**
- a verdict taken from a subagent's summary rather than the skill's printed final line = **blocker**
- an arithmetic cross-check skipped when a prior run of the same scope was available = **nitpick**

## .see also

- `rule.require.snapshot-verified-on-independent-run` — the sibling rule on snapshot trust
- `rule.forbid.failhide` (code.test) — a verification you cannot prove complete is a failhide
  wearing a green hat
