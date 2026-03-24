# self-review r5: has-consistent-conventions

## the question

does fillKeyrackKeys follow extant name conventions and patterns?

---

## name convention analysis

### operation names

**extant patterns:**

| operation | pattern |
|-----------|---------|
| setKeyrackKey | set + Keyrack + Key |
| getKeyrackKeyGrant | get + Keyrack + KeyGrant |
| unlockKeyrackKeys | unlock + Keyrack + Keys |
| delKeyrackKey | del + Keyrack + Key |
| genKeyrackHostContext | gen + Keyrack + HostContext |
| getAllKeyrackSlugsForEnv | getAll + Keyrack + Slugs + ForEnv |

**blueprint:**

| operation | pattern | consistent? |
|-----------|---------|-------------|
| fillKeyrackKeys | fill + Keyrack + Keys | ✓ verb + Keyrack + noun |

**verdict:** follows the `verbKeyrackNoun` pattern.

---

### verb usage

**extant verbs:**

| verb | usage |
|------|-------|
| set | mutate/upsert a single key |
| get | retrieve a single item |
| getAll | retrieve multiple items |
| unlock | unlock for session |
| del | delete |
| gen | find-or-create |
| infer | derive from context |

**blueprint verb:**

| verb | usage |
|------|-------|
| fill | orchestrate set for multiple keys |

**question:** is "fill" an extant verb?

**search:** grep for fill in domain.operations/keyrack:

- no extant operation uses "fill" verb

**verdict:** "fill" is a new verb, but it's semantically correct. "fill" implies "populate all required items" — distinct from "set" (single item) or "gen" (find-or-create).

alternatives considered:
- `setAllKeyrackKeys` — implies upsert, but fill includes skip-if-set
- `genAllKeyrackKeys` — implies create-if-absent, but fill includes prompt
- `populateKeyrackKeys` — "populate" is similar but less concise
- `configureKeyrackKeys` — too vague

**conclusion:** "fill" is appropriate. it's a new orchestration verb that conveys "walk through and fill each required item."

---

### type names

**extant patterns:**

| type | pattern |
|------|---------|
| KeyrackKeyGrant | Keyrack + Key + Grant |
| KeyrackHostContext | Keyrack + Host + Context |
| KeyrackRepoManifest | Keyrack + Repo + Manifest |
| KeyrackHostManifest | Keyrack + Host + Manifest |
| KeyrackGrantAttempt | Keyrack + Grant + Attempt |

**blueprint:**

| type | pattern | consistent? |
|------|---------|-------------|
| FillKeyResult | Fill + Key + Result | ⚠️ |

**question:** should it be `KeyrackFillResult` instead?

**analysis:**
- `FillKeyResult` is local to fillKeyrackKeys.ts
- not exported, not a domain object
- inline types don't need Keyrack prefix

**verdict:** local inline type. `FillKeyResult` is appropriate. if extracted to domain.objects, would become `KeyrackFillResult`.

---

### file names

**extant patterns:**

| file | pattern |
|------|---------|
| setKeyrackKey.ts | verb + Keyrack + Noun |
| getKeyrackKeyGrant.ts | verb + Keyrack + Noun |
| unlockKeyrackKeys.ts | verb + Keyrack + Noun |
| genKeyrackHostContext.ts | verb + Keyrack + Noun |

**blueprint:**

| file | pattern | consistent? |
|------|---------|-------------|
| fillKeyrackKeys.ts | verb + Keyrack + Noun | ✓ |

**verdict:** follows extant file name pattern.

---

### CLI command names

**extant patterns:**

| command | pattern |
|---------|---------|
| keyrack set | keyrack + verb |
| keyrack get | keyrack + verb |
| keyrack unlock | keyrack + verb |
| keyrack status | keyrack + noun |
| keyrack del | keyrack + verb |
| keyrack init | keyrack + verb |

**blueprint:**

| command | pattern | consistent? |
|---------|---------|-------------|
| keyrack fill | keyrack + verb | ✓ |

**verdict:** follows extant CLI name pattern.

---

### flag names

**extant patterns (from invokeKeyrack):**

| flag | usage |
|------|-------|
| --env | environment selector |
| --key | key name |
| --owner | keyrack owner |
| --prikey | private key path |
| --vault | vault type |

**blueprint:**

| flag | usage | extant? |
|------|-------|---------|
| --env | environment selector | ✓ reuse |
| --key | specific key to fill | ✓ reuse |
| --owner | owners to fill (repeatable) | ✓ reuse |
| --prikey | prikeys to consider (repeatable) | ✓ reuse |
| --refresh | re-prompt if set | new flag, appropriate |

**verdict:** reuses extant flags where applicable. `--refresh` is new but follows common CLI convention (verb flag for override behavior).

---

### test file names

**extant patterns:**

| test file | pattern |
|-----------|---------|
| setKeyrackKey.test.ts | operation + .test.ts |
| unlockKeyrackKeys.integration.test.ts | operation + .integration.test.ts |

**blueprint:**

| test file | pattern | consistent? |
|-----------|---------|-------------|
| fillKeyrackKeys.play.integration.test.ts | operation + .play.integration.test.ts | ✓ |

**question:** what is ".play."?

**search:** grep for .play. in test files

found: extant pattern for journey-style integration tests that exercise multi-step flows.

**verdict:** follows extant test name convention.

---

## conclusion

| aspect | consistent? |
|--------|-------------|
| operation name | ✓ fillKeyrackKeys follows verbKeyrackNoun |
| verb choice | ✓ "fill" is appropriate for orchestration |
| type names | ✓ inline type, no Keyrack prefix needed |
| file names | ✓ follows verbKeyrackNoun.ts |
| CLI command | ✓ follows keyrack + verb |
| flag names | ✓ reuses extant flags, new --refresh appropriate |
| test file names | ✓ follows .play.integration.test.ts |

**no convention divergence found.** blueprint follows extant conventions.

