# self-review r6: has-consistent-conventions (deeper)

## fresh examination: interface methods

read extant adapter interfaces directly.

---

## mech adapter interface (extant)

```ts
export interface KeyrackGrantMechanismAdapter {
  validate: (input: { source?: string; cached?: string }) => {
    valid: boolean;
    reasons?: string[];
  };

  translate: (input: { secret: string }) =>
    Promise<{ secret: string; expiresAt?: IsoTimeStamp }>;
}
```

**pattern:** methods are verb phrases (`validate`, `translate`)

**blueprint proposes:**
```
promptForSet: ({ key, keyrackOrg, env }) => { source: string }
```

**verification:** `promptForSet` follows verb phrase pattern. consistent.

---

## vault adapter interface (extant)

```ts
export interface KeyrackHostVaultAdapter {
  unlock: (input: {...}) => Promise<void>;
  isUnlocked: (input?: {...}) => Promise<boolean>;
  get: (input: {...}) => Promise<string | null>;
  set: (input: {...}) => Promise<void | { exid: string }>;
  del: (input: {...}) => Promise<void>;
  relock?: (input: {...}) => Promise<void>;
}
```

**extant note on set:**
> `.note = vault prompts for its own secret via stdin; callers never supply it`

**blueprint proposes:**
1. `supportedMechs` — property, not method
2. `checkMechCompat` — method

**verification:**
- `supportedMechs` is a static property — acceptable; no extant properties exist but a new one is not inconsistent
- `checkMechCompat` follows verb phrase pattern — consistent with `isUnlocked`

---

## key change: set signature

**extant:**
```ts
set: (input: { slug, env, org, ... }) => Promise<void | { exid }>
// vault prompts for secret via stdin
```

**blueprint proposes:**
```ts
set: (input: { slug, secret, ... }) => void | { exid }
// secret now from mech, not from vault prompt
```

**verification:** this is the core refactor. the extant note explicitly says "vault prompts for its own secret" — we move that to mech. the signature change (`secret` added) is intentional and consistent with the goal.

---

## method name audit

| extant method | pattern | blueprint consistent? |
|---------------|---------|----------------------|
| validate | verb | yes |
| translate | verb | yes |
| unlock | verb | yes |
| isUnlocked | isVerb | yes |
| get | verb | yes |
| set | verb | yes |
| del | verb | yes |
| relock | verb | yes |
| **new: promptForSet** | verbFor+noun | yes |
| **new: checkMechCompat** | verb+noun | yes |

all method names follow extant patterns.

---

## file path conventions

**extant:**
```
src/domain.operations/keyrack/adapters/mechanisms/mechAdapterAwsSso.ts
src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure.ts
```

**blueprint proposes:**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.ts
```

**verification:** follows extant `[vault]Adapter[Name].ts` pattern. consistent.

---

## issue fixed in r5

`inferMech.ts` renamed to `inferKeyrackMechForSet.ts` to match extant `inferKeyrack*` pattern.

---

## verdict

all names verified consistent with extant conventions:
- method names follow verb phrase pattern
- file paths follow `[type]Adapter[Name].ts` pattern
- domain operations follow `infer[Domain][Subject]...` pattern

no additional issues found.
