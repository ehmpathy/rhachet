# self-review r3: has-questioned-assumptions (architecture depth)

## pause. breathe. look again.

the r2 review found signature mismatches and fixed them. but did we question the architecture itself? did we ask "could a simpler approach work?"

let me read the blueprint line by line with fresh eyes.

---

## assumption: we need fillKeyrackKeys at all

**the blueprint proposes:** a new `fillKeyrackKeys` orchestrator that wraps extant primitives.

**what if the opposite were true?** what if we could compose extant commands directly from shell?

**checked:** the vision explicitly rejected shell orchestration:

> "to parse YAML manifest in shell is fragile"
> "error handle is harder"
> "test fixtures are harder"

**could a simpler approach work?** we could expose each step as a CLI command and let users compose:

```bash
for key in $(rhx keyrack manifest list-keys --env test); do
  rhx keyrack set --key $key --env test --owner default
  rhx keyrack unlock --key $key --env test --owner default
  rhx keyrack get --key $key --env test --owner default
done
```

but this pushes complexity to users. the vision's goal is "one command fills all."

**verdict: holds.** orchestration in TypeScript is simpler than shell composition for users.

---

## assumption: inner loop on owners is correct

**the blueprint proposes:** for each key, for each owner.

**what if the opposite were true?** for each owner, for each key.

**checked:** the vision explicitly addresses this:

> "user enters CLOUDFLARE_API_TOKEN value, then enters it again for second owner. they can paste from clipboard twice in a row. then move to next key."

**could a simpler approach work?** if we inverted the loops, we could reuse context per owner more efficiently. but the UX would degrade - users would need to recall each key's value when prompted for the second owner.

**verdict: holds.** inner loop on owners is an explicit UX decision, not an accident.

---

## assumption: we need prikey iteration at orchestrator level

**r2 found:** genKeyrackHostContext takes single prikey, not array.

**the fix proposed:** iterate through prikeys in orchestrator.

**what if the opposite were true?** what if we modified genKeyrackHostContext to accept prikeys array?

**checked:** genKeyrackHostContext is used elsewhere. would we break callers?

**considered:** yes, other callers pass single prikey. we'd need to update them all or make the parameter optional.

**could a simpler approach work?** no. the orchestrator iteration is localized to fillKeyrackKeys. we don't need to modify a shared primitive.

**verdict: holds.** iterate in orchestrator is simpler than modify a shared primitive.

---

## assumption: null prikey triggers discovery

**the blueprint proposes:**

```ts
const prikeysToTry = input.prikeys.length > 0 ? input.prikeys : [null];
```

**what if the opposite were true?** what if we should always try discovery first, then supplied prikeys?

**checked:** the wish says `--prikey` "extends the set of prikeys we should consider (ontop of the discovered ones)."

**found issue:** this is backwards! the wish wants discovery + supplied, not one or the other.

**fix needed:** the iteration should be:

```ts
// discover available prikeys
const discoveredPrikeys = await getAllAvailableIdentities();
// extend with supplied prikeys
const prikeysToTry = [...discoveredPrikeys, ...input.prikeys];
// dedupe
const uniquePrikeys = [...new Set(prikeysToTry)];
```

**verdict: needs fix.** update blueprint to discover + extend, not one-or-other.

---

## assumption: hostContext can be reused for set and check

**the blueprint proposes:** create hostContext once, use for both "check if set" and "set key."

**checked:** hostContext contains the host manifest and prikey. both operations need the same context.

**verdict: holds.** single context creation is correct.

---

## assumption: repoManifest.keys[slug] accesses key spec

**checked:** looked at KeyrackRepoManifest type. yes, keys is Record<string, KeyrackKeySpec>.

**verdict: holds.**

---

## assumption: inferKeyrackVaultFromKey exists

**checked:** searched codebase.

```bash
grep -r "inferKeyrackVaultFromKey" src/
```

**found:** could not find this function.

**what actually exists?** need to check what vault inference is available.

**discovery:** this may need to be created or the assumption is wrong.

**action:** research vault inference pattern.

---

## assumption: inferMechFromVault exists

