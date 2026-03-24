# self-review r4: has-consistent-mechanisms

## the question

do we duplicate extant mechanisms? should we reuse instead of create?

---

## search: extant keyrack operations

### domain.operations/keyrack/ inventory

from codebase search:

| operation | purpose |
|-----------|---------|
| setKeyrackKey | set a single key for a single owner |
| getKeyrackKeyGrant | get a single key for a single owner |
| unlockKeyrackKeys | unlock keys for a session |
| genKeyrackHostContext | generate host context for operations |
| genContextKeyrackGrantGet | generate get context |
| genContextKeyrackGrantUnlock | generate unlock context |
| getAllKeyrackSlugsForEnv | get all key slugs for an env |
| inferKeyrackVaultFromKey | infer vault from key name |
| daoKeyrackRepoManifest | access repo manifest |
| daoKeyrackHostManifest | access host manifest |
| promptHiddenInput | prompt for hidden input |

### extant CLI commands

from invokeKeyrack.ts:

| command | purpose |
|---------|---------|
| keyrack init | initialize keyrack with recipient |
| keyrack recipient set/get/del | manage recipients |
| keyrack set | set a single key |
| keyrack get | get a single key |
| keyrack unlock | unlock keys |
| keyrack status | show status |
| keyrack relock | relock keyrack |
| keyrack del | delete a key |

---

## analysis: does fillKeyrackKeys duplicate any of these?

### question: does it duplicate setKeyrackKey?

**no.** fillKeyrackKeys calls setKeyrackKey. it orchestrates multiple calls to it.

### question: does it duplicate unlockKeyrackKeys?

**no.** fillKeyrackKeys calls unlockKeyrackKeys. it orchestrates multiple calls to it.

### question: does it duplicate getKeyrackKeyGrant?

**no.** fillKeyrackKeys calls getKeyrackKeyGrant for roundtrip verification. it orchestrates multiple calls.

### question: does it duplicate getAllKeyrackSlugsForEnv?

**no.** fillKeyrackKeys calls getAllKeyrackSlugsForEnv to discover which keys to fill.

### question: does it duplicate promptHiddenInput?

**no.** fillKeyrackKeys calls promptHiddenInput to prompt for each key value.

### question: does it duplicate inferKeyrackVaultFromKey?

**no.** fillKeyrackKeys calls inferKeyrackVaultFromKey to infer vault when not prescribed.

---

## analysis: is there an extant batch/orchestration pattern?

searched for:
- `for.*owner|for.*key|forEach.*owner|forEach.*key`
- `fillKeyrack|for each key|for each owner`

**found:** no extant orchestration that:
1. loops keys × owners
2. calls set → unlock → get sequence
3. reads from repo manifest

**conclusion:** fillKeyrackKeys is a new orchestration layer over extant primitives. it does not duplicate any extant mechanism.

---

## analysis: should we extract any utilities?

### question: should prikey iteration be a utility?

the blueprint has:
```ts
const prikeysToTry = [null, ...input.prikeys];
for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({ owner, prikey });
    prikeyFound = prikey;
    break;
  } catch {
    continue;
  }
}
```

**could we extract?** yes, to `findWorkingPrikeyForOwner({ owner, prikeys })`.

**should we?** no. this pattern is specific to fillKeyrackKeys. no other operation needs to try multiple prikeys to find one that works. extant operations take a single prikey or null.

**verdict:** keep inline. not a reusable pattern yet.

### question: should result aggregation be a utility?

```ts
const summary = {
  set: results.filter(r => r.status === 'set').length,
  skipped: results.filter(r => r.status === 'skipped').length,
  failed: results.filter(r => r.status === 'failed').length,
};
```

**should we extract?** no. this is trivial aggregation specific to FillKeyResult. no reuse opportunity.

---

## conclusion

fillKeyrackKeys:
- **reuses** all extant primitives (setKeyrackKey, unlockKeyrackKeys, getKeyrackKeyGrant, etc.)
- **creates** one new orchestration layer over them
- **duplicates none** — it composes, not copies

| new mechanism | duplicates extant? | verdict |
|---------------|-------------------|---------|
| fillKeyrackKeys orchestrator | no | new orchestration layer |
| prikey iteration loop | no | specific to fill use case |
| result aggregation | no | trivial, inline is fine |

**no duplication found.** the blueprint is consistent with extant mechanisms.

