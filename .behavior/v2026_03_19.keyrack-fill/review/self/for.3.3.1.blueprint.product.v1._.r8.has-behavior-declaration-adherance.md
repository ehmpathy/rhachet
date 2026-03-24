# self-review r8: has-behavior-declaration-adherance (deep code analysis)

## the question

does the blueprint adhere correctly to vision and criteria? does it follow extant code patterns?

---

## method

1. read extant keyrack operations to understand patterns
2. compare blueprint against extant patterns
3. verify vision/criteria adherance at code level

---

## extant pattern analysis

### extant setKeyrackKey signature

```ts
export const setKeyrackKey = async (
  input: {
    key: string;
    env: string;
    org: string;
    vault: KeyrackHostVault;
    mech: KeyrackGrantMechanism;
    ...
  },
  context: KeyrackHostContext,
): Promise<{ results: KeyrackKeyHost[] }> => { ... }
```

**pattern:** `(input: {...}, context: KeyrackHostContext) => Promise<{ results: ...[] }>`

**blueprint fillKeyrackKeys signature:**
```ts
export const fillKeyrackKeys = async (
  input: { env: string; owners: string[]; prikeys: string[]; ... },
  context: { gitroot: string; log: LogMethods },
): Promise<{ results: FillKeyResult[]; summary: { ... } }> => { ... }
```

**adherance check:** fillKeyrackKeys uses a simpler context type (gitroot + log) because it generates KeyrackHostContext internally per-owner via genKeyrackHostContext. this is correct because fillKeyrackKeys orchestrates multiple owners, each with their own hostContext.

**verdict:** adheres correctly. fillKeyrackKeys is a higher-level orchestrator that generates per-owner contexts.

---

### extant genKeyrackHostContext behavior

```ts
export const genKeyrackHostContext = async (input: {
  owner: string | null;
  prikey: string | null;
}): Promise<KeyrackHostContext> => {
  const hostManifest = await daoKeyrackHostManifest.get({ owner, prikey });
  if (!hostManifest) {
    throw new UnexpectedCodePathError(`host manifest not found. ${initTip}`, { owner });
  }
  ...
}
```

**pattern:** throws UnexpectedCodePathError if manifest not found for owner+prikey combo.

**blueprint prikey iteration:**
```ts
for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({ owner, prikey });
    break;
  } catch { continue; }
}
if (!hostContext) {
  throw new BadRequestError(`no available prikey for owner=${owner}`);
}
```

**adherance check:** the blueprint catches the error from genKeyrackHostContext and tries next prikey. if all fail, it throws BadRequestError (not UnexpectedCodePathError) because this is user input validation (no valid prikey provided).

**verdict:** adheres correctly. error type choice follows the pattern:
- genKeyrackHostContext throws UnexpectedCodePathError (internal state issue)
- fillKeyrackKeys throws BadRequestError (user input issue)

---

### extant loop-and-aggregate pattern

from setKeyrackKey:
```ts
const results: KeyrackKeyHost[] = [];
for (const slug of targetSlugs) {
  const keyHost = await setKeyrackKeyHost({ ... }, context);
  results.push(keyHost);
}
return { results };
```

**blueprint:**
```ts
const results: FillKeyResult[] = [];
for (const slug of slugs) {
  for (const owner of input.owners) {
    // ... set, unlock, get
    results.push({ slug, owner, status: '...' });
  }
}
return { results, summary };
```

**adherance check:** fillKeyrackKeys follows the same loop-and-aggregate pattern, just with nested loops (keys × owners). the results array accumulates FillKeyResult objects.

**verdict:** adheres correctly.

---

## vision adherance (code level)

### vision: "for each key, for each owner, set it, unlock it, get it"

**blueprint implementation:**
```ts
for (const slug of slugs) {              // for each key
  for (const owner of input.owners) {    // for each owner
    await setKeyrackKey({...}, hostContext);        // set it
    await unlockKeyrackKeys({...}, unlockContext);  // unlock it
    const grant = await getKeyrackKeyGrant({...});  // get it
  }
}
```

**verification:** the three operations are called in sequence. the loop structure matches vision exactly.

### vision: "inner loop is owners so user can repeat steps for same key"

**code verification:** `for (const owner of input.owners)` is inside `for (const slug of slugs)`. user fills CLOUDFLARE_API_TOKEN for default, then for ehmpath, then moves to next key.

### vision: "--prikey extends discovered, not replaces"

