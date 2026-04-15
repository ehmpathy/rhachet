# self-review r7: role-standards-adherance

deep dive. enumerate all relevant rule directories. check each rule category against the code.

---

## rule directory enumeration

I will check these briefs/ subdirectories:

| directory | why relevant |
|-----------|--------------|
| lang.terms/ | term choices in code and comments |
| lang.tones/ | comment style, lowercase preference |
| code.prod/evolvable.procedures/ | function signatures, arrow functions |
| code.prod/evolvable.domain.operations/ | operation naming (get/set/gen verbs) |
| code.prod/readable.comments/ | .what/.why headers |
| code.prod/readable.narrative/ | flow, early returns, no else |
| code.prod/pitofsuccess.errors/ | error patterns (not applicable here) |
| code.test/frames.behavior/ | bdd given/when/then structure |
| code.test/scope.unit/ | test scope classification |

---

## lang.terms checks

### rule.forbid.gerunds

**search:** all words that end in -ing

**prod code:**
```ts
// validate sso session via mech (triggers browser login if expired)
```

| word | analysis |
|------|----------|
| triggers | verb, third person singular — not gerund |
| login | noun — not gerund |

no gerunds found in prod change.

**test code:**
```ts
// mock aws configure export-credentials output (mech.deliverForGet calls this)
```

no gerunds found in test change.

**verdict:** passes

### rule.require.order.noun_adj

**check:** variable names follow [noun][adj] order

| variable | analysis |
|----------|----------|
| `mechAdapter` | [noun:mech][noun:adapter] — compound noun, acceptable |
| `source` | single noun — acceptable |
| `result` | single noun — acceptable |

**verdict:** passes

### rule.forbid.term-{blocklist}

**check:** no forbidden terms from the blocklist

searched the change for all items on the forbidden term list. none found.

**verdict:** passes

---

## lang.tones checks

### rule.prefer.lowercase

**check:** comments start lowercase

```ts
// validate sso session via mech (triggers browser login if expired)
// return profile name (AWS SDK derives credentials from profile)
// mock aws configure export-credentials output (mech.deliverForGet calls this)
```

all three start lowercase. **passes.**

### rule.forbid.shouts

**check:** no ALL-CAPS acronyms (except brand names)

| term | analysis |
|------|----------|
| sso | lowercase — correct |
| AWS | brand name — acceptable |
| SDK | part of "AWS SDK" brand — acceptable |

**verdict:** passes

---

## code.prod/evolvable.procedures checks

### rule.require.arrow-only

**check:** function uses arrow syntax

```ts
get: async (input) => {
```

arrow syntax. **passes.**

### rule.require.input-context-pattern

**check:** signature follows (input, context?) pattern

```ts
get: async (input) => {
```

vault adapters are leaf adapters — they do not receive context. the pattern is `(input)` which is acceptable for adapters.

**verdict:** passes (adapter exception)

### rule.forbid.positional-args

**check:** no positional args

```ts
await mechAdapter.deliverForGet({ source });
```

uses named object `{ source }`. **passes.**

---

## code.prod/evolvable.domain.operations checks

### rule.require.get-set-gen-verbs

**check:** operation verb

`get` is the operation — it retrieves data. **passes.**

---

## code.prod/readable.comments checks

### rule.require.what-why-headers

**check:** does the function need .what/.why?

the `get` method is part of `vaultAdapterAwsConfig` object. the object-level jsdoc at line 166 provides the .what/.why for the adapter. individual methods use inline comments instead.

**verdict:** passes (method within documented object)

---

## code.prod/readable.narrative checks

### rule.forbid.else-branches

**check:** no else in the change

lines 183-188:
```ts
// validate sso session via mech (triggers browser login if expired)
const mechAdapter = getMechAdapter(input.mech);
await mechAdapter.deliverForGet({ source });

// return profile name (AWS SDK derives credentials from profile)
return source;
```

no `else` keyword. **passes.**

### rule.avoid.unnecessary-ifs

**check:** no unnecessary ifs in the change

the change contains no `if` statements. the early return at line 180-181 is extant code, not part of this change.

**verdict:** passes

---

## code.test/frames.behavior checks

### rule.require.given-when-then

**check:** test uses bdd structure

```ts
when('[t0.5] get called with exid and mech', () => {
  beforeEach(() => { ... });
  then('returns the exid (profile name), not credentials', async () => {
    const result = await vaultAdapterAwsConfig.get({
      slug: 'acme.prod.AWS_PROFILE',
      exid: 'acme-prod',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
    });
    expect(result).toEqual('acme-prod');
  });
});
```

uses `when` and `then` from test-fns. the `given` block is provided by the parent `given('[case2] exid provided', () => {` at line 140.

**verdict:** passes

### rule.require.useThen-useWhen-for-shared-results

**check:** any shared results?

only one `then` block — no shared results pattern needed.

**verdict:** not applicable

---

## summary table

| rule | status | notes |
|------|--------|-------|
| forbid-gerunds | passes | no -ing nouns |
| require.order.noun_adj | passes | compounds acceptable |
| forbid-term-{blocklist} | passes | none found |
| prefer.lowercase | passes | all comments lowercase |
| forbid.shouts | passes | brands acceptable |
| require.arrow-only | passes | arrow syntax |
| require.input-context-pattern | passes | adapter exception |
| forbid.positional-args | passes | uses named object |
| require.get-set-gen-verbs | passes | `get` verb |
| require.what-why-headers | passes | object-level jsdoc |
| forbid.else-branches | passes | no else |
| avoid.unnecessary-ifs | passes | no ifs in change |
| require.given-when-then | passes | bdd structure |

---

## why it holds

**all mechanic role standards followed.**

1. **lang.terms compliance**
   - no gerunds in any changed code or comments
   - variable names follow conventions
   - no forbidden terms used

2. **lang.tones compliance**
   - all comments start lowercase
   - acronyms lowercase (except brand names)

3. **evolvable.procedures compliance**
   - arrow function syntax
   - input parameter pattern (adapter exception documented)
   - named arguments in function calls

4. **readable.narrative compliance**
   - no else branches
   - no unnecessary conditionals
   - clear flow

5. **test.frames compliance**
   - bdd when/then structure
   - single test case (no shared result pattern needed)

the implementation adheres to all relevant mechanic role standards.

