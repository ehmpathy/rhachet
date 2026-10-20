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
| F11-refusal-render-keeps-the-shared-frame | the depth refusal keeps the shared wrapped frame, which omits `[args]` by a documented choice, rather than a repo-wide render-policy change | clean | open — for the council | 75% |
| F12-depth-scope-is-a-with-hof | `withCloneSpawnDepthScope(logic)` takes its call positionally, as every `with*` wrapper does | clean | open — for the council | 85% |
| F13-repl-door-tests-drive-the-real-tty | the repl door's tests set and restore the real `process.stdin.isTTY`, rather than a caller-supplied `isTty` seam the limit must not trust | clean | the test fork stands at (a), for the council; the tty hole is best-guessed as candidate (i) — a tty with a depth var reads that var + 1 — which reverses one S1 clause and leaves the tmux-server-env path open, for the wisher | 80% (fork) · 60% (hole) |
| F14-doc-glyphs-follow-the-repo-house-style | the route's docs keep the repo's `status: RESOLVED` dispute header and the behaver's feel × care glyphs, rather than a trim to the chill-nature tone rule | clean | open — for the council | 85% |
| F15-host-handoff-keys-dropped-on-every-enroll | the two host handoff keys are dropped on every enroll after the depth read, not only inside the host branch, so a stray key never reaches a child | clean | open — for the council | 80% |
| F16-review-render-and-hint-left-to-the-seam | the depth refusal is clamped where rhachet throws it; bhrain's `rhx review` frame is not snapped here, and one hint serves every door | clean | open — for the council | 75% |
| F17-one-depth-read-for-both-doors | one depth transformer serves both doors, and a host marker with no minted depth reads one level loose rather than a fault | clean | open — for the council | 80% |

gaps: F11, F12, F13, F14, F15, F16 and F17 are open; F8, F9 and F10 await the council's nod on the option taken. F1–F7 are ruled by the wisher (S1, S2, S3). F8 splits F7 after execution found its premise (2) false as built. F9 fixes a defect, older than this wish, that a self review found. F8, F9, F15 and F17 rest on
code #600 rewrote; each was re-verified on the rebased tree (F9 and F15 by a red-then-green of
their shared clamp). F13 carries the tmux hole: best-guessed as candidate (i), which reverses one
S1 clause and narrows the hole without a close, so it waits on the wisher.
