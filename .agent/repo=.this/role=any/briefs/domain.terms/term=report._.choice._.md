# domain.term: report

term.chosen   = report
term.kind     = noun
term.synonyms.forbidden:
- output
- render
- summary
- result
- dump
- message

## .what

**a render that IS a command's outcome.** where a `notice` sits beside a result that already
stands alone, a report *is* the result — so it can never be absent.

## ⚠️ .a report leaf must carry a FACT

the rule that governs a report's content, stated as an invariant:

> **every leaf a report renders states a fact the reader did not already have.**

a leaf that breaks it is one of two kinds, and both are **omitted** rather than rendered:

| kind | shape | why it is refused |
|---|---|---|
| **hollow** | `{}`, `[]`, or an object whose every member is absent — `{"fromEnv":null,"fromEnvDefault":null}` | fact-SHAPED and fact-FREE. a human must parse a wall of syntax to learn it states none |
| **echo** | content the report's own `fix` leaf already spells | the fix is the line a human reads; a mid-branch leaf that repeats it is noise, not context |

⚠️ the two guards are **narrow on purpose**, because the opposite error is worse. a report renders
EVERY metadata field it is handed — an allowlist would be `rule.forbid.failhide` in renderer form,
where the throw site looks correct, the field is real, and only the render eats it. so:

- the hollow guard tests the **serialized shape**, never a key name
- the echo guard is scoped to **`Error` values only**, because a scalar fact (`region: us-east-1`)
  may legitimately also appear inside a fix sentence, and to suppress it on a loose text match
  would drop a real field to cure a cosmetic one

## .the two peer render nouns

`term=notice` carries the full table. the axis that separates the three is **what triggered the
render**; the tell is nullability:

| noun | triggered by | can it be absent? |
|---|---|---|
| **`report`** | an **outcome** the command reached | ❌ never — it IS the outcome |
| `notice` | an **omission** — work not carried | ✅ `null` when there is none |
| `warn` | a **policy** the caller did not ask for | ✅ only when applied |

## .why not `output` or `render`

both name the MEDIUM, never the content — every one of the three nouns is an output and a render,
so neither word can separate them (`rule.forbid.ambiguous-labels`). `dump` names the raw
exception-and-metadata spill a report exists to REPLACE, so it is the anti-term.

## .refs
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts`  # the refusal outcome
- `src/domain.operations/keyrack/cli/emitKeyrackBlockedReport.ts`  # its `emit*` shape
- `src/domain.operations/keyrack/cli/asKeyrackDelReport.ts`  # a success outcome
- `src/domain.operations/keyrack/infra/getKeyrackInfraInitReport.ts`
- `src/domain.operations/keyrack/infra/getKeyrackInfraInitErrorReport.ts`

## .reason
see the ref-level cluster beside this choice:
- `term=report._.choice.reason.md` — etymology, the rejected synonyms, evidence, invariants
