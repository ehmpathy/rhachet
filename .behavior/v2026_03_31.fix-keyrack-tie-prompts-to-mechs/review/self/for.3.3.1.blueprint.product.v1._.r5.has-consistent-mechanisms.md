# self-review r5: has-consistent-mechanisms (direct codebase check)

## fresh examination: verify against actual code

research stones summarize code — but summaries can miss details. check codebase directly.

---

## direct grep results

### search 1: vault inference

```bash
grep -r "inferVault\|inferKeyrackVault" src/
```

**discovered:** `src/domain.operations/keyrack/inferKeyrackVaultFromKey.ts` exists

```ts
export const inferKeyrackVaultFromKey = (input: {
  keyName: string;
}): KeyrackHostVault | null => {
  if (input.keyName === 'AWS_PROFILE') return 'aws.iam.sso';
  return null;
};
```

**blueprint says:**
```
[+] inferVault.ts — infer vault from key name
```

**issue:** blueprint says [+] new file, but extant code exists. should be [~] extend.

---

### search 2: mech inference

```bash
grep -r "inferMech" src/
```

**discovered:** `src/infra/inferMechFromVault.ts` exists

```ts
export const inferMechFromVault = (input: {
  vault: KeyrackHostVault;
}): KeyrackGrantMechanism | null => {
  const replicaVaults: KeyrackHostVault[] = ['os.secure', 'os.direct', 'os.envvar'];
  if (replicaVaults.includes(input.vault)) {
    return 'PERMANENT_VIA_REPLICA';
  }
  if (input.vault === '1password') {
    return 'PERMANENT_VIA_REFERENCE';
  }
  if (input.vault === 'aws.iam.sso') {
    return 'EPHEMERAL_VIA_AWS_SSO';
  }
  return null;
};
```

**blueprint says:**
```
[+] inferMech.ts — prompt for mech selection
```

**issue:** extant code assumes one mech per vault. new architecture allows multiple mechs per vault. this is INCOMPATIBLE — must delete and replace, not extend.

---

## two issues discovered

### issue 1: inferVault extant

**current state:** `inferKeyrackVaultFromKey.ts` exists with AWS_PROFILE → aws.iam.sso

**blueprint update needed:**
- change `[+] inferVault.ts` to `[~] inferKeyrackVaultFromKey.ts`
- note: rename aws.iam.sso to aws.config in return value

### issue 2: inferMech incompatible

**current state:** `inferMechFromVault.ts` assumes one mech per vault

**blueprint update needed:**
- add `[-] inferMechFromVault.ts` to filediff tree
- the [+] inferMech.ts is correct — new operation with different semantics

---

## action items

1. update filediff tree: `[~] inferKeyrackVaultFromKey.ts` not `[+] inferVault.ts`
2. add to filediff tree: `[-] src/infra/inferMechFromVault.ts`
3. note in blueprint: extant mech inference is incompatible, must delete

---

## verification

after blueprint update:
- [~] inferKeyrackVaultFromKey.ts — extend with aws.config rename
- [-] inferMechFromVault.ts — delete (incompatible architecture)
- [+] inferMech.ts — new operation with multi-mech prompt

**verdict:** two discrepancies found via direct codebase check. blueprint needs update.
