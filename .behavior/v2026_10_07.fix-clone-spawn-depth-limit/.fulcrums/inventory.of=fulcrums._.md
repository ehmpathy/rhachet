# inventory.of=fulcrums

axis: `case` — an occurrence id `F$n-$slug`, declared as each fork arises.

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1-claudecode-reads-as-depth-zero | a caller with `CLAUDECODE` and no depth var is a depth-0 caller; `CLAUDECODE` itself is not read | clean | **ruled — wisher (S3)** | — |
| F2-repl-seam-scopes-process-env | the repl seam scopes `process.env` for the supplier call | dirty | **ruled — wisher (S2)** | — |
| F3-atoms-exempt-from-the-budget | atoms are exempt from the spawn budget | clean | **ruled — wisher (S2)** | — |
| F4-refusal-names-spawn-not-enroll | the refusal says "clone spawn depth limit", not "clone enroll depth budget" | clean | **ruled — wisher (S2)** | — |
| F5-repl-child-drops-parent-serial | a repl child drops the parent's serial and socket | clean | **ruled — wisher (S3)** | — |
| F6-tty-enroll-is-a-human-act | an enroll with an interactive tty on stdin mints a top-level clone; no tty is depth ≥ 1 | clean | **ruled — wisher (S1)** | — |
| F7-raw-claude-session-resets-depth-via-settings-env | a raw `claude` session resets an inherited depth var to 0 via the repo brain dir's settings `env`, with a SessionStart `CLAUDE_ENV_FILE` hook as fallback | clean | **ruled — wisher (S2)**; deferred, see F8 | — |
| F8-raw-claude-depth-reset-deferred | F7 is split: the strip of every clone identity key from the enrolled clone's `--settings` lands here; the supplier's write of the reset key is a planned pr in `rhachet-brains-anthropic` | clean | taken (c), for the council | 85% |
| F9-async-host-marker-leak-deferred | a clone under an `--async` host inherits the host marker and reads as a host; first deferred, then fixed here (the host drops both handoff keys) | clean | taken (a) — fixed in this pr, for the council | 95% |
| F10-brain-door-calls-the-clone-domain | the spawn depth limit moves to its own `domain.operations/spawn/` subdomain, the `term.boundary` the glossary already set, so neither door imports another domain | clean | taken (c), for the council | 90% |
| F11-refusal-render-keeps-the-shared-frame | the leaf refusal keeps each door's extant error frame — enroll's wrapped frame with no `[args]`, the repl doors' top-level frame with it — rather than a repo-wide render-policy change | clean | open — for the council | 75% |
| F12-depth-scope-is-a-with-hof | `withCloneSpawnDepthScope(logic)` takes its call positionally, as every `with*` wrapper does | clean | open — for the council | 85% |
| F13-repl-door-tests-drive-the-real-tty | the repl door's tests set and restore the real `process.stdin.isTTY`, rather than a caller-supplied `isTty` seam the limit must not trust | clean | the test fork stands at (a), for the council; the tty hole is best-guessed as candidate (i) — a tty with a depth var reads that var + 1 — which reverses one S1 clause and leaves the tmux-server-env path open, for the wisher | 80% (fork) · 60% (hole) |
| F14-doc-glyphs-follow-the-repo-house-style | the route's docs keep the repo's `status: RESOLVED` dispute header and the behaver's feel × care glyphs, rather than a trim to the chill-nature tone rule | clean | open — for the council | 85% |
| F15-host-handoff-keys-dropped-on-every-enroll | the two host handoff keys are dropped on every enroll after the depth read, not only inside the host branch, so a stray key never reaches a child | clean | open — for the council | 80% |
| F16-review-render-and-hint-left-to-the-seam | the depth refusal is clamped where rhachet throws it; bhrain's `rhx review` frame is not snapped here, and one hint serves every door | clean | open — for the council | 75% |
| F17-one-depth-read-for-both-doors | one depth transformer serves both doors, and a host marker with no minted depth reads one level loose rather than a fault | clean | open — for the council | 80% |
| F18-repl-door-fitness-stays-a-text-heuristic | the repl-door fitness test reads module text, not types; a repl reached through `ContextBrain` is wrapped at bind time, and each door has its own unit | clean | open — for the council | 80% |
| F19-depth-not-in-the-enroll-handoff | the enroll json handoff does not carry the clone's depth; the readme names which callers mint depth 1 | clean | open — for the council | 80% |
| F20-codex-brain-skips-stay-at-a-model-wall | the 11 pre-extant `openai/codex` brain rows run on `claude/code/haiku` (every codex model is `404 model_not_found` on the test key); one `--brain openai/codex` row asserts the real openai refusal | clean | taken (b) — the supplier swap, for the council | 90% |
| F21-repl-door-real-supplier-stops-at-spawn | the real-supplier repl door's spawn intercept (the counts and the refusal) lives at integration; the acceptance file holds only a live haiku row whose spawn is wrapped, never replaced | clean | taken (d) — split by tier, for the council | 90% |
| F22-allowance-is-permission-not-a-count | the #577 "allowance of one child" is read as permission to spawn one LEVEL below, never a count of one child; a work clone may spawn any number of reviewers | clean | taken (a), for the commander | 80% |
| F24-pty-success-legs-asserted-by-value | the pty and `--async` success legs assert the depth and the mark the child read; only the new leaf refusal frame is snapped | clean | open — for the council | 85% |
| F25-act-run-header-read-via-a-passthrough-spy | `invokeAct`'s integration rows read the run header through a documented passthrough `console.log` spy, not a new log sink | clean | open — for the council | 80% |
| F26-fleet-review-proven-leg-by-leg | the fleet peer review (case=6) is proven one rhachet seam per test; [t2], the reviewer's own verdict, is the brain's conduct and is not clamped | clean | open — for the council | 80% |
| F27-refusal-text-serves-two-readers | one leaf-refusal hint names the move for a reviewer clone and for a human; `via` and `why` both say "a repl brain", in one sense | clean | open — for the council | 75% |
| F28-brain-flag-grammar-proven-below-acceptance | the `rhachet act --brain repo/rest` grammar is proven by a unit table and a live integration row, with no new acceptance suite | clean | open — for the council | 80% |
| F29-depth-zero-edge-held-once-per-door | the explicit-`'0'` and absent-var depth edges hold one acceptance row per door; the old "depth 0 is permitted" rows became the #577 depth-1 spawn | clean | open — for the council | 85% |
| F23-leaf-mark-is-the-door-never-the-role | a clone is a leaf by how it was spawned — a print-mode enroll (`-p`) or any repl-door child — carried as `RHACHET_CLONE_LEAF`; never by its roles, since the ambient actor carries `reviewer` | clean | taken (a), for the commander; differs from the S68 patch on the repl door | 85% |

the S68 verdict (2026-10-20) supersedes F4's message (now *"a reviewer clone may not spawn"*) and
lifts the cap F13, F16, F17 and F19 were written against; their mechanisms stand, as facts of the
chain rather than limits.

gaps: F22 and F23 await the commander's nod; F11 through F19 are open; F20 and F21 await the council's nod on the option taken; F8, F9 and F10 await the council's nod on the option taken. F1–F7 are ruled by the wisher (S1, S2, S3). F8 splits F7 after execution found its premise (2) false as built. F9 fixes a defect, older than this wish, that a self review found. F8, F9, F15 and F17 rest on
code #600 rewrote; each was re-verified on the rebased tree (F9 and F15 by a red-then-green of
their shared clamp). F13 carries the tmux hole: best-guessed as candidate (i), which reverses one
S1 clause and narrows the hole without a close, so it waits on the wisher.
