# self-review r6: role-standards-adherance

check every line against mechanic role standards.

---

## relevant rule categories

| category | path | relevance |
|----------|------|-----------|
| lang.terms | briefs/practices/lang.terms/ | variable names, term choices |
| lang.tones | briefs/practices/lang.tones/ | comment style, lowercase |
| code.prod/evolvable.procedures | briefs/practices/code.prod/evolvable.procedures/ | function signatures |
| code.prod/readable.comments | briefs/practices/code.prod/readable.comments/ | .what/.why headers |
| code.prod/readable.narrative | briefs/practices/code.prod/readable.narrative/ | flow, early returns |
| code.test/frames.behavior | briefs/practices/code.test/frames.behavior/ | bdd structure |

---

## prod code review (vaultAdapterAwsConfig.ts lines 183-188)

### rule: forbid-gerunds

**check:** all terms in the change

| term | status |
|------|--------|
| `validate` | verb, not gerund |
| `sso` | acronym |
| `session` | noun |
| `mech` | noun |
| `triggers` | verb |
| `browser` | noun |
| `login` | noun |
| `expired` | past participle |
| `source` | noun |
| `profile` | noun |
| `derives` | verb |
| `credentials` | noun |

**verdict:** no gerunds

### rule: prefer-lowercase

**check:** comments use lowercase prose

```ts
// validate sso session via mech (triggers browser login if expired)
// return profile name (AWS SDK derives credentials from profile)
```

both start lowercase. **passes.**

### rule: require-what-why-headers

**check:** function has .what/.why jsdoc

the function `get` is part of the `vaultAdapterAwsConfig` object. the object already has a top-level jsdoc. individual method changes do not require new jsdoc.

**verdict:** not applicable (method within object)

### rule: forbid-else-branches

**check:** no else branches in the change

lines 183-188 contain no `else`. the early return at line 181 uses `if (!input.mech) return source;` — no else.

**verdict:** passes

### rule: require-arrow-only

**check:** function syntax

`get: async (input) => {` — arrow function syntax. **passes.**

### rule: require-input-context-pattern

**check:** function signature

`get: async (input) => {` — receives `input` object. vault adapters do not use context (they are leaf adapters). **passes.**

---

## test code review (vaultAdapterAwsConfig.test.ts lines 151-176)

### rule: require-given-when-then

**check:** test structure

```ts
when('[t0.5] get called with exid and mech', () => {
  beforeEach(() => { ... });
  then('returns the exid (profile name), not credentials', async () => { ... });
});
```

uses `when`/`then` from test-fns. **passes.**

### rule: prefer-data-driven (caselist)

**check:** is this a transformer test?

no — this is a vault adapter integration test. data-driven not applicable.

**verdict:** not applicable

### rule: forbid-redundant-expensive-operations

**check:** single operation per when block

the `when` block has one `then` block. no redundant calls.

**verdict:** passes

### rule: require-useThen-useWhen-for-shared-results

**check:** results shared across then blocks?

only one `then` block in this `when`. not applicable.

**verdict:** not applicable

---

## term checks

### rule: forbid-term-{blocklist}

**check:** searched for forbidden terms in the change

the comment says "AWS SDK derives credentials" — uses "derives". no forbidden terms found.

**verdict:** passes

### rule: forbid-shouts

**check:** acronyms lowercase

- `sso` — lowercase
- `AWS SDK` — this is in a comment; AWS is a proper noun/brand

**verdict:** passes (brand names capitalized)

---

## summary

| standard | status |
|----------|--------|
| forbid-gerunds | passes |
| prefer-lowercase | passes |
| forbid-else-branches | passes |
| require-arrow-only | passes |
| require-input-context-pattern | passes |
| require-given-when-then | passes |
| forbid-term-{blocklist} | passes |
| forbid-shouts | passes |

---

## why it holds

**all mechanic role standards followed.**

1. **no gerunds** — all terms are proper nouns, verbs, or past participles.

2. **lowercase comments** — both comment lines start lowercase.

3. **no else branches** — early return pattern at line 181, no else.

4. **arrow function** — `get: async (input) => {` is arrow syntax.

5. **bdd test structure** — uses when/then from test-fns.

6. **no forbidden terms** — "derives" used, blocklist terms avoided.

the implementation adheres to mechanic role standards.

