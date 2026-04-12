# self-review: has-consistent-mechanisms (r8)

## deeper reflection: what did r7 miss?

r7 checked individual mechanisms. let me examine cross-domain patterns and structural consistency.

---

## cross-domain pattern: cli wrapper consistency

### execOp pattern (1password)

```ts
// vaultAdapter1Password.ts lines 26-30
const execOp = async (args: string[]): Promise<{ stdout: string; stderr: string }> => {
  return execFileAsync('op', args);
};
```

### inline execSync pattern (github app)

```ts
// mechAdapterGithubApp.ts line 134
const orgsOutput = execSync('gh api /user/orgs --jq ".[].login"', { encoding: 'utf-8' });
```

### blueprint's ghApi* pattern

**question:** should we use `execFileAsync` like execOp, or `execSync` like mechAdapterGithubApp?

**analysis:**
- execFileAsync: async, avoids shell interpretation, returns { stdout, stderr }
- execSync: sync, uses shell, returns stdout directly

**which is better for gh api?**
- gh api requires json body input for PUT
- gh api has structured output (json)
- error handle benefits from async pattern

**recommendation:** blueprint should follow execOp pattern (execFileAsync) for consistency with extant vault adapters.

**is this a blocker?** no. the blueprint declares communicators without implementation specified. execution pattern is implementation detail.

---

## cross-domain pattern: error message generation

### extant pattern: asErrorMessage functions

```ts
// vaultAdapter1Password.ts lines 116-139
export const asVaultErrorMessage = (input: { exid: string }): string[] => [...]
export const asAccountErrorMessage = (input: {...}): string[] => [...]
```

**question:** does blueprint need similar error message functions?

**analysis:** yes. blueprint vision mentions specific error snapshots:
- error: gh auth required
- error: repo not found
- error: permission denied

**check blueprint:** codepath tree line 82-84 declares `validateGhAuth` in ghApiSetSecret. this suggests auth check.

**absent:** blueprint does not explicitly declare error message transformers.

**is this a blocker?** no. error messages are implementation detail. the blueprint declares the behaviors (failfast with clear error) but not the transformers that format them. this is acceptable — transformers for format are optional extraction, not mandatory.

---

## cross-domain pattern: mech adapter acquisition flow

### extant flow in vault adapters

1. vault.set calls `inferKeyrackMechForSet` if mech not supplied
2. vault.set calls `mechAdapter.acquireForSet({ keySlug })`
3. mech adapter runs guided setup, returns { source }
4. vault stores source

**check blueprint:** codepath tree lines 71-78 shows:
```
├── [+] set
│   ├── [←] mech.acquireForSet (reuse from mechAdapterGithubApp)
│   ├── [+] ghApiGetPublicKey (fetch repo public key)
│   ├── [+] encryptSecretValue (sodium seal)
│   └── [+] ghApiSetSecret (PUT to github)
```

**question:** does this follow extant flow?

**analysis:**
- `[←] mech.acquireForSet` = reuse extant mech adapter
- vault then encrypts and pushes to github

**verdict:** follows extant mech adapter acquisition flow. consistent.

---

## cross-domain pattern: vault registration

### extant pattern

```ts
// genContextKeyrack.ts
vaultAdapters: {
  'os.secure': vaultAdapterOsSecure,
  '1password': vaultAdapter1Password,
  // ...
}
```

**check blueprint:** filediff line 25 declares:
```
└── [~] genContextKeyrack.ts  # add github.secrets to vaultAdapters
```

**verdict:** follows extant registration pattern. consistent.

---

## summary of r8 reflection

| pattern | r7 checked? | r8 deeper check | verdict |
|---------|-------------|-----------------|---------|
| individual mechanisms | yes | n/a | consistent |
| cli wrapper style | no | execFileAsync vs execSync | impl detail, not blocker |
| error message transformers | no | optional extraction | impl detail, not blocker |
| mech adapter flow | partial | full flow traced | consistent |
| vault registration | no | follows extant | consistent |

**r8 found no additional issues.** all patterns either follow extant conventions or are acceptable implementation details.
