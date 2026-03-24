# self-review r6: has-behavior-declaration-coverage

## the question

does the blueprint cover all requirements from vision and criteria?

---

## vision requirements checklist

### usecases from vision

| usecase | blueprint coverage |
|---------|-------------------|
| fill test keys for default owner | ✓ `--env test`, `--owner` defaults to `['default']` |
| fill test keys for multiple owners | ✓ `--owner <owner...>` repeatable flag |
| fill prod keys | ✓ `--env prod` supported |
| refresh a specific key | ✓ `--key <key>` filter + `--refresh` flag |
| refresh all keys | ✓ `--refresh` flag |

### inputs from vision

| input | vision requirement | blueprint coverage |
|-------|-------------------|-------------------|
| --env | required, accepts test/prod/all | ✓ `.requiredOption('--env <env>')` |
| --owner | repeatable, default: `default` | ✓ `.option('--owner <owner...>', ..., ['default'])` |
| --prikey | repeatable, extends discovered | ✓ `.option('--prikey <path...>')` |
| --key | specific key filter | ✓ `.option('--key <key>')` |
| --refresh | re-prompt even if set | ✓ `.option('--refresh')` |

### outputs from vision

| output | vision requirement | blueprint coverage |
|--------|-------------------|-------------------|
| tree output | each key × owner result | ✓ console.log tree format |
| exit 0 | all keys verified | ✓ `return { results, summary }` → CLI uses summary.failed |
| exit 1 | any key fails roundtrip | ✓ summary.failed > 0 → exit 1 |

---

## criteria requirements checklist

### usecase.1 = fill all keys for default owner

| criterion | blueprint coverage |
|-----------|-------------------|
| prompts user for each key value | ✓ `await promptHiddenInput({ prompt: ... })` |
| sets each key for owner=default | ✓ `await setKeyrackKey({ ... }, hostContext)` |
| unlocks and gets each key to verify | ✓ `await unlockKeyrackKeys()` + `await getKeyrackKeyGrant()` |
| exits 0 when all keys verified | ✓ summary tracks failed count |

### usecase.2 = fill all keys for multiple owners

| criterion | blueprint coverage |
|-----------|-------------------|
| for each key, prompts user for value per owner | ✓ nested loop: `for (const slug of slugs)` → `for (const owner of input.owners)` |
| inner loop is owners | ✓ owner loop is inner (lines ~45-80 in blueprint) |
| exits 0 when all keys verified for all owners | ✓ summary aggregates all results |

### usecase.3 = partial fill (some keys already set)

| criterion | blueprint coverage |
|-----------|-------------------|
| skips already-set keys with "already set, skip" | ✓ `if (keyHost && !input.refresh) { console.log('already set, skip'); results.push({ status: 'skipped' }); continue; }` |
| prompts only for absent key | ✓ continues past skip |
| exits 0 when all keys verified or skipped | ✓ summary counts skipped + set |

### usecase.4 = refresh all keys

| criterion | blueprint coverage |
|-----------|-------------------|
| re-prompts for all keys despite already set | ✓ `if (keyHost && !input.refresh)` — when refresh=true, does not skip |
| overwrites extant values | ✓ calls setKeyrackKey which upserts |
| exits 0 when all keys re-verified | ✓ roundtrip verification |

### usecase.5 = fill specific key only

| criterion | blueprint coverage |
|-----------|-------------------|
| prompts only for specific key | ✓ `const slugs = input.key ? allSlugs.filter(...) : allSlugs` |
| ignores other keys in manifest | ✓ filter to specific key |
| exits 0 when specified key verified | ✓ roundtrip verification |

---

## criteria errors checklist

| error condition | criterion | blueprint coverage |
|-----------------|-----------|-------------------|
| no prikey can decrypt owner's host manifest | fail-fast with "no available prikey for owner=X" | ✓ `throw new BadRequestError(\`no available prikey for owner=\${owner}\`)` |
| no keys match specified --env | warn "no keys found" | ✓ `console.log(\`warn: no keys found...\`)` |
| user enters empty value | fail-fast "value cannot be empty" | ✓ `if (!secret) throw new BadRequestError('value cannot be empty')` |
| keyrack.yml has extends cycle | fail-fast at manifest expansion | ✓ delegated to daoKeyrackRepoManifest.get() |
| specified --key not found in manifest | fail-fast "key X not found" | ✓ `throw new BadRequestError(\`key \${input.key} not found...\`)` |

---

## criteria boundary conditions checklist

| condition | criterion | blueprint coverage |
|-----------|-----------|-------------------|
| --env all | fills keys from both env.test and env.prod | ✓ getAllKeyrackSlugsForEnv handles 'all' |
| key has prescribed vault | uses prescribed vault | ✓ `keySpec?.vault ?? ...` |
| key has no prescribed vault | infers vault, falls back to os.secure | ✓ `inferKeyrackVaultFromKey() ?? 'os.secure'` |
| owner's prikey is in ssh-agent | discovers without --prikey flag | ✓ `prikeysToTry = [null, ...input.prikeys]` — null triggers discovery |

---

## gaps found

### gap 1: mech inference not explicit

**criterion:** "infers vault... when not prescribed"
**blueprint:** shows vault inference but mech inference is implicit.

**analysis:** blueprint line shows:
```ts
const mechInferred = inferMechFromVault({ vault });
const mech = keySpec?.mech ?? mechInferred ?? 'PERMANENT_VIA_REPLICA';
```

**resolution:** no gap. mech inference is covered.

### gap 2: --env all behavior

**criterion:** "fills keys from both env.test and env.prod"
**blueprint:** delegates to getAllKeyrackSlugsForEnv.

**analysis:** getAllKeyrackSlugsForEnv already handles env='all' — returns slugs from both envs.

**resolution:** no gap. delegated to extant operation.

---

## conclusion

| declaration | covered? |
|-------------|----------|
| vision usecases (5) | ✓ all covered |
| vision inputs (5) | ✓ all covered |
| vision outputs (3) | ✓ all covered |
| criteria usecases (5) | ✓ all covered |
| criteria errors (5) | ✓ all covered |
| criteria boundaries (4) | ✓ all covered |

**no gaps found.** blueprint covers all requirements from vision and criteria.

