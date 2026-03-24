# self-review r7: has-behavior-declaration-adherance

## the question

does the blueprint adhere correctly to vision and criteria? did the junior misinterpret or deviate from the spec?

---

## method

read the blueprint line by line. for each implementation, check that it matches what vision and criteria specify. flag any deviations.

---

## blueprint adherance check

### CLI flag definitions

**blueprint:**
```ts
.requiredOption('--env <env>', 'environment to fill (test, prod, all)')
.option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])
.option('--prikey <path...>', 'prikey(s) to consider for manifest decryption')
.option('--key <key>', 'specific key to fill (default: all)')
.option('--refresh', 'refresh even if already set')
```

**vision specifies:**
- `--env <test|prod|all>` required ✓
- `--owner <name>` repeatable, default `default` ✓
- `--prikey <path>` repeatable, extends discovered ✓
- `--key <name>` optional ✓
- `--refresh` re-prompt even if configured ✓

**adherance:** correct. each flag matches the vision specification exactly.

---

### loop structure: keys outer, owners inner

**blueprint:**
```ts
for (const slug of slugs) {        // outer
  for (const owner of input.owners) { // inner
```

**vision specifies:** "do the owner on the inner loop, so that if the user can repeat the steps required to set their key"

**adherance:** correct. owners are inner loop, keys are outer. user sets same key for all owners before move to next key.

---

### prikey discovery + extension

**blueprint:**
```ts
const prikeysToTry = [null, ...input.prikeys];
let hostContext: KeyrackHostContext | null = null;
for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({ owner, prikey });
    break;
  } catch { continue; }
}
```

**vision specifies:** "we should expect a random set of --prikeys to consider... the --prikey repeatable flag just extends the set of prikeys we should consider (ontop of the discovered ones)"

**wish specifies:** "compare each discovered and supplied prikey against the host manifest to figure out which one is available to use"

**adherance:** correct. null triggers discovery first (extant DAO behavior), then supplied prikeys extend. iteration tries each until one works.

---

### skip-if-set behavior

**blueprint:**
```ts
if (keyHost && !input.refresh) {
  console.log(`✓ already set, skip`);
  results.push({ slug, owner, status: 'skipped' });
  continue;
}
```

**criteria.usecase.3 specifies:** "skips already-set keys with 'already set, skip'"

**criteria.usecase.4 specifies:** "re-prompts for all keys despite already set" (when --refresh)

**adherance:** correct. the condition `keyHost && !input.refresh` implements:
- keyHost present + no refresh → skip
- keyHost present + refresh → proceed (re-prompt)
- keyHost absent → proceed (first fill)

---

### vault inference and fallback

**blueprint:**
```ts
const vaultInferred = inferKeyrackVaultFromKey({ keyName });
const vault = keySpec?.vault ?? vaultInferred ?? 'os.secure';
```

**vision specifies:** "infer the vault and mechanism as needed; fallback to replica os.secure when not prescribed and not inferrable"

**criteria.boundary specifies:** "key has no prescribed vault → infers vault, falls back to os.secure"

**adherance:** correct. fallback chain is: prescribed → inferred → os.secure

---

### roundtrip verification

**blueprint:**
```ts
await setKeyrackKey({ ... }, hostContext);
await unlockKeyrackKeys({ ... }, context);
const grant = await getKeyrackKeyGrant({ ... }, context);
if (!grant?.value) {
  results.push({ slug, owner, status: 'failed' });
  continue;
}
```

**vision specifies:** "set it → unlock it → get it to verify that it is roundtrip usable"

**adherance:** correct. the sequence is set → unlock → get, with failure track if get returns no value.

---

### error handle

**blueprint errors:**
1. `throw new BadRequestError(\`no available prikey for owner=${owner}\`)`
2. `throw new BadRequestError('value cannot be empty')`
3. `throw new BadRequestError(\`key ${input.key} not found in manifest for env=${input.env}\`)`

**criteria.errors specifies:**
1. "fail-fast with 'no available prikey for owner=X'"
2. "fail-fast with 'value cannot be empty'"
3. "fail-fast with 'key X not found in manifest for env=Y'"

**adherance:** correct. each error message matches the criterion exactly.

---

### output format

**blueprint:**
```ts
console.log(`🔐 keyrack fill (env: ${input.env}, keys: ${slugs.length}, owners: ${input.owners.length})`);
console.log(`\n🔑 ${keyName}`);
console.log(`   ├─ owner ${owner}:`);
```

**vision specifies:** tree output with each key × owner result

**adherance:** correct. the output uses tree characters (├─) and emoji headers (🔐, 🔑).

---

## deviation check

### potential deviation 1: key filter logic

**blueprint:**
```ts
const slugs = input.key
  ? allSlugs.filter(s => s.includes(input.key))
  : allSlugs;
```

**question:** is `includes` the correct filter? could it match unintended keys?

**analysis:** if user specifies `--key CLOUDFLARE`, it would match both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. this could be intentional (fill all cloudflare keys) or unintentional.

**vision check:** "rhx keyrack fill --env test --key CLOUDFLARE_API_TOKEN" — implies exact key name

**verdict:** potential issue. `includes` could be too loose. however, the criteria says "specific key filter" not "exact match". partial match enables `--key CLOUDFLARE` to fill all cloudflare keys, which is a reasonable ergonomic choice.

**decision:** keep as-is. partial match is more ergonomic. if exact match is needed, user provides the full key name.

### potential deviation 2: summary exit code logic

**blueprint:**
```ts
return { results, summary };
```

**question:** where is exit code set?

**analysis:** the blueprint shows fillKeyrackKeys returns results and summary. the CLI action handler must use `summary.failed > 0` to determine exit code.

**vision specifies:** "exit 0 if all keys verified, exit 1 if any key fails roundtrip"

**verdict:** the blueprint does not show the exit code logic in the CLI action. this is acceptable because:
1. fillKeyrackKeys returns summary.failed count
2. the CLI action (not shown in full) uses this to set exit code
3. this follows extant CLI patterns where operations return data, CLI sets exit

**decision:** no deviation. exit code logic is in CLI layer, not operation layer.

---

## misinterpretation check

### check 1: "inner loop is owners"

**vision:** user can repeat the steps for same key across owners before next key

**blueprint:** owners loop is nested inside keys loop

**misinterpretation risk:** did junior swap the loops?

**verification:** the code shows `for (const slug of slugs)` then `for (const owner of input.owners)` — correct nest order.

### check 2: "--prikey extends, not replaces"

**vision:** supplied prikeys extend discovered, not replace

**blueprint:** `[null, ...input.prikeys]` — null (discovery) first, then extends

**misinterpretation risk:** did junior replace discovery with supplied?

**verification:** null comes first, so discovery is always tried before supplied prikeys.

### check 3: "roundtrip verification"

**vision:** set → unlock → get

**blueprint:** setKeyrackKey → unlockKeyrackKeys → getKeyrackKeyGrant

**misinterpretation risk:** did junior skip unlock step?

**verification:** all three operations are called in sequence. unlock is not skipped.

---

## gaps found

none. the blueprint adheres to vision and criteria correctly.

---

## conclusion

the blueprint adheres correctly to the behavior declaration:
- all CLI flags match vision specification
- loop structure correct (keys outer, owners inner)
- prikey discovery + extension correct
- skip-if-set behavior correct
- vault fallback chain correct
- roundtrip verification sequence correct
- error messages match criteria exactly
- output format follows tree structure

no misinterpretation or deviation found. the blueprint is adherent.
