# self-review r2: has-questioned-assumptions (deeper)

## fresh examination with fresh eyes

### 1. promptForSet input shape

**assumption:** promptForSet receives `{ key, org, env }`

**question:** is this sufficient? what about vault-specific context?

**evidence from codepath:**
```
├─ [+] mech adapter promptForSet
│  ├─ EPHEMERAL_VIA_GITHUB_APP
│  │  ├─ gh api /user/orgs → list
```

**issue found:** the flow doesn't show where `org` comes from. let me trace:
- user runs `keyrack set --key GITHUB_TOKEN --vault os.secure`
- setKeyrackKey has `input.org` from either:
  1. explicit `--org` flag
  2. inferred from repo manifest
  3. or env?

**what does org mean here?**
- for keyrack slug: `org.env.key` — the org owns the key
- for github api: the github org with app installations

**these are different!** keyrack org (who owns the key) vs github org (where app is installed)

**fix needed:** promptForSet for github app should NOT use keyrack org as github org. it should prompt/discover github orgs independently.

**corrected flow:**
```
├─ [+] mech adapter promptForSet
│  ├─ EPHEMERAL_VIA_GITHUB_APP
│  │  ├─ gh api /user/orgs → list github orgs user has access to
│  │  ├─ prompt github org selection (NOT keyrack org)
│  │  ├─ ...
```

**impact:** promptForSet input needs `{ key, keyrackOrg, env }` — mech decides what orgs to prompt for (keyrack org irrelevant for github api)

---

### 2. checkMechCompat order

**assumption:** checkMechCompat runs after vault lookup, before mech inference

**question:** what if mech is inferred and incompatible?

**trace:**
```
├─ [+] inferMech (if --mech absent)
│  ├─ single mech → auto-select
│  └─ multiple mechs → prompt via stdin
│
├─ [+] checkMechCompat  <-- WHERE IS THIS?
```

**issue found:** blueprint shows checkMechCompat before inferMech in the tree, but this is wrong.

**corrected order:**
1. inferVault
2. vault lookup
3. inferMech (uses vault.supportedMechs to show only valid options)
4. checkMechCompat (validates explicit --mech, or validates inferred mech)

**impact:** inferMech should filter to only compatible mechs. checkMechCompat becomes redundant for inferred case, but still needed for explicit --mech.

**simpler approach:** inferMech already has vault.supportedMechs. checkMechCompat only needed when --mech is explicit. combine into single validation.

---

### 3. promptForSet context parameter

**assumption:** promptForSet needs no context (no log, no adapters)

**question:** what about prompts that need stdin adapter?

**evidence from research:**
```ts
const secret = await promptHiddenInput({ prompt: `enter secret for ${input.slug}: ` });
```

**answer:** promptHiddenInput is a utility, not injected context. same for gh cli execution.

**verdict:** assumption holds — promptForSet can use utilities directly

---

### 4. vault.set parameter order change

**assumption:** `secret` parameter can be added to vault.set (backward compatible)

**question:** per memory, no backward compat allowed. what about extant tests?

**answer:** tests call vault.set. tests must update to pass secret parameter. no production callers outside keyrack itself.

**verdict:** assumption holds — controlled scope, tests update together

---

### 5. setupAwsSsoWithGuide reuse

**assumption:** setupAwsSsoWithGuide can be moved to mech adapter cleanly

**question:** does setupAwsSsoWithGuide depend on vault-specific context?

**evidence from research:**
```
current flow (328 lines):
1. list sso portals from config
2. prompt for sso domain selection or new url
3. browser auth via `initiateAwsSsoAuth`
4. list accounts, prompt for selection
5. list roles, prompt for selection
6. suggest profile name, prompt for confirmation
7. check profile conflicts, handle overwrite
8. write to ~/.aws/config  <-- THIS IS VAULT-SPECIFIC
```

**issue found:** step 8 (write to ~/.aws/config) is vault-specific storage!

**corrected approach:**
- mech adapter promptForSet returns: `{ profileName, ssoConfig }`
- vault adapter set receives: profile name + config to write
- or: mech returns profile name only, vault does the write

**simpler:** mech prompts and returns profile name. vault writes to config file. separation maintained.

**but:** mech.promptForSet needs to know where profile will be written to suggest name and check conflicts.

**issue:** profile conflict check requires knowledge of where profiles are stored (vault knowledge).

**resolution options:**
1. mech checks ~/.aws/config directly (leaks vault knowledge into mech)
2. vault provides "list extant profiles" method (mech queries vault)
3. mech returns proposed profile name, vault checks conflict and calls back

option 2 is cleanest:
```
mech.promptForSet({ key, env, keyrackOrg, profilesExtant: vault.listProfiles() })
```

**but this couples mech to vault interface!**

**better:** keep setupAwsSsoWithGuide as-is for now. the "move" is a refactor of ownership, not interface. vault.set calls mech.promptForSet internally for aws.config vault only. this is a special case.

**impact:** blueprint overstates cleanness of aws sso move. actual change: vault.set orchestrates, mech.promptForSet is called within vault.set for aws.config vault specifically.

---

## summary of issues found

### issue 1: github org vs keyrack org confusion

**fix:** promptForSet for github app discovers github orgs independently, ignores keyrack org

### issue 2: checkMechCompat order unclear

**fix:** clarify that inferMech filters to supportedMechs. checkMechCompat validates explicit --mech only.

### issue 3: aws sso move complexity understated

**fix:** acknowledge that aws.config vault is special case where vault.set orchestrates mech.promptForSet internally. not a clean extraction.

---

## updated blueprint sections

### codepath tree — set flow (corrected)

```
setKeyrackKey
├─ [+] inferVault (if --vault absent)
│  └─ AWS_PROFILE → aws.config, else null
│
├─ [○] vault adapter lookup
│  └─ context.vaultAdapters[input.vault]
│
├─ [+] inferMech (if --mech absent)
│  ├─ filter to vault.supportedMechs only
│  ├─ single compatible mech → auto-select
│  └─ multiple compatible mechs → prompt via stdin
│
├─ [+] checkMechCompat (if --mech explicit)
│  └─ fail-fast if mech not in vault.supportedMechs
│
├─ [+] mech adapter promptForSet
│  ├─ EPHEMERAL_VIA_GITHUB_APP
│  │  ├─ gh api /user/orgs → list GITHUB orgs (not keyrack org)
│  │  ...
│
```

### note on aws.config special case

aws.config vault is special: vault.set calls mech.promptForSet internally because profile write and conflict check require vault knowledge. this is acceptable — aws sso flow is tightly coupled to ~/.aws/config format by design.

---

## fixes applied to blueprint

### fix 1: github org vs keyrack org

**before:** promptForSet showed `gh api /user/orgs → list` without clarification

**after:** changed to `gh api /user/orgs → list GITHUB orgs (independent of keyrack org)`

**also:** updated mech adapter interface notes:
- `{ key, keyrackOrg, env } → { source: string }`
- note: keyrackOrg is for slug construction, not for github/aws api calls
- note: mech discovers external orgs independently

### fix 2: checkMechCompat order

**before:** checkMechCompat shown before inferMech

**after:** reordered:
1. inferMech (filters to vault.supportedMechs)
2. checkMechCompat (validates explicit --mech only)

### fix 3: aws.config special case documented

**before:** implied clean extraction of setupAwsSsoWithGuide

**after:** added explicit section:
> aws.config vault is a special case: vault.set orchestrates mech.promptForSet internally because profile write and conflict check require vault knowledge

---

## verdict

three issues found, fixed, and documented. blueprint codepath tree updated to reflect corrections.
