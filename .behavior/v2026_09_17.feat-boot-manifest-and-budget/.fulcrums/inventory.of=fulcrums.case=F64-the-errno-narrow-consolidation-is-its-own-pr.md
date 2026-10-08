# F64 — is the errno-narrow consolidation the one deferral the deferral rule permits?

- **raised** = 2026-10-02, at `5.1.execution.from_vision`, `review.peer i020` —
  `repo-rules-agent` blocker.1 (`define.statsync-and-lstatsync-suppress-different-errnos.md`)
- **rework** = dirty
- **status** = OPEN — **yes, it is its own PR**
- **confidence** = **70%**

## .the fork, stated fairly

| | **do it now** (the reviewer's read) | **its own PR** (taken) |
|---|---|---|
| the size | "a shared narrow at ~29 sites" — mechanical, bounded | 29 sites across 25 files, in six unrelated subsystems: keyrack daemon, clone sockets, clone identity, role link/unlink, upgrade, boot |
| the rule's exception | — | `rule.forbid.deferrals-short-of-a-dedicated-pr`: a refactor that *"ripples across many callers, and genuinely warrants its own focused review"* |
| this wish's scope | — | boot manifest and budget. five of the six subsystems are outside it |
| the review cost | — | each site is a failure classification; a slip fails OPEN (the dream's own table), so each one owes a focused read the boot reviewers do not grade |

## .the call, and why

**its own PR.** the consolidation re-shapes the errno contract across five subsystems this wish never
opened, and every site carries a fail-open hazard on a slip. that is the rule's exception exactly. the
brief's pointer now names the dedicated PR rather than a dream, and the dream file holds its bounded
scope — 29 sites, one shared narrow — for the PR to adopt. this route may not commit or open a PR, so
the plan is recorded here for the wisher.

## .why the confidence is 70%

the reviewer reads the change as mechanical, and each site is a one-line swap. a wisher may rule the
swap small enough to ride this PR.

## .rework

dirty — a shared `isErrnoOf({ error, codes })` in `src/infra/filesystem`, then a swap at all 29 sites,
each re-read for its own errno set.

## .see also

- `.dream/2026_09_20.the-errno-narrow-is-hand-rolled-at-29-sites.dream.md` — the scope of the PR
- `rule.forbid.deferrals-short-of-a-dedicated-pr` — the exception
