# self-review r5: has-consistent-conventions

## extant name patterns

searched codebase for domain operation name conventions.

---

## patterns found

### vault inference: extant

```
inferKeyrackVaultFromKey.ts
inferKeyrackEnvForSet.ts
inferKeyrackKeyStatusWhenNotGranted.ts
```

**pattern:** `infer[Domain][Subject]From[Source].ts` or `infer[Domain][Subject]For[Purpose].ts`

### mech inference: blueprint proposes

```
inferMech.ts
```

**issue:** does not follow extant pattern. should be `inferKeyrackMechFromVault.ts` or `inferKeyrackMechForSet.ts`.

---

## issue 1: mech inference name

**blueprint says:**
```
[+] inferMech.ts — prompt for mech selection
```

**extant convention:**
- `infer[Domain][Subject]...`
- domain = Keyrack
- subject = Mech

**fix:** rename to `inferKeyrackMechForSet.ts` to match pattern.

---

## issue 2: test file name

**blueprint says:**
```
inferMech.test.ts
```

**fix:** rename to `inferKeyrackMechForSet.test.ts` to match.

---

## other names verified

### adapter filenames

extant pattern:
- `mechAdapterAwsSso.ts`
- `mechAdapterGithubApp.ts`
- `vaultAdapterOsSecure.ts`

blueprint proposes:
- `mechAdapterReplica.ts` — matches
- `mechAdapterGithubApp.ts` — matches
- `mechAdapterAwsSso.ts` — matches
- `vaultAdapterAwsConfig.ts` — matches

**verdict:** adapter names are consistent.

### domain object filenames

extant:
- `KeyrackGrantMechanismAdapter.ts`
- `KeyrackHostVaultAdapter.ts`

blueprint:
- `KeyrackGrantMechanismAdapter.ts` — matches
- `KeyrackHostVaultAdapter.ts` — matches

**verdict:** domain object names are consistent.

---

## action items

1. rename `[+] inferMech.ts` to `[+] inferKeyrackMechForSet.ts`
2. rename `inferMech.test.ts` to `inferKeyrackMechForSet.test.ts`

---

## verdict

one name inconsistency found: mech inference should follow extant `inferKeyrack*` pattern. blueprint needs update.
