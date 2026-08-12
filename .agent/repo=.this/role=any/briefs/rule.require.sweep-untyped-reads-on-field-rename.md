# rule.require.sweep-untyped-reads-on-field-rename

## .what

when you rename a field on a domain object, the compiler is **half** the sweep. you must also
grep the field's **serialized name** and fix every read that reaches it through an untyped
value — `JSON.parse(...)`, an `any`, a `Record<string, unknown>`, a fixture file, a snapshot.

a compiler-driven rename is the right tactic. this rule is about the half it cannot see.

## .why

`tsc` follows types. a value that entered as `JSON.parse(stdout)` is `any`, so `parsed.reach.label`
type-checks forever — it simply becomes `undefined` at run time. so:

- an **assertion** on an untyped read does not fail loudly; it compares against `undefined` and
  can quietly assert naught
- a **fixture** that spells the old name may still pass, if a back-compat read accepts both — so
  the suite stays green and the stale word looks sanctioned
- a **snapshot** holds the old name as literal text, and only moves when its suite is re-run

the dangerous case is the first: a clamp written to catch a destructive defect, silently
neutered by the very rename that was supposed to be cosmetic.

## .the worked example

`KeyrackKeyReach.label` → `.exid` (2026-08-12). `tsc` green, `lint` green, and **two acceptance
assertions were dead**:

```ts
// keyrack.del.acceptance — THE clamp that a del at one reach leaves its peer whole
const parsed = JSON.parse(listResult.stdout);           // any
expect(parsed['…@vlad@ehmpathy.com'].reach.label)       // undefined after the rename
  .toEqual('vlad@ehmpathy.com');                        // ← would have gone quiet
```

that clamp exists because a bare-slug del would destroy a credential the human never aimed at.
a rename made it blind, and the compiler had no opinion.

## .how

after the compiler is green, grep the **old field name** and triage every hit:

| hit | do |
|-----|-----|
| a typed read | already handled — the compiler found it |
| `JSON.parse(...).field` / an `any` walk | ⚠️ **fix by hand** — the compiler cannot see it |
| a fixture file (`.json`, `.yml`) | fix, unless it deliberately clamps a legacy read |
| a snapshot (`.snap`) | re-run its suite; verify each moved line is the rename and no more |
| a comment, test name, or local var | rename too — else the old word stays a live vocabulary |
| a genuinely different concept with the same word | **keep**, and say so |
| a line that names the old word ON PURPOSE (a migration note, a dispute record) | **keep** |

then re-run the suites that read the serialized shape. a rename that only ever ran `tsc` is
unverified.

## .the test

"if this field vanished at run time, would every test that reads it go red?"

- yes → swept
- no → an assertion sits against `undefined`

## .enforcement

- an untyped read of a renamed field, left unswept = **blocker**
- a fixture or snapshot left on the old word with no note that it clamps a legacy read = **blocker**
- the old word left alive in comments/test names/local vars = **nitpick** (it re-creates the
  ambiguity the rename was for — `rule.forbid.domain-term-synonyms`)

## .see also

- `rule.require.clamp-edge-cases` — a clamp must bite; this rule names how one silently stops
- `rule.forbid.domain-term-synonyms` — why the old word must not survive in the vocabulary
- `rule.require.snapshot-verified-on-independent-run` — snapshots move only when re-run
