# domain.term.choice.reason: decide

## .etymology

`decide` reads as *"reach a verdict."* it entered keyrack on a pair of pure predicates that
compare two slugs:

```ts
decideIsKeySlugForEnv({ slug, env }): boolean
decideIsKeySlugEqual({ desired, proposed }): boolean
```

both are deterministic string logic over a slug's own shape — no i/o, no state, no verdict in
any sense a domain expert would recognize. the word promises a judgment and delivers a
comparison.

## .disputes

### dispute: the verb — `decide` vs `is` — raised 2026-08-06 — status: OPEN

- raised.by  = the driver, at the i048 daemon repair
- claim      = `rule.require.get-set-gen-verbs` closes the operation prefix set to
               `get` / `set` / `gen` / `del` plus the `as*` / `is*` transformer prefixes, and
               routes a boolean check to `is*` by name. both operations here are boolean checks,
               so the canonical names are `isKeySlugForEnv` and `isKeySlugEqual`.
               `decideIs…` is doubly odd: it carries the sanctioned prefix **inside** an
               unsanctioned one, so the name already admits which word it should have led with
- counter    = the name is extant across 3 production call sites, its own test file, its
               filename, and two other files' prose. no reader has been observed to misread it,
               and the `Is` infix keeps the boolean sense legible at every call site
- resolution = OPEN. deferred to the wisher as a rename follow-on

### dispute: the noun — `Equal` vs `satisfy` — raised 2026-08-06 — status: OPEN

⚠️ **this is the sharper of the two, and it is a correctness claim rather than a style one.**

- raised.by  = the driver, at the i048 daemon repair
- claim      = the relation is **not** equality. `testorg.all.KEY` is not equal to
               `testorg.test.KEY` — it **satisfies** it, under the `env=all` fallback. and the
               relation is **asymmetric**: the input is `{ desired, proposed }`, and to swap
               them changes the answer. `equal` names a symmetric relation, so the word is
               wrong about the one property a reader most needs.

               **the file's own doc comment already uses the right word, twice:**
               > *".what = decide if a slug **satisfies** a request for a given env"*
               > *".what = decide if a proposed slug **satisfies** a desired slug, with env=all fallback"*

               a contract whose prose corrects its own identifier is the same tell found at
               `formatKeyrackGetOneOutput.ts:42` (`tip: attempt.fix ?? null`) — the author
               reached for the true word in the comment and left the drifted one in the name
- counter    = `equal` is loose but common for a "does this match" predicate, and the `desired`
               / `proposed` parameter names carry the direction explicitly at every call site,
               so no caller has been observed to pass them backwards
- resolution = OPEN. the proposed canonical is `isKeySlugSatisfied({ desired, proposed })`,
               which states the relation and its direction in one word

## .evidence

**the asymmetry, from the declaration itself** (`decideIsKeySlugEqual.ts:24-39`):

```ts
// exact match
if (input.proposed === input.desired) return true;

// env=all fallback: if desired is org.$env.KEY, check if proposed is org.all.KEY
const parts = input.desired.split('.');          // ← only `desired` is decomposed
if (parts.length >= 3 && parts[1] !== 'all') {
  const allSlug = `${parts[0]}.all.${parts.slice(2).join('.')}`;
  if (input.proposed === allSlug) return true;   // ← the fallback runs one direction only
}
```

`desired = org.test.KEY, proposed = org.all.KEY` → **true**.
`desired = org.all.KEY, proposed = org.test.KEY` → **false**.

one relation, two answers, per which side each slug sits on. that is a satisfaction relation,
and `equal` denies it.

**why the round engaged this at all.** the 2026-08-06 repair found `vaultAdapterOsDaemon.get`
compared with a strict `===` while `getKeyrackKeyGrant` compared with `decideIsKeySlugEqual` —
one daemon, one fallback, two read paths, two different answers. the fix was to reuse the
extant operation at both. that act of conformance is what put the term in this round's scope.

## .the condition to close

both disputes close together, in one rename, when a tree touches this module for its own
reasons — the `--disturbed` clause of `rule.forbid.domain-term-synonyms`. the rename would be:

| now | proposed |
|-----|----------|
| `decideIsKeySlugEqual` | `isKeySlugSatisfied` |
| `decideIsKeySlugForEnv` | `isKeySlugForEnv` |
| `decideIsKeySlugEqual.ts` (2 exports) | one file per operation (`rule.require.sync-filename-opname`) |

⚠️ **the third row is a separate defect the census surfaced.** the module declares **two**
exported operations, which `rule.require.single-responsibility` forbids — and the file is named
for only one of them, so `decideIsKeySlugForEnv` is reachable only by a reader who already knows
to look inside a file named for its twin. `sourceAllKeysIntoEnv.ts:11` imports it from exactly
there.

## .see also
- `rule.require.get-set-gen-verbs` — the closed prefix set this term sits outside
- `rule.forbid.domain-term-synonyms` — adhere or dispute; never drift
- `howto.domain-term-disputes.[guide].md` — the pattern this file follows
- `term=fix._.choice.reason.md` — the same round's other OPEN dispute, same drift shape
