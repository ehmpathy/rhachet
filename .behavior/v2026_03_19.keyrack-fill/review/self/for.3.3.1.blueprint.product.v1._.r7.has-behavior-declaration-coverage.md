# self-review r7: has-behavior-declaration-coverage

## the question

does the blueprint cover all requirements from vision and criteria?

---

## method

read vision and criteria line by line. for each requirement, locate the exact blueprint line that satisfies it. articulate why it holds.

---

## vision requirements

### usecases from vision

#### usecase: fill test keys for default owner

**vision:** `rhx keyrack fill --env test`

**blueprint coverage:**
- line: `.requiredOption('--env <env>', 'environment to fill (test, prod, all)')`
- line: `.option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])`

**why it holds:** the CLI defines `--env` as required and `--owner` defaults to `['default']`. when user runs `rhx keyrack fill --env test`, the default owner is used. no gap.

#### usecase: fill test keys for multiple owners

**vision:** `rhx keyrack fill --env test --owner default --owner ehmpath --prikey ~/.ssh/ehmpath`

**blueprint coverage:**
- line: `.option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])`
- line: `.option('--prikey <path...>', 'prikey(s) to consider for manifest decryption')`
- line: `for (const owner of input.owners) {`

**why it holds:** `--owner` is repeatable (array), `--prikey` is repeatable (array), and the inner loop iterates over owners. the exact command from vision works with the CLI definition.

#### usecase: fill prod keys

**vision:** `rhx keyrack fill --env prod`

**blueprint coverage:**
- line: `.requiredOption('--env <env>', 'environment to fill (test, prod, all)')`
- line: `const allSlugs = getAllKeyrackSlugsForEnv({ manifest: repoManifest, env: input.env });`

**why it holds:** `--env` accepts `prod` as valid value. getAllKeyrackSlugsForEnv is an extant operation that handles prod env. no gap.

#### usecase: refresh a specific key

**vision:** `rhx keyrack fill --env test --key CLOUDFLARE_API_TOKEN`

**blueprint coverage:**
- line: `.option('--key <key>', 'specific key to fill (default: all)')`
- line: `const slugs = input.key ? allSlugs.filter(s => s.includes(input.key)) : allSlugs;`

**why it holds:** `--key` flag filters slugs to those that contain the key name. combined with `--refresh` (see next usecase) enables refresh of specific key.

#### usecase: refresh all keys

**vision:** `rhx keyrack fill --env test --refresh`

**blueprint coverage:**
- line: `.option('--refresh', 'refresh even if already set')`
- line: `if (keyHost && !input.refresh) { ... skip ... continue; }`

**why it holds:** when `--refresh` is true, the skip condition `keyHost && !input.refresh` evaluates to false, so the key is re-prompted even if already set.

### inputs from vision

| input | vision | blueprint | why it holds |
|-------|--------|-----------|--------------|
| --env | required, test/prod/all | `.requiredOption('--env <env>')` | requiredOption enforces presence |
| --owner | repeatable, default: default | `.option('--owner <owner...>', ..., ['default'])` | array syntax + default value |
| --prikey | repeatable, extends discovered | `.option('--prikey <path...>')` + `prikeysToTry = [null, ...input.prikeys]` | null triggers discovery, then extends with supplied |
| --key | specific key filter | `.option('--key <key>')` + `allSlugs.filter(...)` | filter logic present |
| --refresh | re-prompt even if set | `.option('--refresh')` + skip condition check | boolean flag controls skip logic |

### outputs from vision

| output | vision | blueprint | why it holds |
|--------|--------|-----------|--------------|
| tree output | each key × owner result | `console.log(\`🔐 keyrack fill\`)` + `console.log(\`🔑 ${keyName}\`)` + `console.log(\`   ├─ owner ${owner}:\`)` | tree structure with emojis and indentation |
| exit 0 | all keys verified | `return { results, summary }` — CLI uses summary to determine exit | summary.failed === 0 means exit 0 |
| exit 1 | any key fails roundtrip | `status: 'failed'` tracked in results, summary.failed > 0 means exit 1 | failure tracked and summary enables exit code logic |

---

## criteria requirements

### usecase.1: fill all keys for default owner

| criterion | blueprint line | why it holds |
|-----------|----------------|--------------|
| prompts user for each key value | `const secret = await promptHiddenInput({ prompt: \`enter value for ${keyName}:\` });` | promptHiddenInput is called per key per owner |
| sets each key for owner=default | `await setKeyrackKey({ key: keyName, env: input.env, ... }, hostContext);` | setKeyrackKey called with hostContext for the owner |
| unlocks and gets each key to verify | `await unlockKeyrackKeys({ ... })` then `await getKeyrackKeyGrant({ ... })` | both operations called in sequence |
| exits 0 when all keys verified | `summary.failed > 0` determines exit code | when failed is 0, exit 0 |

### usecase.2: fill all keys for multiple owners

| criterion | blueprint line | why it holds |
|-----------|----------------|--------------|
| for each key, prompts user for value per owner | outer loop: `for (const slug of slugs)`, inner loop: `for (const owner of input.owners)`, prompt inside inner loop | nested loops with prompt in inner |
| inner loop is owners | `for (const owner of input.owners) {` is inside `for (const slug of slugs) {` | code structure shows owners as inner loop |
| exits 0 when all keys verified for all owners | summary aggregates all results across all keys and owners | unified track |

### usecase.3: partial fill (some keys already set)

