# define.invariant.an-unknown-flag-is-refused-never-dropped

## .what

> **a flag a verb does not recognize is either FORWARDED to a declared passthrough or REFUSED by name.
> it is never dropped in silence.**

three fates, and exactly one applies to every flag token a verb receives. **the fourth — swallow it,
run anyway, report success — is forbidden.**

## .kind

**nurture.** nature permits the silent drop outright: `getopt`'s `*)` fallthrough is one line, and a
`case` statement with no default arm drops by construction. we choose loud refusal because the silent
drop is the one input defect a caller **cannot detect from the output**.

## .the invariant

for every flag token `f` a verb receives:

```
recognized(f)  ∨  forwarded(f)  ∨  refused(f)
```

and never `dropped(f)` — where `dropped` = consumed, unreported, with a zero exit.

| fate | what it means | who does it |
|---|---|---|
| **recognized** | the verb owns the flag and reads its value | every declared `.option(...)` |
| **forwarded** | the verb hands it to a child, by a declared passthrough | `enroll` · `run` · `ask` · `act` |
| **refused** | the verb names the flag and exits non-zero | every other verb |
| 🔴 **dropped** | consumed, unnamed, exit 0 | **forbidden** |

## .why

🔴 **a silent drop is indistinguishable from a flag that worked.** that is the whole argument, and it
is not a matter of tidiness:

- a caller types `--treshold 150`, the verb swallows it, the default applies
- the verb runs to completion and exits 0
- the output is well-formed, plausible, and **wrong**
- ⇒ the caller reads a correct-looking result and has no signal at all

compare each other fate. a **recognized** flag does what it says. a **forwarded** flag reaches a child
that names it if it is wrong. a **refused** flag stops the run and says which token was bad. only the
drop produces a confident, unmarked lie.

and the defect compounds by its own mechanism: **the more carefully a caller reads the output, the more
convinced they become**, because the output is internally consistent. no amount of attention recovers a
flag that was never applied.

⇒ this is `rule.forbid.failhide` at the argv boundary. the rule already forbids a swallowed *error*;
this names the swallowed *input*, which is the same defect one step earlier.

## .scope

**it governs the argv boundary of a verb** — a cli command, a shell skill, a hand-rolled arg parse.

what it does **NOT** cover, and each exclusion is load-bearing:

- **a declared passthrough is not a drop.** `enroll`, `run`, `ask`, and `act` each set
  `.allowUnknownOption(true)` deliberately, because an unknown token is the child's flag and must reach
  it verbatim. the token is **forwarded**, so the invariant holds — the child names it if it is wrong
- **a positional operand is not a flag.** a bare token with no leading `-` is data
- **a `--` terminator hands the rest onward** by convention; past it, no token is a flag
- **an empty default arm that only shifts a CONSUMED value** is fine — the invariant reads the flag
  token, never its value

## .the litigation

the invariant was live in this repo and undeclared, which is how half its skills broke it while the
other half held it. walked 2026-09-20, over every `.sh` under `.agent/repo=.this/**/skills/`:

| the file | its default arm | verdict |
|---|---|---|
| `skills/show.claude.task.output.sh` | `echo "unknown arg: $1"; exit 1` | ✅ refused |
| `skills/show.bun.deps.sh` | `echo "unknown arg: $1"; exit 1` | ✅ refused |
| `skills/aws.whoami.sh` | `shift` | 🔴 dropped |
| `skills/perf.test.sh` | `shift` | 🔴 dropped |
| `skills/say-hello.sh` | — no flag parse; one positional | out of scope |

⇒ **two authors knew the rule and two did not**, and no artifact could have told them. that is the exact
signature of an invariant that holds in practice and was never written down.

### 🔴 the drop was MASKING a real contract defect, and that is the sharpest evidence there is

`rhx <skill> <args>` rewrites to `rhachet run --skill <skill> <args>`, and `getRawArgsAfterRun`
(`src/contract/cli/invokeRun.ts:21-26`) hands each arg after `run` to the skill. **so `--skill` arrives
in every skill's argv, unasked.** measured, at the moment refusal landed:

| the skill | before the cure | what the cure exposed |
|---|---|---|
| `aws.whoami.sh` | "worked" | it worked **because it swallowed `--skill`**. refusal turned its own documented `--env test` into an error |
| `perf.test.sh` | "worked" | the same, except `--skill` happens to collide with a legacy flag of its own, so the collision hid the leak twice over |
| `show.bun.deps.sh` | 🔴 **unreachable** | it refused correctly **all along** — `rhx show.bun.deps` had never once run |
| `show.claude.task.output.sh` | ✅ worked | its author declared `--repo\|--role\|--skill` explicitly. the one shape that is correct |

⇒ 🔴 **the two skills that obeyed the invariant are the two that surfaced the defect**, and the two that
broke it are the two that hid it. a silent drop does not merely lose a caller's flag — **it absorbs the
evidence that a contract is wrong**, so the defect keeps its cover for as long as the drop lasts.

