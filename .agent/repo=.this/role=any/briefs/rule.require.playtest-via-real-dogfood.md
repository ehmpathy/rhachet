# rule.require.playtest-via-real-dogfood

## .what

a playtest — or any byhand proof that a behavior works — must be a **real dogfood
experience**: the exact commands a real user runs, from the real repo root, against the real
product. no fabricated sandbox, no stub/fake brain, no wrapper driver to orchestrate the
commands.

## .why

a stub + temp-dir + wrapper "proof" hides the real product truth. it proves the harness works,
not the product. dogfood surfaces what a user actually hits — and it surfaces it immediately.

concrete: during the enroll-with-interface playtest a background clone spawn+reconnect was
"proven" with a `.temp/byhand-clone` sandbox, a stub brain shimmed to `claude`, and two tsx/cjs
driver programs. it looked green. but the real dogfood — bare `rhx enroll` + `rhx clone` from the
repo root — surfaced two genuine gaps the harness had masked:

- every real headless clone reads `DEAF`, because the reach socket is gated on an interactive
  tty (`isCloneSocketEligible = brainCapable ∧ interactive ∧ ¬noSocket`) and every headless/agent
  enroll has `interactive=false` → no socket ever bound. the stub harness gave enroll a pty, so
  it showed LIVE — a state a real headless user never sees. (the DEAF state is now the intended,
  observe-only outcome for a socket-less spawn — see `define.clone-reach-states.md`; the dogfood
  lesson stands: the harness masked the real headless truth.)
- `rhx clone get @:driver` on an unreachable, history-less clone returns empty + exit 0 (no
  failfast) — a real ergonomic gap the transformed-stub-ack path stepped right over.

the user's words: "it should all work from root", "do you not know what dogfood means?", "you
think someone is going to use this with random ass temp dirs?".

## 🔴 .a dogfood against an EXTANT clone tests the code the DAEMON booted with

the rule above catches a proof that is too synthetic. this catches the opposite failure, and it
reads as a real dogfood in every respect:

> **a clone's screen read is served by the clone's own daemon process. a rebuild of `dist` does not
> reload a daemon that is already alive, so a say against an extant clone exercises the code that
> daemon booted with — however current the binary you invoke is.**

the two halves of a `clone say` run in different processes, so a cure lands in one and not the other:

| the half | whose code runs | a rebuild reaches it |
|---|---|---|
| the rendered report, the verdict copy, the flags | the **CLI** you just invoked | ✅ at once |
| the screen probe — focus, the region, both counts | the **daemon**, in memory since its enroll | 🔴 only after a re-enroll |

⇒ so a cure to the *classifier* is invisible to a dogfood against any clone older than the build,
and it fails in the worst direction available: the pre-cure verdict, from a current binary, with a
`--debug` capture whose rendered rows plainly show the text the count calls absent.

**measured 2026-09-20.** the soft-wrap count cure landed, its unit clamp bit (4 rows red under a
mutant, green restored), `dist` carried `asCollapsedWhitespace` — and a self-say still returned
`absent` with `countOnScreen=0` across all 53 cycles, against a capture whose rows 49-50 held the
message. **a fresh peer, enrolled after the build, reported `countOnScreenRose true` on the same
shape** (a 191-char message the renderer broke across three rows). the cure was never in doubt; the
instrument was.

⚠️ **a self-say is the sharpest instance**, because a session's own clone is by construction older
than whatever that session built. so the one clone always to hand is the one that can never show a
classifier cure.

| when… | then… |
|---|---|
| you cure a screen read, a probe, or whatever else the socket serves | 🔴 **enroll a fresh peer.** an extant clone cannot show it |
| you dogfood a cure against your own self-clone | that daemon predates your build, always |
| a `--debug` capture's rows contradict its own counts | 🔴 the strongest cue. check the daemon's age before you doubt the cure |
| a cure to the report copy, a flag, or an exit code | the CLI serves it, so an extant clone is fine |
| a fresh peer disagrees with an extant one | the disagreement IS the version gap, never a flake |

⇒ a fresh peer for this is `npx rhx enroll claude --as @:<slug> --roles -driver --async`
(`rule.forbid.peer-clones-that-carry-the-driver-role` — a peer in your worktree must not carry
driver).

## .how to apply

- run bare `rhx <verb>` from the actual repo root, as the user would type it.
- forbidden in a playtest: a fabricated sandbox (`.temp/...`), a stub/fake brain, a tsx/cjs
  wrapper that drives the commands for you.
- if a wrapper feels required, that is itself the **finding to report** (e.g. "a reachable
  enroll needs an interactive terminal an agent lacks"), not a thing to paper over.
- the ONLY sanctioned reason a proof cannot be bare-dogfooded is a real capability the runner
  lacks (no interactive tty, no credential). surface it as the finding; never fake around it.

## .enforcement

- a playtest/proof built on a temp sandbox, stub brain, or wrapper driver = **blocker**
- a "green" proof that could not be reproduced by bare `rhx` from repo root = **blocker**
- 🔴 a screen-read / probe cure declared unproven on the strength of a dogfood against a clone
  enrolled before the build = **blocker** (the daemon served the old classifier; re-enroll)
- a `--debug` capture whose rendered rows contradict its own counts, reported as a defect with no
  check of the daemon's age = **blocker**

## .see also

- `philosophy.verification-strictness` (behaver) — no fake tests, cite command + output
- `rule.require.clamp-edge-cases` (mechanic) — a dogfood finding becomes a clamped regression
