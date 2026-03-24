# review.self: has-consistent-mechanisms (r3)

## verdict: pass

fillKeyrackKeys introduces no new mechanisms. it is pure orchestration over extant keyrack primitives. the patterns used (iteration, host context generation, tree output, error handle) match extant operations precisely.

## detailed analysis

### 1. imports reveal reuse

every import in fillKeyrackKeys.ts serves a specific purpose and reuses extant mechanisms:

| import | purpose | why this mechanism |
|--------|---------|-------------------|
| `BadRequestError` | user-targeted errors | canonical error for invalid input; consistent with all keyrack commands |
| `daoKeyrackRepoManifest` | manifest access | sole entry point for repo manifest; no direct file reads |
| `inferMechFromVault` | mechanism derivation | centralized vault→mech map; avoids scattered switch statements |
| `asKeyrackKeyName` | slug→keyname extraction | consistent parse; avoids duplicated split logic |
| `genContextKeyrackGrantGet` | get context | factory for get operations; bundles adapters + manifest |
| `genContextKeyrackGrantUnlock` | unlock context | factory for unlock operations; bundles adapters + identity |
| `genKeyrackHostContext` | host context | canonical context generator; handles prikey discovery, manifest load, vault initialization |
| `getAllKeyrackSlugsForEnv` | key enumeration | manifest→slugs transform; consistent with unlockKeyrackKeys |
| `getKeyrackKeyGrant` | roundtrip verify | canonical get operation; checks envvar then daemon |
| `inferKeyrackVaultFromKey` | vault derivation | key→vault inference; centralizes AWS_PROFILE→aws.iam.sso logic |
| `unlockKeyrackKeys` | unlock operation | canonical unlock; daemon write + vault auth |
| `setKeyrackKey` | set operation | canonical set; vault write + manifest update |

**why this matters:** fillKeyrackKeys could have implemented any of these inline. the choice to import means:
- no divergent behavior (same logic path as CLI commands)
- fixes to base operations propagate automatically
- test coverage of base operations applies

### 2. iteration pattern matches extant operations

fillKeyrackKeys iterates `for each key × for each owner`. compare with extant:

**fillKeyrackKeys.ts (lines 92-223):**
```ts
for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i]!;
  // ...
  for (let ownerIdx = 0; ownerIdx < input.owners.length; ownerIdx++) {
    const ownerInput = input.owners[ownerIdx]!;
    // ...
  }
}
```

**unlockKeyrackKeys.ts (line 122):**
```ts
for (const slug of slugsForEnv) {
  const hostConfig = context.hostManifest.hosts[slug];
  // ...
}
```

**setKeyrackKey.ts (line 42):**
```ts
for (const slug of targetSlugs) {
  const keyHost = await setKeyrackKeyHost({ ... }, context);
  results.push(keyHost);
}
```

**getKeyrackKeyGrant.ts (line 219):**
```ts
for (const slug of slugs) {
  // attempt grant for each slug
}
```

**pattern consistency:**
- all use `for...of` or indexed `for` (indexed when index needed for progress display)
- all iterate over slug arrays derived from manifest
- all accumulate results into array for return

fillKeyrackKeys uses indexed loop because it needs `i` for progress output (`key 1/3`). this matches CLI patterns where progress matters.

### 3. host context generation matches extant pattern

fillKeyrackKeys tries supplied prikeys first, then falls back to DAO discovery:

**fillKeyrackKeys.ts (lines 118-141):**
```ts
// try each supplied prikey
for (const prikey of input.prikeys) {
  try {
    hostContext = await genKeyrackHostContext({ owner: owner, prikey });
    prikeyFound = prikey;
    break;
  } catch {
    // this prikey didn't work, try next
  }
}

// if no supplied prikey worked, try DAO discovery
if (!hostContext) {
  hostContext = await genKeyrackHostContext({ owner: owner, prikey: null });
}
```

**why this pattern?**

`genKeyrackHostContext({ prikey: null })` triggers built-in discovery via `daoKeyrackHostManifest.get()`:
- checks ssh-agent for loaded keys
- scans `~/.ssh/id_*` for key files
- converts to age identity for manifest decryption

this is the same discovery unlockKeyrackKeys uses (via ContextKeyrackGrantUnlock).

**alternatives considered:**
1. create `getOnePrikeyForOwner.ts` wrapper — rejected in roadmap phase 1 because DAO already has discovery
2. require explicit --prikey for each owner — rejected because it degrades ux for single-owner case
3. try DAO discovery first — rejected because supplied prikeys should take precedence

