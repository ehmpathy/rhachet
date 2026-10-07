# howto.entool-a-measurement-as-a-skill

## .what

when you need to measure, probe, or compute a value about this repo, write it as an `rhx`
skill — never as an adhoc `npx tsx` scratch file.

this is the repo-specific HOW for `rule.always.enskill-the-tactics-you-discover` (bhrain/learner).
that rule says a repeated tactic is owed a skill; this says **the first run already owes one**
when the answer is a measurement, and it names the two gotchas this repo imposes.

## .why

a scratch file answers the question once and leaves no pavement. the number lands in a
transcript, the transcript is compacted, and the next traveler re-derives it — or worse, quotes
the stale number with no way to re-measure.

a measurement is the *most* worthwhile kind of tactic to entool, because its value is in the
re-run: the corpus changes, the dependency changes, and a claim built on a one-time number goes
stale in silence.

🔴 **a load-bearing number must be re-measurable on demand.** if a number gates a budget, a
threshold, or a release, the command that produced it is part of the deliverable.

## .the paved pattern

two files, side by side in `.agent/repo=.this/role=any/skills/`:

```
calc.tokens.sh    # the wrapper — help, arg parse, closed-set validation
calc.tokens.ts    # the implementation — reads the same argv
```

the wrapper owns each surface a human touches, then hands off:

```bash
exec npx tsx "$SCRIPT_DIR/calc.tokens.ts" "${ORIGINAL_ARGS[@]}"
```

⇒ the reference implementation is `aws.postgres.query.sh` + `.ts`
(`.agent/repo=ghlitch/role=observer/skills/`). copy its shape: one `show_help`, a
`require_val` guard, an unknown-flag belay, and closed-set checks in bash where the message
can still name the valid values.

## 🔴 .the two gotchas

| gotcha | what happens | the fix |
|---|---|---|
| **tsx compiles to cjs** | a top-level `await` dies with `Top-level await is currently not supported with the "cjs" output format` | use the sync api — `glob.sync(...)`, not `await glob(...)` — or wrap in an async main |
| **a new `.sh` has no exec bit** | `rhx` discovers the skill, then fails `Permission denied` (exit 126) | `chmod +x` the wrapper once, before the first `rhx` call |

🟡 the first is a **build** error, not a runtime one, so it fires on every invocation — even the
ones that should have belayed early. it will mask your arg-parse guards until it is fixed.

## .validate the wrapper before you trust the answer

run each belay path once. a wrapper whose guards were never exercised is a guess:

```sh
rhx calc.tokens help                      # the help text renders
rhx calc.tokens                           # absent required arg  → exit 2
rhx calc.tokens --path 'x'                # mistyped flag        → exit 2, names the flag
rhx calc.tokens --paths 'no/such/*'       # zero matches         → exit 2, names the cause
```

⇒ the zero-match case matters most: an empty answer must name its cause, never render as a clean
zero (`define.invariant.empty-render-names-its-cause`).

## .name it for the motive

mechanisms are `[verb][...noun]` (`rule.require.treestruct`), so a measurement skill reads
`calc.tokens`, `show.bun.deps`, `get.package.docs` — never `tokens.calc`.

🟡 **reuse the extant domain VOCABULARY, never the module.** `calc.tokens` counts with the same
library and model as `calcBrainTokens`, so the two counts agree.

### 🔴 .a `.agent/` skill cannot import from `src/`

**`roles link` symlinks a role's dir into a consumer's `.agent/`**, so a linked skill executes from
the consumer's tree, where an `@src/…` specifier points at their `src/` or at naught. 13 of 15
`.agent/` role dirs in this repo are such symlinks (`define.invariant.a-symlink-under-agent-is-foreign`).

| shared | how |
|---|---|
| the tokenizer library | both reach for `js-tiktoken` |
| the model, hence the vocabulary | both name `gpt-4o` → `o200k_base` |
| the **module** | ✋ not shared — a comment at the construction site says so |

the model string sits at two sites, so a **clamp** pins them: `calcBootPayloadTokens.test.ts`
asserts an **exact** count, and a divergence turns it red.

a skill constructs its encoder once at module scope and exits, so it owes no memo.

## .enforcement

- an adhoc `npx tsx <probe>.ts` run to answer a question = **blocker** (entool it)
- a load-bearing number cited with no command that re-measures it = **blocker**
- a skill wrapper whose belay paths were never run = **nitpick**
- 🔴 a `.agent/` skill that imports from this repo's `src/` = **blocker** (it breaks wherever the
  role is linked)
- 🔴 a skill that duplicates a domain operation's **vocabulary** with no clamp that pins the two
  together = **blocker** (the duplication is sanctioned; the silent drift is not)

## .see also

- `rule.always.enskill-the-tactics-you-discover` (bhrain/learner) — the parent rule
- `rule.always.entool-the-skills-you-touch` (bhrain/learner) — the upgrade half
- `rule.require.skill-help.[guide]` (rhachet/enroller) — the help-text contract
- `howto.add.skills.[guide]` (rhachet/enroller) — how a skill is discovered
- `rule.require.treestruct-output` (ehmpathy/ergonomist) — the stdout shape
