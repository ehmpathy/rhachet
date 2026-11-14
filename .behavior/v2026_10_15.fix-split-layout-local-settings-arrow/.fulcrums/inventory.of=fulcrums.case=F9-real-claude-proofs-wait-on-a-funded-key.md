# F9 — two real-claude proofs wait on a funded key, rather than ship unrun

## .the fork
- A: write the two proofs now, unrun — a worktree launch in the real-claude suite, and a snapshot of the
  fresh-clone screen in `brain-dir-boot.journey` [t8.1]
- B: itemize both, read the worktree path from the cli source, and owe the two proofs to the same
  funded-key rerun the real-claude suite already waits on

## .taken = B, and why
every brain turn on 2026-10-17 returned `Credit balance too low` from the `ehmpath/test` keyrack's
`ANTHROPIC_API_KEY`. a snapshot never run is a guess written as a fact
(`rule.require.snapshot-verified-on-independent-run`), and under `jest --ci` an unwritten snapshot fails
the suite — so A would put an unverified file in the diff and a red gate in ci.

what is known without a brain turn:
- the worktree path, read from the cli source (`appendix/research.claude-local-settings-write-path.md`):
  in a worktree claude reads the main checkout's `settings.local.json` as canonical and the worktree's
  own beneath it. both are the arrow to the ambient repo settings, so a plain `claude` in a worktree
  loads the repo's allows and hooks — of both checkouts, where their roles differ. claude dedupes an
  identical hook command, so a hook both checkouts declare fires once
- the fresh-clone screen: [t8.1] already asserts the first launch exits 0 with no default sentinel, and
  that the sentinel arrives after `rhx init` (M7). the snapshot adds the screen's words, not its verdict

first to try on the funded-key rerun (peer r010 n9, i004): split the SessionStart hook fire and the
startup screen out of the model-turn scenarios. if both precede the credit check, they need no funded
key, and the plain-claude hook proof runs on every box. whether they precede it is unmeasured.

## .rework = clean
both proofs are additive tests; no code waits on them.

## .confidence = 75%, low because
the worktree read is from minified source, never a run — a human with a worktree whose roles differ
from main's may see a hook from main's roles fire there.

## .where
`blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` ·
`blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t8.1] · `1.vision.experience.dimensions.md` (D6)

## .which stone owes the green run
the headline critipath (a plain claude runs a repo-only allow and fires a repo-only hook) has a real
test, `brain-config.grove-vs-repo.realbrain` [case2 t0], last green 2026-10-16. the `.home` mirror,
the excludes and the wait changes landed after it, so its green on current code is owed.
`rule.require.experience-catalog-evolution` places that terminus at the **verification** stage:
*"by the time the verification stage passes, every critipath owes a real test"*. this stone is
execution; the rerun is owed before 5.3 passes, and it waits on `ANTHROPIC_API_KEY` in ehmpath/test,
a grant the driver cannot make (r010 i005 blocker.3).

the ask, runnable by a human:
`rhx keyrack set --owner ehmpath --env test --key ANTHROPIC_API_KEY` (a funded key), then
`rhx git.repo.test --what acceptance --against local --env test --mode apply --scope path://brain-config.grove-vs-repo.realbrain`

## .verdict
discharged at 5.3, 2026-10-19, on the funded key:
- the worktree proof: `brain-config.grove-vs-repo.realbrain` [case6] — a plain claude at the root of a
  git worktree fires the repo hook and runs the repo and grove probes with no prompt; 4/4. the source
  read held
- the fresh-clone lock: `brain-dir-boot.journey` [t8.1] "the fresh clone`s first launches and init are
  locked" — each launch's exit and sentinels (nonce masked) and the init stdout; 84/84 on resnap and
  on two independent runs

the worktree reach (a hook from main's roles in a worktree whose roles differ) stays for the wisher at
the close.
