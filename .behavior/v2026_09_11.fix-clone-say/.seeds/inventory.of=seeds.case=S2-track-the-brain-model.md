# seed S2 — track the brain model, and it can change mid-run

## .said

verbatim, 2026-09-13:

> also, someone asked whether whoami could return the model of brain at use at the time. is that possible? can we see from within the bash tool which level of brain it is?

> if so, lets pull that in

> bran model can be changed mid run anytime
> via /model imperartive
> so we gotta be able to track via within repl toolcalls
> i.e., do you right now have an env var that tells you which claude code brain slug you use?
> claude-opus-* ? which version for example

## .settled

`whoami` / `get` should report the clone's brain **model**, and the model can change mid-run via
the `/model` imperative — so the report must reflect the **current** model, not only the spawn one.

what shapes it:

- an env var **does** carry a model slug — `ANTHROPIC_MODEL` = `claude-opus-4-8[1m]`, readable from
  a toolcall. the `[1m]` is the **million-token-variant suffix** (per the `/model` docs), a literal
  part of the model name — NOT an ANSI escape. confirmed: 19 printable bytes, no `^[`
- but it is **override-not-updated**: Claude Code's env-vars docs state *"`--model` and `/model`
  override `ANTHROPIC_MODEL` … in-session commands take precedence over the environment variable."*
  override ≠ write-back, so after a `/model` switch the env var keeps its old value while the active
  model diverges. a toolcall read is stale after a switch, and **empty on a default launch** (the
  var only sets the default; the docs say the settings model applies "only when the variable is
  unset")
- ⇒ the env var reports the **launch/default** model, never the **current** one after `/model`
- ⇒ sources: `code.claude.com/docs/en/env-vars`, `code.claude.com/docs/en/model-config`

so the two models split by channel:

| the model at… | source | reliability |
|---|---|---|
| **spawn** | the harness knows the brain it enrolled — stamp it into the clone identity record | reliable, but stale after `/model` |
| **now** (post-`/model`) | the transcript jsonl or the screen — NOT an env var | unverified; it is the read channel this wish builds |

the current-model read rides `clone get`. whether the transcript or screen exposes the active model
is a dogfood `[research]` item, same instrument as A1 (`~/.claude/**` is a forbidden in-repo read).

## .landed

- folds into the `clone get` read channel; owes a `[research]` item at the execution stone and,
  if a `model` field is added to the identity record, a spawn-model stamp at enroll
- `1.vision.yield.md` → `.the wisher's redirect` → `S2` — the fold into the vision (spawn vs now
  split; env is override-not-updated; current model rides `clone get`)
