# F57 — may a test's PATH farm list the host's PATH dirs?

- **raised** = 2026-09-30, at `5.1.execution.from_vision`, `review.peer i011` — `repo-rules-blackbox`
  blocker.3 (`install.age.acceptance`, `keyrack.vault.1password.acceptance`)
- **rework** = clean
- **status** = OPEN — **yes, the farm stays**
- **confidence** = **78%**

## .the fork, stated fairly

| | **forbid it** (the reviewer's read) | **keep the farm** (taken) |
|---|---|---|
| the rule | `rule.forbid.reads-outside-the-repo` — "every read stays inside the repo", no exception | the same rule — its subject is agent CONDUCT: a robot that measures host state (`/proc/loadavg`, `free`) to gate a run. its remedy is "scope the run" |
| what the farm reads | the dir listings of each `$PATH` entry | the same set a `spawnSync` resolves on every call. every blackbox suite reads the host PATH at spawn |
| what a stricter shape costs | a committed allowlist of `bash`, `jq`, `node`, … still symlinks to host binaries, so it reads the host too, and it breaks on each box whose tools live elsewhere | none |
| what the farm buys | — | `[case1]` and `[case6]` grade an ABSENT binary on any box, installed or not (`rule.require.hermetic-tests`) |

## .the call, and why

**keep the farm.** the rule draws its line around what a robot inspects to reach a decision. a test
harness that builds a subprocess environment inspects no host state for a verdict. it re-exposes
the same binaries the subprocess would find anyway, minus the ones the case withholds. no shape of
this test avoids the host PATH, because the skill under test is a bash executable that needs host
binaries to run at all.

## .why the confidence is 78%

the rule's text is absolute ("a read of any path outside the repo = blocker") and does not scope
itself to agent conduct in words. its examples and its remedy are all conduct-shaped, but a wisher
may read the line as literal for test code too. if so, the cure is a rule amendment or a fixture
container, not a narrower farm.

## .the re-raise at i018 — one clause corrected, the call held

`repo-rules-blackbox` re-raised this at i018 and refuted one clause of the prior rework note: a stub
dir whose `bash` is a symlink to a known host path does no `readdirSync` of the host, so that read
would **vanish**, not move. the reviewer is right on that clause, and it is struck.

the call holds on a narrower ground the clause never carried: **a fixed PATH cannot grade an absent
binary.** `[case1]` withholds `age`, and `[case6]` withholds `op`. a hermetic `stubs:/usr/bin:/bin`
PATH, the form `enroll.acceptance` uses, carries `age` on any host where apt installed it there,
so the absent case would silently grade the present one. to withhold a binary, the farm must know
which host dirs hold it, and that is a list of those dirs.

## .rework

clean — replace both farms with a committed stub dir that holds only the binaries each case needs,
each a symlink to a fixed host path (`/bin/bash`, `/usr/bin/env`, this process's node), and run
the skill under that PATH alone. it holds on hosts whose tools sit at those paths, and breaks on the
rest.

## .the re-raise at i030 — the sixth, and the lane is exhausted

`repo-rules-blackbox` re-raised this at i030 (after i011, i016, i018, i021, i024), at 8/8 budget.
its new point: an appeal to whether a read is harmless is exactly what the rule refuses. that point
is fair, and it is why this row stays the wisher's call rather than a refutation of mine. the
choice is now posed as two plain options: (a) the line binds fixtures — accept fixed-path stubs, or
drop the two absent-binary cases; (b) the line governs agent inspection — the farm stays.