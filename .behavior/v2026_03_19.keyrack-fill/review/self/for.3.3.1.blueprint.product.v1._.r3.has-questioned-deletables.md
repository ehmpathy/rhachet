# self-review r3: has-questioned-deletables (third pass)

## question the architecture itself

### examined: do we need the unlock step?

```ts
// 12. unlock key
await unlockKeyrackKeys({
  env: input.env,
  keys: [keyName],
}, await genContextKeyrackGrantUnlock({ owner, cwd: context.cwd, prikeys: input.prikeys }));
```

after `setKeyrackKey`, do we need to explicitly unlock before we can `getKeyrackKeyGrant`?

**checked keyrack flow:**
- `set` stores the encrypted key in host manifest
- `unlock` decrypts the key into the grant store
- `get` reads from the grant store

without unlock: get would fail because the key isn't in the grant store yet.

**verdict: holds.** the set → unlock → get sequence is required for roundtrip verification.

### examined: do we need the get step for verification?

```ts
// 13. verify roundtrip
const grant = await getKeyrackKeyGrant({
  key: keyName,
  env: input.env,
}, await genContextKeyrackGrantGet({ owner, cwd: context.cwd }));
```

could we just trust that set + unlock succeeded?

**considered:** if set and unlock both return without error, isn't that enough?

**counterpoint:** roundtrip verification catches edge cases:
- encryption succeeded but decryption fails (key mismatch)
- grant store corruption
- filesystem race conditions

**verdict: holds.** roundtrip verification is the only way to prove the key is usable.

### examined: could fillKeyrackKeys be a shell skill instead?

the blueprint proposes a TypeScript orchestrator. could this be a shell skill?

**advantages of shell:**
- composes extant CLI commands directly
- no new TypeScript code

**disadvantages of shell:**
- to parse YAML manifest in shell is fragile
- error handling is harder
- test fixtures are harder

**verdict: holds.** TypeScript gives us type safety, proper manifest parse via extant DAOs, and testable code.

### examined: the org parameter from repoManifest

```ts
await setKeyrackKey({
  key: keyName,
  env: input.env,
  org: repoManifest.org,  // <-- this
  vault,
  mech,
  secret,
}, hostContext);
```

do we need org? could setKeyrackKey infer it?

**checked setKeyrackKey contract:** it requires org to construct the key slug (e.g., `ehmpathy.test.CLOUDFLARE_API_TOKEN`).

**could setKeyrackKey infer org from cwd?** it would need to load the repo manifest internally, which it doesn't do.

**verdict: holds.** org is required by setKeyrackKey contract. we have it from repoManifest.

### examined: the mech inference

```ts
const mech = keySpec?.mech ?? inferMechFromVault({ vault });
```

could we always use the vault's default mech and remove inference?

**checked:** different vaults have different valid mechanisms:
- os.secure: PERMANENT_VIA_REPLICA or EPHEMERAL_VIA_SESSION
- aws.iam.sso: EPHEMERAL_VIA_AWS_SSO

the inference picks the sensible default for each vault.

**verdict: holds.** mech inference provides correct defaults per vault type.

### examined: the entire filediff structure

```
src/
├── contract/cli/invokeKeyrack.ts                       [~]
├── domain.operations/keyrack/fillKeyrackKeys.ts        [+]
├── domain.operations/keyrack/fillKeyrackKeys.play...   [+]
└── .test/assets/genMockKeyrackRepoManifest.ts          [+]
```

can any file be removed?

1. **invokeKeyrack.ts update** — required for CLI contract
2. **fillKeyrackKeys.ts** — the orchestrator, required
3. **fillKeyrackKeys.play...** — tests, required for verification
4. **genMockKeyrackRepoManifest.ts** — test fixture, enables tests

**alternative considered:** inline test manifest creation instead of fixture generator.

**verdict: keep fixture.** multiple test cases need manifests with different states. a generator avoids duplication.

### examined: the --prikey flag structure

```
.option('--prikey <path...>', 'prikey(s) to consider for manifest decryption')
```

could this be inferred from discovered prikeys only?

**scenario:** user has multiple owners, each with different prikeys. some are in ssh-agent, some are not.

**without --prikey flag:** user has no way to specify prikeys not in ssh-agent.

**verdict: holds.** --prikey extends the discovery pool for flexibility.

### examined: the default value of --owner

```
.option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])
```

could we default to no owners and require explicit specification?

**verdict: holds.** to default to `default` is pit of success. single-owner is the common case. to require explicit --owner every time adds friction.

---

## summary of r3

questioned:
1. unlock step — holds (required for grant store)
2. get step — holds (roundtrip verification is essential)
3. shell vs TypeScript — TypeScript holds (type safety, testability)
4. org parameter — holds (required by setKeyrackKey)
5. mech inference — holds (correct defaults per vault)
6. filediff structure — holds (each file serves a purpose)
7. --prikey flag — holds (extends discovery pool)
8. --owner default — holds (pit of success)

no additional deletables found.

---

## all fixes applied across r1-r3

1. ✅ renamed fixture: genMockKeyrackKeySpec → genMockKeyrackRepoManifest
2. ✅ removed summary.total (redundant)
3. ✅ simplified output: inline status vs nested treebucket
4. ✅ simplified progress line: removed index/total counter
5. ✅ simplified owner loop: removed last-item detection for prefix

the blueprint is minimal. every component either serves a required function or was already removed.

