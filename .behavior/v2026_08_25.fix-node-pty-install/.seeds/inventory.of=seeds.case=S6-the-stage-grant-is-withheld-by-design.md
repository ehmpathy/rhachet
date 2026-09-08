# seed S6 — the stage grant is withheld until a drive closes, by design

## .said — verbatim, 2026-09-03

> we should catch a dream to dispatch a task into rhachet-roles-bhrain reviwer to make it ultra
> clear that staged vs unstaged is never a review topic

> stage ability is only granted at the very end

> so it will never be allowed before then

## .settled

**the git index is stale throughout review on every drive, and that is a property of the framework
rather than a condition of any one branch.**

the commit/stage grant follows a **closed** drive. so for the whole review phase there is no moment
at which `rhx git.commit.uses allow --global` could be honored — the ask is a request to break the
sequence, never a lever that happens to be down.

⇒ two consequences, and the second is the larger:

| for the | it means |
|---|---|
| **reviewer** | *"the staged changes would re-commit X"* is a **systematic false positive**, emitted on every drive the framework runs, clearable by no driver anywhere |
| **driver** | sort-by-owner has a **third bucket** — *withheld by design* — which looks exactly like the human bucket and is not. an ask routed there is unanswerable, and it re-raises forever |

⚠️ **and the condition cancels itself.** `git.commit.set` stages **from the worktree** at commit
time, so the exact act the reviewer fears is the act that overwrites the state it worries about. a
correct worktree needs no lever at all.

🚨 **the cost, measured on this drive: three consecutive rounds.** i047, i048, and i049 each carried
the same blocker and the same impossible remedy, because a claim written into an escalation is
inherited rather than re-derived.

## .landed

- `.dream/2026_09_03.reseed-reviewer-never-grades-workspace-state.dream.md` — the reviewer half;
  its home is `ehmpathy/rhachet-roles-bhrain`, so it is re-seeded rather than adopted here
- `.agent/repo=.this/role=any/briefs/rule.always.spend-own-levers-before-escalation.md` — the driver
  half: the third bucket, and the test that parts it from a real escalation
- `$route/.reviews/peer/…i049…r010._.taken…` · `$route/5.1.execution.from_vision.yield.md` (item 11)
  · `$route/blocker/5.1.execution.from_vision.md` — the three places the impossible ask was written
