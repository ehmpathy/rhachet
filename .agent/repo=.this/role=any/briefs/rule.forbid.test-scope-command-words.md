# rule.forbid.test-scope-command-words

## .what

never pass `git.repo.test --scope` a value that is a **keyrack command word** — `unlock`,
or a bare `keyrack`. the scope silently widens to **every** test file rather than the one
you named, and the run still passes, so not one signal tells you it happened.

always read the `matched: N files` line the skill prints before you trust a scoped run.

## .the evidence

six probes, plan mode, same worktree, same minute:

| `--scope` | matched | correct? |
|-----------|---------|----------|
| `path://keyrack.del` | 1 | ✅ |
| `path://keyrack.fill` | 1 | ✅ |
| `path://keyrack.status` | 2 | ✅ |
| `path://keyrack.unlock.acceptance` | 1 | ✅ |
| `path://keyrack.unlock` | **98** | ❌ every acceptance file |
| `path://unlock` | **98** | ❌ every acceptance file |
| `path://keyrack` | **98** | ❌ every acceptance file |

`keyrack.del` and `keyrack.fill` are the control: the mechanism is not "a dot widens it" and
not "keyrack widens it". the trigger is the **last token**, and it is a word the skill itself
consumes — `git.repo.test` runs `keyrack unlock` to fetch credentials before it hands the
rest to jest (`keyrack: unlocked ehmpath/test` in its own header).

**one more segment escapes it**: `keyrack.unlock.acceptance` matches 1. so the workaround is
always available, and always cheap.

## .why it costs more than a slow run

a *narrowed* filter fails loud eventually — you notice zero results. a **widened** one does
not:

- the run still **passes**, so no assertion, no exit code, and no log line disagrees with you
- it takes 20–50× longer (53s → 1109s here), which reads as a **hang**, not a scope error
- the conclusion a tired reader draws is *"my change hung the suite"* — a diagnosis about
  their own code, sourced entirely from the harness

that misdiagnosis is the real cost. it happened here: a `del` suite that runs in 53s appeared
to hang for 18 minutes, and the first hypothesis was the render change in the diff.

## .the same class as `rule.forbid.grepsafe-path-globs`

both are **filters that answer a question you did not ask, and do not admit it**:

| tool | wrong answer | how it lies |
|------|--------------|-------------|
| `grepsafe --glob <dir>` | `matches: 0` | a broken filter reads exactly like a true miss |
| `git.repo.test --scope <cmdword>` | `matched: 98` | a widened filter reads exactly like a slow test |

the grepsafe form fails *closed* (you conclude a thing is absent). this one fails *open* (you
conclude a thing is broken). the shared defect is that **the tool reports its real answer
plainly and the reader checks the argument they typed instead.**

## .the discipline

> **read the count, not the query.** every filter prints what it actually matched. that
> number is the claim; the string you typed is only your intent.

`git.repo.test` prints `matched: N files` and lists the first ones. one glance would have
caught this twice today. it was not glanced at either time.

## .how

```bash
# 👎 widens to the whole suite, silently
rhx git.repo.test --what acceptance --against local --env test --mode apply \
  --scope 'path://keyrack.unlock'

# 👍 one more segment, and it lands
rhx git.repo.test --what acceptance --against local --env test --mode apply \
  --scope 'path://keyrack.unlock.acceptance'

# 👍 always probe first — plan mode runs no tests and prints the match set
rhx git.repo.test --what acceptance --against local --env test \
  --scope 'path://keyrack.unlock.acceptance'
```

## ⚠️ .a second trap: multiple `--scope` flags AND, they do not OR

```bash
# matched: 1 file — the INTERSECTION, not the union
--scope 'path://keyrack.del' --scope 'path://keyrack.unlock' --scope 'path://keyrack.set'
```

a reader who expects a union gets one file and believes three suites ran green. run separate
invocations instead, or use a single scope that covers them.

## .enforcement

- a conclusion drawn from a scoped run whose `matched: N` was never read = **blocker**
- a scoped run reported as evidence for a claim, where the scope widened to the full suite,
  presented as if it were narrow = **blocker** (the claim is unfounded even though the run
  passed)
- a `--scope` value whose last token is a keyrack command word = **nitpick** (it works, it is
  just 50× slower than intended)

## .see also

- `rule.forbid.grepsafe-path-globs` — the same defect class, failed closed instead of open
- `rule.require.trust-but-verify` (mechanic) — the count is the claim; verify it
- `rule.forbid.failhide` (mechanic) — a filter that answers the wrong question, and stays
  quiet about it, is failhide in tool form
