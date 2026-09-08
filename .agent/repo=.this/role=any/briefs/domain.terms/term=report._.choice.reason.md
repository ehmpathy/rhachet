# domain.term.choice.reason: report

## .etymology

latin *reportare*, "to carry back" — one carries back **what happened**. that is precisely the
sense the render noun needs: a report is not a description of the command, it is the command's
outcome carried back to a human.

`term=notice` was itemized first and had to name what it is NOT, so `report` entered the glossary
as a word already in use across five declared operations yet never itemized. this cluster closes
that debt and records the content rule the word now carries.

## .why not the rejected synonyms

| rejected | why |
|---|---|
| `output` | names the MEDIUM. a notice and a warn are outputs too, so the word cannot separate the three (`rule.forbid.ambiguous-labels`) |
| `render` | same failure, one abstraction up — and `render` is already the verb for the act, so to reuse it as the noun overloads one word onto an act and its product |
| `summary` | implies a CONDENSATION of a longer text. a blocked report is the whole of what happened, never a précis of it |
| `result` | already spent on an operation's return VALUE throughout the repo; a report is a human-faced string, not a return shape |
| `dump` | the anti-term — it names the raw `ConstraintError: … { json } [args]` spill that the 🔐 report exists to replace. useful only to name what is refused |
| `message` | too broad; every string is a message |

## .evidence — the fact rule, settled 2026-09-04

the invariant *"every leaf a report renders states a fact the reader did not already have"* was not
declared up front. it was reached from **both sides**, which is what makes it a rule rather than a
preference:

**from the failhide side.** an earlier shape allowlisted which metadata keys could render. that
looks safe and is not: the throw site names a real field, the render silently eats it, and a human
reads *"invalid --mech: must be one of …"* and never learns which value was at fault. so the
renderer was opened to render EVERY field it is handed.

**from the hollow side.** once opened, the opposite failure appeared — leaves shaped like facts
that state none:

| leaf that shipped | why it states no fact |
|---|---|
| `input: {"fromEnv":null,"fromEnvDefault":null,"fromProfile":null}` | every member absent; a wall of syntax that resolves to "we looked, and found none" |
| `cause: AccessDeniedException: User: arn:… is not authorized…` | the same sentence the curated `why (raw AWS):` fix branch already spelled, one line below |

⇒ the rule is the midpoint the two errors bracket: **render every field, omit every non-fact.**

### how each guard is bounded, and why the bound matters

a guard aimed too wide re-creates the failhide it was meant to avoid, so each is cut to the
narrowest shape that catches its case:

- **hollow** tests the SERIALIZED value (`{}` / `[]`), never a key name — a key-gated rule is an
  allowlist under another name. nested absences are pruned first so one rule covers both depths,
  rather than a top-level guard plus a second one a level down
- **echo** is scoped to `Error` values, because only an error's own message is redundant enough to
  be certain. a scalar (`region: us-east-1`) may appear in a fix sentence and still be the field a
  reader came for

## .invariants

- a `report` is never `null` — a blocked command always has a cause to carry back
- a leaf whose serialized value is an empty container is omitted
- an `Error` leaf whose message the `fix` leaf already spells is omitted
- a credential-bearer leaf is masked, never omitted — the reader sees that the field EXISTS and
  that its value was withheld (`isKeyrackSecretShaped` + the key-name mask, OR'd)

## .clamps

`src/domain.operations/keyrack/getKeyrackBlockedReport.test.ts`

- `[case9][t1]` — a value that serializes to an empty container
- `[case11][t0]` — a nested value whose every member is absent
- `[case11][t1]` — a nested value with SOME facts beside its absences (the prune must trim, never drop)
- `[case11][t2]` — an `Error` whose message the fix already spells, plus a scalar peer the echo
  guard must leave untouched

dogfooded: the guards reverted → 3 red; restored → 33 green.
