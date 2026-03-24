# review.self: behavior-declaration-adherance (r6)

## verdict: pass

found 3 deviations from vision, fixed all. implementation now adheres to all declarations.

---

## issue 1: owner label format

### found

**vision shows (timeline):**
```
   ├─ for owner default
   └─ for owner ehmpath
```

**implementation before (line 108):**
```ts
const ownerLabel = owner ? `owner ${owner}` : 'you';
console.log(`   ${ownerPrefix} for ${ownerLabel}`);
```

**behavior:**
- when ownerInput = 'default', owner = null (line 104)
- ownerLabel = 'you' (ternary false branch)
- output: "for you"

**deviation:** vision says "for owner default", implementation said "for you"

### fixed

```ts
const ownerLabel = owner ?? 'default';
console.log(`   ${ownerPrefix} for owner ${ownerLabel}`);
```

**behavior after fix:**
- when ownerInput = 'default', owner = null, ownerLabel = 'default'
- output: "for owner default"

**why it holds:** the vision timeline shows explicit "for owner default" format. the "you" text was a UX interpretation not specified in the vision.

---

## issue 2: --owner flag omit for default

### found

**vision shows:**
```
├─ ✓ rhx keyrack unlock --key CLOUDFLARE_API_TOKEN --env test --owner default --prikey ~/.ssh/id_ed25519
└─ ✓ rhx keyrack get --key CLOUDFLARE_API_TOKEN --env test --owner default
```

**implementation before (line 196):**
```ts
const ownerFlag = owner ? ` --owner ${owner}` : '';
```

**behavior:**
- when owner = null (default), ownerFlag = ''
- output omits --owner flag entirely

**deviation:** vision shows "--owner default", implementation omitted it

### fixed

```ts
const ownerFlag = ` --owner ${ownerLabel}`;
```

**behavior after fix:**
- ownerFlag = ` --owner default` for default owner
- output includes "--owner default"

**why it holds:** the vision timeline explicitly shows "--owner default" in the command output. the omission was an assumption that default could be implicit.

---

## issue 3: --prikey flag absent from unlock output

### found

**vision shows:**
```
├─ ✓ rhx keyrack unlock --key CLOUDFLARE_API_TOKEN --env test --owner default --prikey ~/.ssh/id_ed25519
```

**implementation before (line 198):**
```ts
console.log(
  `   ${branchContinue}   ├─ ✓ rhx keyrack unlock --key ${keyName} --env ${input.env}${ownerFlag}`,
);
```

**behavior:** output has no --prikey flag

**deviation:** vision shows "--prikey ~/.ssh/id_ed25519", implementation omitted it

### fixed

```ts
const prikeyFlag = prikeyFound ? ` --prikey ${prikeyFound}` : '';
console.log(
  `   ${branchContinue}   ├─ ✓ rhx keyrack unlock --key ${keyName} --env ${input.env}${ownerFlag}${prikeyFlag}`,
);
```

**behavior after fix:**
- when prikeyFound has a value, output includes "--prikey $path"
- when prikeyFound is null (DAO discovery), output omits --prikey (correct — no explicit prikey was used)

**why it holds:** the vision shows prikey in the output to document which prikey was used. when DAO discovery finds the prikey automatically, no explicit --prikey was needed.

---

## verification

ran integration tests after fixes:

```
PASS src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts
  fillKeyrackKeys.integration
    ✓ [case1] fresh fill single owner
    ✓ [case2] partial fill
    ✓ [case3] refresh bypasses skip
    ✓ [case4] multiple owners
    ✓ [case5] no prikey fails
    ✓ [case6] key not found
    ✓ [case7] no manifest
    ✓ [case8] roundtrip fails
    ✓ [case9] specific key only
    ✓ [case10] no keys for env

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

all tests pass.

---

## no-issue analysis

### roundtrip sequence

**vision states:** set → unlock → get

**implementation (lines 164-217):**
1. setKeyrackKey (164-174)
2. unlockKeyrackKeys (189-195)
3. getKeyrackKeyGrant (206-209)

**why it holds:** exact sequence as declared. no deviation.

### inner loop structure

**vision states:** "inner loop is owners"

**implementation (lines 92-101):**
```ts
for (let i = 0; i < slugs.length; i++) {      // outer: keys
  for (let ownerIdx = 0; ownerIdx < input.owners.length; ownerIdx++) {  // inner: owners
```

**why it holds:** keys outer, owners inner. matches vision exactly.

### skip already set

**criteria states:** 'skips already-set keys with "already set, skip"'

**implementation (lines 145-148):**
```ts
if (keyHost && !input.refresh) {
  console.log(`   ${branchContinue}└─ ✓ already set, skip`);
```

**why it holds:** exact message format. matches criteria.

### fail-fast key not found

**criteria states:** 'fail-fast with "key X not found in manifest for env=Y"'

**implementation (lines 72-75):**
```ts
throw new BadRequestError(
  `key ${input.key} not found in manifest for env=${input.env}`,
);
```

**why it holds:** exact error message format. matches criteria.

### vault fallback

**criteria states:** 'falls back to os.secure when not inferrable'

**implementation (lines 153-154):**
```ts
const vaultInferred = inferKeyrackVaultFromKey({ keyName });
const vault = vaultInferred ?? 'os.secure';
```

**why it holds:** explicit nullish coalesce to 'os.secure'. matches criteria.

---

## summary

| issue | status | action |
|-------|--------|--------|
| owner label "you" vs "owner default" | fixed | changed ternary to ?? with explicit label |
| --owner flag omit for default | fixed | always include --owner with ownerLabel |
| --prikey flag absent | fixed | added prikeyFlag when prikeyFound has value |

all fixes verified via 10 integration tests. implementation now adheres to vision timeline format.
