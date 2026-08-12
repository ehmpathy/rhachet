# domain.term: assert

term.chosen   = assert
term.kind     = verb
term.status   = DECLARED
term.synonyms.forbidden:
- validate
- verify
- check
- ensure
- guard
- enforce
- require (as a verb prefix)

## .what
to **hold an invariant**, or throw. an `assert*` operation takes the state it guards, returns
`void` when the invariant holds, and throws a `HelpfulError` that names the fix when it does not.

```
assertKeyrackReachAbsent({ reach, mech })         → void, or ConstraintError
assertKeyrackExportNamesDistinct({ attempts })    → void, or ConstraintError
assertKeyrackEnvIsSpecified({ env })              → void, or BadRequestError
```

## .what it is NOT — the two words it sits between

| verb | returns | narrows a type? | example |
|------|---------|-----------------|---------|
| `is*` | `boolean` | ✅ yes (predicate) | `isIsoTimeStamp(x)` |
| **`assert*`** | **`void`, or throws** | ❌ **no** | `assertKeyrackReachAbsent(…)` |
| `get*` | a value | n/a | `getOneKeyrackGrantByKey(…)` |

⚠️ **an `assert*` is not a type assertion.** `rule.require.assure-via-type-checks` governs the
narrow-a-value-to-a-type case and mandates `is$Noun.assure(x)` for it. an `assert*` narrows no
value — it holds a **rule about a relationship** (this mech may not carry a reach; these two
exports may not share a name). different act, different word, and `.assure` does not apply.

## .refs
- `src/domain.operations/keyrack/reach/assertKeyrackReachAbsent.ts`
- `src/domain.operations/keyrack/assertKeyrackExportNamesDistinct.ts`
- `src/domain.operations/keyrack/assertKeyrackEnvIsSpecified.ts`
- `src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest.ts`
- `src/domain.operations/keyrack/getKeyrackKeyGrants/assertKeyrackUnlockIdentityAvailable.ts`
- `src/domain.operations/keyrack/grades/assertKeyGradeProtected.ts`
- `src/domain.operations/manifest/assertRegistryBootHooksDeclared.ts`
- `src/domain.operations/manifest/assertRegistryHasNoOrphanBriefs.ts`
- `src/domain.operations/manifest/assertRegistryHooksNoNpx.ts`
- `src/domain.operations/manifest/assertRegistrySkillsExecutable.ts`
- `src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs.ts`

**11 prod declarations across 3 domains** (keyrack, manifest, role) — the word predates this
round; this round declared two more and itemized it.

⚠️ **the count was stale within a day and is now re-derived, not re-asserted.** it read `8` with
9 refs listed, and a `grep 'export const assert[A-Z]'` over `src/` returns 11 (plus one under
`src/.test/infra/`, excluded as test infra). when you cite this count, **re-run the grep** —
a number in a glossary decays the moment the tree moves.

## .why not one of `get` / `set` / `gen` / `del`
`rule.require.get-set-gen-verbs` exempts *"imperative action commands"* (its own example is
`dispatchTask`). an `assert*` is exactly that: it names an act, not a read and not a mutation. it
has no resource to get, no state to set, and returns no value to name. **settled 2026-08-03** —
see `.reason`.

## .reason
see the ref-level cluster beside this choice:
- `term=assert._.choice.reason.md` — etymology, disputes, evidence
