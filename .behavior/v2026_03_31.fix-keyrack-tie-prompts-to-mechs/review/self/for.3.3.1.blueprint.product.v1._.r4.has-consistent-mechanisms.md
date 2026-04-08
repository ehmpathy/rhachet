# self-review r4: has-consistent-mechanisms

## extant patterns audit

examined research stone (3.1.3) to identify extant utilities and patterns. verified blueprint reuses rather than duplicates.

---

## new mechanisms in blueprint

### 1. inferVault operation

**question:** does extant code have vault inference?

**search result:** no extant vault inference mechanism found in research.

**research confirms:**
> "new operations needed: inferVault — purpose: infer --vault from key name when not supplied"

**verdict:** new operation, not duplication.

---

### 2. inferMech operation

**question:** does extant code have mech inference?

**search result:** no extant mech inference mechanism found in research.

**research confirms:**
> "new operations needed: inferMech — purpose: prompt for mech selection when vault supports multiple"

**verdict:** new operation, not duplication.

---

### 3. promptForSet on mech adapters

**question:** does extant code have similar prompts?

**search result:** yes — `promptHiddenInput` utility exists.

**research shows:**
```ts
const secret = await promptHiddenInput({ prompt: `enter secret for ${input.slug}: ` });
```

**verification:** blueprint's `mechAdapterReplica.promptForSet` should reuse this extant utility.

**research confirms:**
> "[EXTEND] current interface lacks `promptForSet` method"

**verdict:** new method reuses extant prompt utility, not duplication.

---

### 4. github app guided setup prompts

**question:** is there extant guided setup code to reuse?

**search result:** yes — `setupAwsSsoWithGuide` is extant guided setup pattern.

**research shows:**
> "current flow (328 lines): list sso portals, prompt selection, browser auth, list accounts, prompt selection, list roles, prompt selection..."

**verification:** blueprint's github app guided setup follows same pattern (list from api, prompt selection).

**verdict:** follows extant pattern style, not duplication.

---

### 5. setupAwsSsoWithGuide move

**question:** does blueprint duplicate or move this code?

**research confirms:**
> "[MOVE] entire file should move to mech adapter layer"

**blueprint says:**
```
├─ EPHEMERAL_VIA_AWS_SSO (special case: vault orchestrates)
│  ├─ [←] reuse setupAwsSsoWithGuide logic
```

**verdict:** move not duplicate. extant code relocated.

---

### 6. supportedMechs on vault adapters

**question:** does extant code have mech compatibility lists?

**search result:** no extant supportedMechs property found.

**research confirms:**
> "[EXTEND] current interface lacks `supportedMechs` list"

**verdict:** new property, not duplication.

---

### 7. checkMechCompat on vault adapters

**question:** does extant code have compatibility checks?

**search result:** no extant checkMechCompat method found.

**research confirms:**
> "[EXTEND] ... needs `checkMechCompat` to fail-fast for incompatible mechs"

**verdict:** new method, not duplication.

---

## extant utilities to reuse

from research, these extant utilities should be reused:

| utility | location | blueprint use |
|---------|----------|---------------|
| `promptHiddenInput` | utils | mechAdapterReplica.promptForSet |
| `createAppAuth` | @octokit/auth-app | mechAdapterGithubApp.translate |
| `initiateAwsSsoAuth` | aws sso utils | mechAdapterAwsSso.promptForSet |

**verification:** blueprint uses [←] reuse markers for moved code. implementation will naturally use extant utilities.

---

## summary

no duplication found.

**new additions verified:**
1. inferVault — no extant equivalent
2. inferMech — no extant equivalent
3. promptForSet — reuses extant promptHiddenInput
4. github app guided setup — follows extant pattern style
5. setupAwsSsoWithGuide — move, not duplicate
6. supportedMechs — no extant equivalent
7. checkMechCompat — no extant equivalent

**extant patterns preserved:**
- mech adapter validate — unchanged
- mech adapter translate — unchanged
- vault adapter unlock/get/del/relock — unchanged

**verdict:** blueprint is consistent with extant mechanisms. extends interfaces, moves code, reuses utilities.