**checked:** searched codebase.

**discovery:** same as above - need to verify.

**action:** research mech inference pattern.

---

## research: vault and mech inference

### inferKeyrackVaultFromKey

**checked:** exists at `src/domain.operations/keyrack/inferKeyrackVaultFromKey.ts`

```ts
export const inferKeyrackVaultFromKey = (input: {
  keyName: string;  // note: uses keyName, not key
}): KeyrackHostVault | null => {
  if (input.keyName === 'AWS_PROFILE') return 'aws.iam.sso';
  return null;
};
```

**verdict: exists.** but uses `keyName` not `key` — blueprint needs minor update.

### inferMechFromVault

**checked:** exists at `src/infra/inferMechFromVault.ts`

```ts
export const inferMechFromVault = (input: {
  vault: KeyrackHostVault;
}): KeyrackGrantMechanism | null => {
  // os.secure, os.direct, os.envvar, 1password → PERMANENT_VIA_REPLICA
  // aws.iam.sso → EPHEMERAL_VIA_AWS_SSO
  // os.daemon → null (requires explicit --mech)
};
```

**verdict: exists.** returns null if vault has multiple valid mechanisms.

### getAllAvailableIdentities

**checked:** exists as private function inside `src/access/daos/daoKeyrackHostManifest/index.ts`

```ts
const getAllAvailableIdentities = (): string[] => {
  // 1. checks ssh-agent first
  // 2. then checks standard paths: ~/.ssh/id_ed25519, ~/.ssh/id_rsa, ~/.ssh/id_ecdsa
  // returns array of age identities
};
```

**verdict: exists but is private.** not directly callable from orchestrator.

### how daoKeyrackHostManifest.get() uses prikey

```ts
get: async (input: {
  owner: string | null;
  prikey: string | null;  // if provided, uses directly; if null, does discovery
}): Promise<KeyrackHostManifest | null>
```

- if `prikey` is provided → converts to age identity, uses that only
- if `prikey` is null → calls `getAllAvailableIdentities()` internally and tries each

**key insight:** passing `null` triggers full discovery inside the DAO. the orchestrator doesn't need to call getAllAvailableIdentities directly — just pass null to let the DAO discover.

---

## summary of r3 discoveries

### critical fix needed

**prikey iteration is backwards.** the wish says to extend discovered prikeys with supplied ones, but the blueprint has:

```ts
const prikeysToTry = input.prikeys.length > 0 ? input.prikeys : [null];
```

this means: if prikeys supplied, ONLY use those (no discovery). but the wish says --prikey should EXTEND the discovered set.

**correct logic:**

```ts
// always try discovery (null) first, then supplied prikeys
const prikeysToTry = [null, ...input.prikeys];
```

this way:
1. first try null → DAO does discovery (ssh-agent + standard paths)
2. if discovery fails, try each supplied prikey (for non-standard paths like ~/.ssh/ehmpath)

### assumptions verified

| assumption | status |
|------------|--------|
| inferKeyrackVaultFromKey exists | ✓ yes, uses `keyName` param |
| inferMechFromVault exists | ✓ yes, takes `{ vault }` |
| getAllAvailableIdentities exists | ✓ yes, private to DAO |
| daoKeyrackHostManifest handles discovery | ✓ yes, when prikey=null |

### architecture decisions that hold

1. **TypeScript orchestrator vs shell** - holds per vision reason
2. **inner loop on owners** - holds per explicit UX decision
3. **iterate prikeys in orchestrator** - correct pattern (DAO needs single prikey)
4. **single hostContext creation** - correct pattern

### blueprint fixes applied

| issue | fix | status |
|-------|-----|--------|
| prikey iteration logic | change to `[null, ...input.prikeys]` | ✓ applied |
| inferKeyrackVaultFromKey param | use `keyName` not `key` | ✓ applied |
| vault fallback when inference fails | add fallback to 'os.secure' | ✓ applied |
| mech fallback when inference fails | handle null from inferMechFromVault | ✓ applied |

---

## conclusion

all assumptions verified. all fixes applied to blueprint. architecture holds.

