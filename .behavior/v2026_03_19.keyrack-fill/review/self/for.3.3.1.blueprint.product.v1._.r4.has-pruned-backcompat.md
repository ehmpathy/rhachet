# self-review r4: has-pruned-backcompat (deeper analysis)

## pause. re-read. look harder.

r3 concluded "no backwards-compat concerns found" by scan of obvious patterns. but did we look hard enough? let me re-read the blueprint line by line with a specific question: "is this here for backwards compat?"

---

## re-read: filediff tree

```
src/
├── contract/cli/invokeKeyrack.ts     [~] update: add fill subcommand
├── domain.operations/keyrack/
│   ├── fillKeyrackKeys.ts            [+] create: orchestrator
│   └── fillKeyrackKeys.play.integration.test.ts [+] create: journey tests
└── .test/assets/genMockKeyrackRepoManifest.ts   [+] create: test fixture
```

**analysis:** all files are new or additive. no modifications to extant primitives. no backwards-compat needed for new code.

**verdict:** no backwards-compat concern.

---

## re-read: CLI contract

```ts
keyrack
  .command('fill')
  .description('fill keyrack keys from repo manifest')
  .requiredOption('--env <env>', 'environment to fill (test, prod, all)')
  .option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])
  .option('--prikey <path...>', 'prikey(s) to consider for manifest decryption')
  .option('--key <key>', 'specific key to fill (default: all)')
  .option('--refresh', 'refresh even if already set')
```

**question:** are any of these flags for backwards-compat with adhoc fill commands?

**analysis:**
- `--env` — new, required
- `--owner` — new, default to 'default' (vision requirement)
- `--prikey` — new, extends discovered prikeys (wish requirement)
- `--key` — new, filter to specific key (vision requirement)
- `--refresh` — new, re-prompt even if set (vision requirement)

all flags trace to wish/vision. none exist to maintain compat with prior behavior.

**verdict:** no backwards-compat concern.

---

## re-read: orchestrator primitives

```
fillKeyrackKeys (orchestrator)
├── [←] daoKeyrackRepoManifest.get()              REUSE
├── [←] getAllKeyrackSlugsForEnv()                REUSE
├── [←] daoKeyrackHostManifest.get()              REUSE
├── [←] inferKeyrackVaultFromKey()                REUSE
├── [←] promptHiddenInput()                       REUSE
├── [←] setKeyrackKey()                           REUSE
├── [←] unlockKeyrackKeys()                       REUSE
└── [←] getKeyrackKeyGrant()                      REUSE
```

**question:** are we use primitives in a way that preserves old behavior?

**analysis:** all primitives are reused as-is. we don't wrap them or add shims. we call them with their extant interfaces.

**potential concern:** setKeyrackKey signature — does our usage match extant?

checked in r2: setKeyrackKey signature is:
```ts
export const setKeyrackKey = async (
  input: {
    key: string;
    env: string;
    org: string;
    vault: KeyrackVault;
    mech: KeyrackMech;
    secret: string;
  },
  context: KeyrackHostContext,
)
```

blueprint uses:
```ts
await setKeyrackKey({
  key: keyName,
  env: input.env,
  org: repoManifest.org,
  vault,
  mech,
  secret,
}, hostContext);
```

**verdict:** no backwards-compat concern. we use primitives correctly.

---

## re-read: fallback behavior

```ts
const vault = keySpec?.vault ?? vaultInferred ?? 'os.secure';
const mech = keySpec?.mech ?? mechInferred ?? 'PERMANENT_VIA_REPLICA';
```

**question:** is os.secure fallback for backwards-compat?

**analysis:** no. os.secure is the default vault type. this is not "maintain compat with old fill commands" — this is "provide sensible default when not specified."

the wish says: "fallback to replica os.secure when not prescribed and not inferrable"

**verdict:** explicitly requested, not backwards-compat.

---

## re-read: skip when already set

```ts
if (keyHost && !input.refresh) {
  console.log(`      ✓ already set, skip`);
  results.push({ slug, owner, status: 'skipped' });
  continue;
}
```

**question:** is this idempotency for backwards-compat?

**analysis:** no. this is idempotency for user experience. the vision says: "skips already-configured keys (unless --refresh)".

idempotency is not backwards-compat. it's "don't make user re-enter values they already set."

**verdict:** user experience, not backwards-compat.

---

## re-read: exit codes

```ts
// blueprint implies
process.exit(summary.failed > 0 ? 1 : 0);
```

**question:** are exit codes for backwards-compat with scripts?

**analysis:** this is a new command. there are no scripts that depend on its exit codes yet.

exit codes are standard convention (0 = success, 1 = failure), not backwards-compat.

**verdict:** standard convention, not backwards-compat.

---

## deeper question: manifest format

**question:** does keyrack fill assume a specific manifest format? is that format locked for backwards-compat?

**analysis:** keyrack fill reuses `daoKeyrackRepoManifest.get()` and `getAllKeyrackSlugsForEnv()`. these are extant primitives that handle the manifest format.

if the manifest format changes, these primitives would change, not fillKeyrackKeys.

**verdict:** not a fillKeyrackKeys concern. manifest format is owned by extant primitives.

---

## conclusion

r4 re-read each blueprint section with specific focus on backwards-compat. found:

| pattern | is backwards-compat? | evidence |
|---------|---------------------|----------|
| new command | no | additive, no prior behavior |
| CLI flags | no | all trace to wish/vision |
| primitive reuse | no | use extant interfaces correctly |
| vault fallback | no | explicitly requested in wish |
| mech fallback | no | required by logic |
| skip when set | no | user experience, not compat |
| exit codes | no | standard convention |
| manifest format | no | owned by extant primitives |

**no backwards-compat concerns found.** the blueprint is a new feature that reuses extant primitives without modification.

