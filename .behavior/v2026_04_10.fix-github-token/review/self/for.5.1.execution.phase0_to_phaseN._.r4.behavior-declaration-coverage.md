# review: behavior-declaration-coverage (round 4)

## slowed down. traced each requirement.

let me check the vision, criteria, and blueprint against the implementation.

---

## vision requirements

| requirement | implemented? | evidence |
|-------------|--------------|----------|
| fill prompts "which mechanism?" | yes | `hydrateKeyrackRepoManifest.ts` now sets `mech: null`, vault adapter prompts via `inferKeyrackMechForSet` |
| same flow as `keyrack set` | yes | both use `vault.set()` which calls `inferKeyrackMechForSet` when mech is null |
| guided setup proceeds accordingly | yes | mech adapter's `acquireForSet` handles guided setup |
| tilde expansion for pem path | yes | `mechAdapterGithubApp.ts` line 207: `replace(/^~(?=$|\/|\\)/, homedir())` |

---

## criteria check (line by line)

### usecase.1 = fill prompts for mechanism selection

```
given(repo manifest declares key without explicit mech)
  given(vault supports multiple mechanisms)
    when(user runs `keyrack fill --env $env`)
      then(prompts "which mechanism?") ✓
```

**verified:** test output shows:
```
   which mechanism?
   1. PERMANENT_VIA_REPLICA — static secret (api key, password)
   2. EPHEMERAL_VIA_GITHUB_APP — github app installation (short-lived tokens)
```

### usecase.2 = fill with ephemeral mechanism

```
given(user has a GitHub App configured)
  when(prompted for mechanism, user selects EPHEMERAL_VIA_GITHUB_APP)
    then(prompts for github org) ✓
    then(prompts for github app) ✓
    then(prompts for pem path) ✓
```

**verified:** `mechAdapterGithubApp.acquireForSet` handles this flow.

### usecase.3 = fill with permanent mechanism

```
given(user has a static api key or password)
  when(prompted for mechanism, user selects PERMANENT_VIA_REPLICA)
    then(prompts "enter secret for $KEY_NAME:") ✓
```

**verified:** `mechAdapterReplica.acquireForSet` handles this flow.

### usecase.4 = manifest declares explicit mech

```
given(repo manifest declares key with explicit mech: PERMANENT_VIA_REPLICA)
  when(user runs `keyrack fill --env $env`)
    then(skips "which mechanism?" prompt) ✓
```

**verified:** `inferKeyrackMechForSet` only prompts when mech is null.

### usecase.5 = vault supports only one mechanism

```
given(vault only supports one mechanism)
  then(auto-selects the only available mechanism) ✓
```

**verified:** `inferKeyrackMechForSet` returns `supported[0]` when `supported.length === 1`.

### usecase.6 = pem path with tilde expansion

```
given(user provides pem path as ~/path/to/key.pem)
  then(subsequent unlock expands ~ to user's home directory) ✓
```

**verified:** `mechAdapterGithubApp.ts` line 207:
```ts
pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir())
```

### usecase.7 = parity with keyrack set

```
given(user has used `keyrack set` before)
  when(user runs `keyrack fill --env $env` for the same key)
    then(sees the same "which mechanism?" prompt) ✓
```

**verified:** both paths use `vault.set()` → `inferKeyrackMechForSet`.

---

## blueprint check (changes implemented)

| change | file | done? |
|--------|------|-------|
| mech nullable | `KeyrackKeySpec.ts` | ✓ `mech: KeyrackGrantMechanism \| null` |
| remove hardcode | `hydrateKeyrackRepoManifest.ts` | ✓ `mech: null` in 3 places |
| tilde expansion | `mechAdapterGithubApp.ts` | ✓ `replace(/^~/, homedir())` |

---

## gaps found

none. all requirements from vision, criteria, and blueprint are implemented.

---

## verdict

**holds** — all requirements covered. vision satisfied. criteria satisfied. blueprint implemented.