and the cost compounded: `show.bun.deps.sh` was **doubly** broken. once its argv was cured it ran, and
failed at once on a stale default entry path (`invoke.bun.entry.ts`, split into `.run`/`.roles` some
release ago). **a second defect, invisible for as long as the first made the skill unreachable.**

🟡 the dispatcher's leak is the root, and the skill-side declaration is the grain this round cures — the
strip belongs in `invokeRun.ts` and ripples across every skill in every linked role, so it is deferred
as its own change (`.dream/2026_09_20.rhx-dispatch-flags-leak-into-every-skills-argv.dream.md`).

🔴 **and the repo already knew the COST, in prose, twice over.** two briefs state the defect as an
observed fact and neither forbids it:

- `rule.always.diagnose-reviewer-malfunctions` — *"an UNKNOWN flag is dropped in silence — no error, no
  warn. so a misspelled bind reads as applied and the lane runs unbounded."* it then names the tell a
  reader must use to recover: *"a narrowed lane that overflows at the SAME file count as before is a
  flag-name defect, never a glob one."*
- `getBrainCliPassthroughArgs.ts` — a 🔴-marked docblock recounts four clones killed by one unstripped
  flag, measured 2026-09-17

⇒ so the repo carried a **diagnosis technique** for the defect and a **measured incident report** of
it, and no rule against it. a technique to detect a defect is not a bar against it, and a reader who
holds only the technique will re-create the defect and then use the technique on themselves.

## .the counter-argument

> *a passthrough verb cannot tell an unknown flag from a child's flag, so a refusal would break every
> legitimate forward. and a shell skill's default arm is one line — a refusal arm costs three.*

the first half is **correct, and it is why `forwarded` is a first-class fate rather than an exception.**
the invariant does not demand that every verb refuse; it demands that no verb swallow. a verb with a
declared passthrough satisfies it by a forward, and pays naught.

the second half concedes the point it means to make: three lines, once per skill, against a class of
defect that is undetectable from the output. the asymmetry is the argument.

## .what would overturn it

a **nurture** invariant falls when its cost changes or its incidents stop applying. either would do it:

- a mechanism that makes a silent drop **detectable from the output** — then the argument's premise is
  gone, and the invariant is ceremony
- a measured case where a refusal arm broke a legitimate caller that `forwarded` could not serve

⚠️ what does **not** overturn it: that a refusal arm is inconvenient to write, or that no caller has
yet typo'd a flag. an undetectable defect has no observed-frequency argument available to it — absence
of a report is what the defect produces.

## .enforcement

- a default arm that consumes a flag token and continues with a zero exit = **blocker**
- a verb with no declared passthrough that tolerates an unknown flag = **blocker**
- a verb that refuses an unknown flag and does **not** declare the flags its own dispatcher hands it
  = **blocker** — it refuses its caller and is unreachable, which is the `show.bun.deps` case above
- a passthrough verb that forwards an unknown flag = **false positive** (that is `forwarded`)
- a docblock that claims a clamp on this invariant where no clamp exists = **blocker** — the claim is
  worse than the gap, because a reader who finds it stops to look

⇒ the clamp is `.agent/repo=.this/role=any/skills/unknown-flag-refusal.integration.test.ts`. it reads
the **argv boundary** of every shell skill under `.agent/repo=.this/**/skills/` — the `*)` arm of the
`case` inside a `while [[ $# -gt 0 ]]` loop — and asserts two things of it: every default arm refuses
or declares a forward, and every skill that refuses declares `--repo` · `--role` · `--skill`.

🟡 **its teeth are on record, both halves, by revert cycle:**

| the assertion | red against | 📄 |
|---|---|---|
| no default arm drops | the un-cured `aws.whoami.sh:28` + `perf.test.sh:89`, named by path and line | `.log/…/what=integration/2026-09-20T19-20-40Z.stderr.log` |
| every refuser declares the dispatch flags | `show.bun.deps.sh`, its arm removed for the probe | `.log/…/what=integration/2026-09-20T19-33-04Z.stderr.log` |
| both, restored | 🟢 4 passed | `.log/…/what=integration/2026-09-20T19-33-32Z.stderr.log` |

⚠️ the clamp reads the **argv** boundary only. a `case` over a value that is not an argv token — a
mode, a status — is a branch rather than a fate, and is out of scope by construction.

## .see also

- `rule.forbid.failhide` (ehmpathy/mechanic) — the parent: this is that rule at the argv boundary
- `rule.require.failfast` · `rule.require.failloud` — a refusal names the bad token and exits non-zero
- `rule.always.diagnose-reviewer-malfunctions` (bhrain/driver) — carries the detect technique this
  invariant makes unnecessary
- `src/domain.operations/enroll/getBrainCliPassthroughArgs.ts` — the `forwarded` fate, and the measured
  incident its docblock records
