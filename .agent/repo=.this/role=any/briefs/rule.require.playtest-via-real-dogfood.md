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

## .see also

- `philosophy.verification-strictness` (behaver) — no fake tests, cite command + output
- `rule.require.clamp-edge-cases` (mechanic) — a dogfood finding becomes a clamped regression