| criterion | blueprint line | why it holds |
|-----------|----------------|--------------|
| skips already-set keys with "already set, skip" | `if (keyHost && !input.refresh) { console.log(\`✓ already set, skip\`); results.push({ status: 'skipped' }); continue; }` | exact message and skip logic |
| prompts only for absent key | `continue;` after skip means loop proceeds to next owner/key | control flow correct |
| exits 0 when all keys verified or skipped | `summary.set + summary.skipped` counted, failed determines exit | skipped treated as success |

### usecase.4: refresh all keys

| criterion | blueprint line | why it holds |
|-----------|----------------|--------------|
| re-prompts for all keys despite already set | `if (keyHost && !input.refresh)` — when refresh=true, condition is false, skip does not execute | refresh bypasses skip |
| overwrites extant values | `setKeyrackKey()` is called which upserts | extant behavior of setKeyrackKey |
| exits 0 when all keys re-verified | roundtrip verification runs regardless of refresh | verification always runs after set |

### usecase.5: fill specific key only

| criterion | blueprint line | why it holds |
|-----------|----------------|--------------|
| prompts only for specific key | `const slugs = input.key ? allSlugs.filter(s => s.includes(input.key)) : allSlugs;` | filter reduces to matched key |
| ignores other keys in manifest | filter excludes non-matched keys | only filtered slugs iterated |
| exits 0 when specified key verified | same verification logic applies | single key goes through same flow |

---

## error handle

| error condition | criterion | blueprint line | why it holds |
|-----------------|-----------|----------------|--------------|
| no prikey can decrypt owner's host manifest | fail-fast "no available prikey for owner=X" | `if (!hostContext) { throw new BadRequestError(\`no available prikey for owner=${owner}\`); }` | exact error message |
| no keys match specified --env | warn "no keys found" | `console.log(\`warn: no keys found for env=${input.env}\`);` | exact warn message |
| user enters empty value | fail-fast "value cannot be empty" | `if (!secret) { throw new BadRequestError('value cannot be empty'); }` | exact error message |
| keyrack.yml has extends cycle | fail-fast at manifest expansion | `await daoKeyrackRepoManifest.get()` — extant DAO handles cycle detection | delegated to extant behavior |
| specified --key not found in manifest | fail-fast "key X not found" | `if (input.key) { throw new BadRequestError(\`key ${input.key} not found...\`); }` | error thrown when filter returns empty and key was specified |

---

## boundary conditions

| condition | criterion | blueprint line | why it holds |
|-----------|-----------|----------------|--------------|
| --env all | fills keys from both env.test and env.prod | `getAllKeyrackSlugsForEnv({ manifest: repoManifest, env: input.env })` — extant operation handles 'all' | delegated to extant behavior |
| key has prescribed vault | uses prescribed vault | `const vault = keySpec?.vault ?? vaultInferred ?? 'os.secure';` | keySpec.vault checked first |
| key has no prescribed vault | infers vault, falls back to os.secure | `vaultInferred ?? 'os.secure'` | fallback chain explicit |
| owner's prikey is in ssh-agent | discovers without --prikey flag | `const prikeysToTry = [null, ...input.prikeys];` — null triggers discovery | null first in array triggers DAO discovery |

---

## articulation: why each holds

### the prikey discovery pattern

the blueprint uses `[null, ...input.prikeys]` where null means "try discovery first". this is subtle but correct because:
1. genKeyrackHostContext with prikey=null triggers the extant discovery mechanism (ssh-agent, ~/.ssh/*)
2. supplied prikeys extend the pool, not replace it
3. iteration stops on first success (break after hostContext found)

this satisfies the criterion "discovers without --prikey flag" because null is always tried first.

### the inner loop on owners

vision specifies: "do the owner on the inner loop, so that if the user can repeat the steps required to set their key"

blueprint implements:
```
for (const slug of slugs) {        // outer: keys
  for (const owner of input.owners) { // inner: owners
    // prompt, set, unlock, get
  }
}
```

this is correct because user sets CLOUDFLARE_API_TOKEN for owner=default, then immediately for owner=ehmpath (same key, same steps to repeat), before move to next key.

### the skip-if-set idempotency

the condition `if (keyHost && !input.refresh)` correctly implements:
- keyHost present AND refresh false → skip (idempotent)
- keyHost present AND refresh true → proceed (override)
- keyHost absent → proceed (first fill)

this satisfies both usecase.3 (partial fill) and usecase.4 (refresh).

### the error handle chain

each error condition has a specific handler:
1. no prikey → BadRequestError with owner name
2. empty value → BadRequestError with clear message
3. key not found → BadRequestError with key name and env
4. extends cycle → delegated to DAO (extant behavior)
5. no keys → warn (not error), exit 0

the fail-fast pattern is consistent with extant keyrack operations.

---

## gaps found

### gap analysis: none

every requirement from vision and criteria has a correspondent implementation in the blueprint. the articulation above traces each requirement to specific code.

| category | requirements | covered |
|----------|--------------|---------|
| vision usecases | 5 | 5 |
| vision inputs | 5 | 5 |
| vision outputs | 3 | 3 |
| criteria usecases | 5 | 5 |
| criteria errors | 5 | 5 |
| criteria boundaries | 4 | 4 |

---

## conclusion

the blueprint covers all behavior declaration requirements. each requirement traces to specific code. the articulation explains why each holds, not just that it holds.

no gaps found. the blueprint is complete with respect to vision and criteria.
