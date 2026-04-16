# self-review: has-consistent-mechanisms (r2)

review for new mechanisms that duplicate extant functionality.

---

## analysis method

searched codebase for related patterns:
- `genContext*` — context generation patterns
- `asSlug`, `TokenSlug`, `KeySlug` — slug handler patterns
- `keyrack` operations — credential handler patterns

---

## mechanisms reviewed

### 1. `genContextBrainAuth` (in invokeBrainsAuth.ts)

**question:** does this duplicate extant context generation?

**answer:** no — it composes on top of `genContextKeyrackGrantGet`

the spike reuses the extant keyrack context:
```typescript
const keyrackContext = await genContextKeyrackGrantGet({
  gitroot: input.gitroot,
  owner: input.owner,
});
```

the brain auth context is a composition layer that:
- wraps keyrack access for the brain auth domain
- adds rotation state (in-memory for spike)
- provides adapter access

this follows the established pattern of domain-specific contexts that compose on infrastructure contexts.

### 2. `asBrainAuthTokenSlugs`

**question:** does this duplicate `asKeyrackKeySlug`?

**answer:** no — different purposes

| aspect | `asKeyrackKeySlug` | `asBrainAuthTokenSlugs` |
|--------|-------------------|------------------------|
| input | single key string | keyrack URI with wildcards |
| output | single canonical slug | array of matched slugs |
| use case | CLI --key resolution | pool credential expansion |

`asKeyrackKeySlug` handles single-key resolution with env inference.
`asBrainAuthTokenSlugs` handles wildcard patterns like `KEY_*` and expands to all matches.

### 3. `asBrainAuthSpecShape`

**question:** is there an extant spec parser?

**answer:** no — this is a new DSL

the auth spec format (`pool(keyrack://org/env/KEY_*)`) is new for this spike.
no extant parser for this format.

### 4. `genApiKeyHelperCommand`

**question:** is there an extant command formatter?

**answer:** no — this is specific to claude-code integration

this generates the shell command for claude-code's `api_key_helper` config.
no extant formatter for this specific output.

---

## extant mechanisms reused

the spike correctly reuses:

| mechanism | location | purpose |
|-----------|----------|---------|
| `genContextKeyrackGrantGet` | keyrack ops | keyrack context generation |
| `getOneKeyrackGrantByKey` | keyrack ops | credential retrieval |
| `BadRequestError` | helpful-errors | user-fixable errors |
| `UnexpectedCodePathError` | helpful-errors | code defects |
| `DomainLiteral` | domain-objects | domain object base class |
| commander.js patterns | CLI | command registration |

---

## conclusion

no duplication found.

new mechanisms are specialized for the brain auth domain and do not overlap with extant functionality.

extant mechanisms are reused where applicable.