**code verification:** `const prikeysToTry = [null, ...input.prikeys]`

- `null` triggers discovery in genKeyrackHostContext (extant behavior)
- supplied prikeys come after, extend the pool
- order ensures discovery happens first

---

## criteria adherance (code level)

### criteria.usecase.3: "skips already-set keys with 'already set, skip'"

**blueprint:**
```ts
if (keyHost && !input.refresh) {
  console.log(`✓ already set, skip`);
  results.push({ slug, owner, status: 'skipped' });
  continue;
}
```

**verification:** message says "already set, skip". status is 'skipped'. continue skips to next iteration.

### criteria.errors: "fail-fast with 'no available prikey for owner=X'"

**blueprint:**
```ts
if (!hostContext) {
  throw new BadRequestError(`no available prikey for owner=${owner}`);
}
```

**verification:** exact message format. uses BadRequestError for user input validation.

### criteria.errors: "fail-fast with 'value cannot be empty'"

**blueprint:**
```ts
if (!secret) {
  throw new BadRequestError('value cannot be empty');
}
```

**verification:** exact message. fails before set if user enters empty value.

### criteria.errors: "fail-fast with 'key X not found in manifest for env=Y'"

**blueprint:**
```ts
if (slugs.length === 0) {
  if (input.key) {
    throw new BadRequestError(`key ${input.key} not found in manifest for env=${input.env}`);
  }
  console.log(`warn: no keys found for env=${input.env}`);
  return { results: [], summary: { set: 0, skipped: 0, failed: 0 } };
}
```

**verification:** when specific --key is provided and not found, throws BadRequestError. when no --key but no keys exist, warns and returns empty (not error).

---

## boundary conditions (code level)

### boundary: "--env all fills both test and prod"

**code:** `getAllKeyrackSlugsForEnv({ manifest: repoManifest, env: input.env })`

**extant behavior check:** getAllKeyrackSlugsForEnv handles env='all' by return slugs from both env.test and env.prod sections of manifest. this is delegated to extant code.

### boundary: "key has prescribed vault"

**blueprint:**
```ts
const keySpec = repoManifest.keys[slug];
const vault = keySpec?.vault ?? vaultInferred ?? 'os.secure';
```

**verification:** keySpec.vault is checked first (prescribed). fallback chain is prescribed → inferred → os.secure.

### boundary: "owner's prikey is in ssh-agent"

**blueprint:** `prikeysToTry = [null, ...input.prikeys]`

**verification:** null triggers genKeyrackHostContext with prikey=null. extant behavior of daoKeyrackHostManifest.get() with prikey=null attempts ssh-agent discovery. this is delegated to extant code.

---

## potential deviations investigated

### deviation 1: does blueprint prompt with correct format?

**blueprint:**
```ts
const secret = await promptHiddenInput({
  prompt: `enter value for ${keyName}:`,
});
```

**vision timeline shows:**
```
│  🔐 keyrack set (org: ehmpathy, env: test)
│     └─ ehmpathy.test.CLOUDFLARE_API_TOKEN
```

**question:** does the prompt include owner context?

**vision specifies:** "make it super clear which owner its for that they are asked to set into"

**issue found:** blueprint prompt says `enter value for ${keyName}:` but does not include owner in the prompt message.

**fix required:** prompt should include owner context.

**corrected blueprint line:**
```ts
const secret = await promptHiddenInput({
  prompt: `enter value for ${keyName} (owner=${owner}):`,
});
```

---

## issue found and fix

### issue: prompt does not include owner context

**criterion:** vision says "make it super clear which owner its for"

**blueprint before:** `enter value for ${keyName}:`

**blueprint after:** `enter value for ${keyName} (owner=${owner}):`

**why it matters:** when user fills same key for multiple owners, they need to know which owner they're prompted for. without owner in prompt, user could enter wrong value for wrong owner.

**fix location:** blueprint line in promptHiddenInput call.

---

## conclusion

the blueprint adheres correctly to vision and criteria with one exception:

**one issue found:** prompt message did not include owner context.

**fix applied:** prompt now includes `(owner=${owner})` suffix.

all other aspects verified:
- (input, context) signature pattern ✓
- loop-and-aggregate pattern ✓
- error type choice (BadRequestError vs UnexpectedCodePathError) ✓
- prikey discovery + extension ✓
- skip-if-set behavior ✓
- vault fallback chain ✓
- roundtrip verification sequence ✓

the blueprint now adheres fully after the prompt fix.