the chosen pattern:
- respects user intent (supplied prikeys tried first)
- falls back to discovery (works without --prikey when discoverable)
- propagates source errors (no error suppression; diagnostic info preserved)

### 4. tree output matches extant CLI commands

fillKeyrackKeys uses inline console.log with tree characters. compare with extant:

**fillKeyrackKeys.ts (lines 106-109):**
```ts
const ownerPrefix = isLastOwner ? '└─' : '├─';
const branchContinue = isLastOwner ? '   ' : '│  ';
console.log(`   ${ownerPrefix} for ${ownerLabel}`);
```

**invokeKeyrack.ts (lines 135-154):**
```ts
console.log(`   ├─ host manifest: ${hostStatus}`);
// ...
console.log(`   │   ├─ owner: ${result.host.owner ?? 'default'}`);
console.log(`   │   └─ recipient: ${result.host.recipient.label}`);
// ...
console.log(`   └─ repo manifest: ${repoStatus}`);
console.log(`       ├─ path: ${repoPathRelative}`);
console.log(`       └─ org: ${result.repo.org}`);
```

**invokeInit.ts (lines 90-105):**
```ts
console.log(`   ├─ org: ${result.org}`);
// ...
console.log(`   └─ ${effectMessage}`);
```

**pattern consistency:**
- all use `├─` for non-terminal items
- all use `└─` for terminal items
- all use `│  ` for continuation lines
- all indent with 3 spaces per level

**why not a shared utility?**

searched codebase for output utilities:
- `emitLine` — not found
- `printTree` — not found
- `outputTree` — not found

no shared tree output utility exists. the extant pattern is inline console.log with tree characters. fillKeyrackKeys follows this pattern to remain consistent.

### 5. error handle matches extant pattern

fillKeyrackKeys uses BadRequestError for user errors:

**fillKeyrackKeys.ts (line 73-75):**
```ts
throw new BadRequestError(
  `key ${input.key} not found in manifest for env=${input.env}`,
);
```

**unlockKeyrackKeys.ts (lines 56-59):**
```ts
throw new BadRequestError('sudo credentials require --key flag', {
  note: 'run: rhx keyrack unlock --env sudo --key X',
});
```

**unlockKeyrackKeys.ts (lines 85-88):**
```ts
throw new BadRequestError(`sudo key not found: ${keyInput}`, {
  note: 'run: rhx keyrack set --key X --env sudo --vault ... to configure',
});
```

**pattern consistency:**
- BadRequestError for invalid user input (wrong key name, absent manifest)
- error message describes the problem
- metadata/note provides actionable fix hint

fillKeyrackKeys also propagates errors from base operations without catch:
```ts
// propagate the source error - it has the real diagnostic info
throw error;
```

this matches the keyrack philosophy: fail-fast with full diagnostic context.

### 6. no new mechanisms introduced

| potential new mechanism | introduced? | why not |
|------------------------|-------------|---------|
| custom prikey discovery | no | reused genKeyrackHostContext with prikey: null |
| custom manifest load | no | reused daoKeyrackRepoManifest |
| custom vault inference | no | reused inferKeyrackVaultFromKey |
| custom set operation | no | reused setKeyrackKey |
| custom unlock operation | no | reused unlockKeyrackKeys |
| custom get operation | no | reused getKeyrackKeyGrant |
| custom output utilities | no | followed inline console.log pattern |
| custom error types | no | reused BadRequestError |

fillKeyrackKeys is 241 lines of pure orchestration. every piece of domain logic delegates to an extant operation.

## why this matters

### for maintainability

when a bug is found in setKeyrackKey, fillKeyrackKeys automatically benefits from the fix. if fillKeyrackKeys had implemented its own set logic, the bug would exist in two places.

### for consistency

users who learn `rhx keyrack set` see the same behavior in `rhx keyrack fill`. the output format, error messages, and interactive prompts are identical because they use the same base operations.

### for testability

fillKeyrackKeys integration tests mock the base operations (genKeyrackHostContext, setKeyrackKey, etc.). this works because fillKeyrackKeys composes operations rather than duplicates them. the tests verify orchestration logic, not duplicated domain logic.

## conclusion

fillKeyrackKeys introduces no new mechanisms. it orchestrates extant primitives via standard patterns:
- imports from extant operations
- iteration patterns match unlockKeyrackKeys/setKeyrackKey
- host context generation uses extant DAO discovery
- tree output follows invokeKeyrack inline pattern
- error handle uses canonical BadRequestError

the implementation follows the principle: orchestrate, don't duplicate.
