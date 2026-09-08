# domain.term: inert

term.chosen   = inert
term.kind     = adj
term.synonyms.forbidden:
- ignored
- no-op
- dropped
- unapplied
- silent

## .what

an input is **inert** when it was **accepted, acknowledged, and had no effect** — the caller
supplied it, the surface took it without complaint, and the behavior it asked for never happened.

inert describes the **input's fate**, never the caller's intent. an inert flag is always a
defect: the caller asked for an effect and got none, and was told none of it.

## .the three marks

all three must hold. drop any one and the word does not apply:

| mark | means |
|---|---|
| **accepted** | no refusal, no warn, no non-zero exit — the run reports success |
| **acknowledged** | the surface echoes it back, so a diagnostic reads as though it took |
| **without effect** | not one byte of behavior differs from a run that never supplied it |

## .inert is a DEFECT, a no-op is a DESIGN

this is why the word is needed, and why `no-op` is forbidden as its synonym:

| term | says | verdict |
|---|---|---|
| **inert** | the caller asked for an effect and silently got none | always a defect |
| `no-op` | this call correctly changes no state in this condition | often correct |

a re-run of an idempotent `del` on an absent row is a **no-op** and is right. a `--paths-wout`
that excludes not one file is **inert** and is wrong. to call the second a no-op is to file a
defect as a design.

## .why it is worse than a refusal

a rejected input costs the caller one read of an error. an inert input costs an entire
investigation, because **every surface agrees with the caller**:

- the exit code is `0`
- the run completes and reports its work
- the echo names the input back, verbatim

⇒ an inert input is worse than an absent one, because it looks solved. the only surface that
betrays it is a **measurement of the effect it claimed to have**.

## .the cure is a measurement, never an exit code

to confirm an input is no longer inert, measure what it was supposed to change — a file count, a
token total, a row that vanished. a clean exit proves the run happened, never that the input
landed.

### the measurement, done (2026-09-06)

the second confirmed instance, and the first with a hard count. a peer reviewer passed seven
`--paths-wout` flags, the first `'.agent/**'`. the measure:

```
$ grep -c '\.agent/repo=\.this' .log/bhrain/review/2026-09-05T16-19-35-050Z/input.scope.debug.json
599
```

⇒ 599 occurrences of a path excluded seven ways. its scope breakdown corroborates structurally —
it prints a line for `diffs` and for `paths`, and **never one for the excludes at all**:

```
├─ diffs: since-main  → files: 237
├─ paths: (none)      → files: null
└─ joined via intersect → files: 210, tokens: 848.9k
```

237 → 210 is the `--paths-with` intersect alone. **the seven excludes subtract zero.**

the downstream cost names why this term earns its keep: 51 excluded-in-name brief files stayed in
scope, the prompt reached 848.9k tokens (104-109% of context), and five reviewers returned no
verdict. every one of those reviewers *looked* like it had an opinion.

## .not `dark`, not `omitted`, not `miss`

adjacent, and each distinct:

| term | says |
|---|---|
| **inert** | the input was supplied and had no effect |
| `dark` | a review lane produced no readable finding |
| `omitted` | the input was never supplied at all |
| `miss` | a lookup ran and found no row |

`inert` and `dark` are **causally linked, never synonyms**: an inert scope flag is one thing that
makes a lane dark. the first is a property of the input, the second of the artifact.

## .refs

- `.agent/repo=.this/role=any/briefs/rule.forbid.mechanism-inferred-from-outcome.md` — an inert
  input yields an outcome that invites a wrong cause
- `term=dark._.choice._.md` — the lane state an inert scope flag produces
- `term=scope._.choice.reason.md` — the axis on which a scope flag goes inert

## .reason

see the ref-level cluster beside this choice:
- `term=inert._.choice.reason.md` — etymology, disputes, evidence
