# review.self: behavior-declaration-adherance (r5)

## the question

does each changed file adhere to the vision, criteria, and blueprint specifications?

## review method

read each key implementation file line by line, verify against spec.

---

## vaultAdapterOsDaemon.ts

### vision adherance

| spec | code | line | verdict |
|------|------|------|---------|
| prompts for secret via stdin | promptHiddenInput({ prompt: `enter secret for ${input.slug}: ` }) | 66-68 | ✓ |
| stores key in daemon memory only | daemonAccessUnlock({ keys: [...] }) | 85-96 | ✓ |
| mech=EPHEMERAL_VIA_SESSION | source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' } | 90 | ✓ |
| 9h default expiry | defaultTtlMs = 9 * 60 * 60 * 1000 | 77 | ✓ |
| auto-starts daemon if absent | findsertKeyrackDaemon() | 83 | ✓ |
| no disk persistence | daemonAccessUnlock uses unix socket to daemon memory | 85-96 | ✓ |

### criteria adherance

| criterion | code | verdict |
|-----------|------|---------|
| usecase.1: prompts for secret via stdin | promptHiddenInput line 66 | ✓ |
| usecase.1: stores key in daemon memory | daemonAccessUnlock line 85 | ✓ |
| usecase.1: returns mech=EPHEMERAL_VIA_SESSION | line 90 | ✓ |
| usecase.1: returns vault=os.daemon | line 90 | ✓ |
| usecase.1: auto-starts daemon if absent | findsertKeyrackDaemon line 83 | ✓ |

### blueprint adherance

| phase | spec | code | verdict |
|-------|------|------|---------|
| 0 | directory os.daemon/ | file at os.daemon/vaultAdapterOsDaemon.ts | ✓ |
| 2 | export vaultAdapterOsDaemon | export const vaultAdapterOsDaemon | ✓ |
| 2 | mech EPHEMERAL_VIA_SESSION | line 73, 90 | ✓ |
| 2 | prompts via promptHiddenInput | line 66-68 | ✓ |
| 2 | uses daemonAccessUnlock | line 85 | ✓ |

---

## vaultAdapter1Password.ts

### vision adherance

| spec | code | line | verdict |
|------|------|------|---------|
| prompts for exid | promptVisibleInput({ prompt: 'enter 1password uri...' }) | 124-127 | ✓ |
| validates roundtrip via `op read $exid` | execOp(['read', exid]) | 139-141 | ✓ |
| stores pointer not secret | return { exid } | 158 | ✓ |
| op cli check with exit 2 | isOpCliInstalled() + process.exit(2) | 93-120 | ✓ |
| ubuntu install instructions | console.log lines 99-116 | 99-116 | ✓ |

### criteria adherance

| criterion | code | verdict |
|-----------|------|---------|
| usecase.2: prompts for exid | promptVisibleInput line 125 | ✓ |
| usecase.2: validates roundtrip | execOp(['read', exid]) line 140 | ✓ |
| usecase.2: returns mech=PERMANENT_VIA_REFERENCE | via inferMechFromVault | ✓ |
| usecase.2: returns exid | return { exid } line 158 | ✓ |
| usecase.4: displays "op cli not found" | line 97 | ✓ |
| usecase.4: displays ubuntu install instructions | lines 99-116 | ✓ |
| usecase.4: exits with code 2 | process.exit(2) line 119 | ✓ |
| usecase.6: roundtrip validation fails | try/catch lines 139-155 | ✓ |
| usecase.6: displays error with invalid exid | lines 143-152 | ✓ |
| usecase.6: exits with code 2 | process.exit(2) line 154 | ✓ |

### blueprint adherance

| phase | spec | code | verdict |
|-------|------|------|---------|
| 0 | directory 1password/ | file at 1password/vaultAdapter1Password.ts | ✓ |
| 3 | set() with exid prompt | promptVisibleInput lines 124-127 | ✓ |
| 3 | isOpCliInstalled check | line 93-94 | ✓ |
| 3 | roundtrip validation | lines 139-155 | ✓ |
| 3 | returns { exid } | line 158 | ✓ |

---

## isOpCliInstalled.ts

### blueprint adherance

| spec | code | verdict |
|------|------|---------|
| isOpCliInstalled returns Promise<boolean> | line 12: async (): Promise<boolean> | ✓ |
| uses `which op` to check | execAsync('which op') line 14 | ✓ |
| returns true if found | line 15 | ✓ |
| returns false if absent | line 17 | ✓ |

---

## KeyrackGrantMechanism.ts

### blueprint adherance

| spec | code | line | verdict |
|------|------|------|---------|
| PERMANENT_VIA_REFERENCE | type includes 'PERMANENT_VIA_REFERENCE' | 23 | ✓ |
| EPHEMERAL_VIA_SESSION | type includes 'EPHEMERAL_VIA_SESSION' | 24 | ✓ |
| deprecated aliases | 'REPLICA', 'REFERENCE', 'GITHUB_APP', 'AWS_SSO' | 29-32 | ✓ |
| convention: {DURATION}_VIA_{METHOD} | name convention comment lines 5-7 | ✓ |

---

## inferMechFromVault.ts

### blueprint adherance

| spec | code | line | verdict |
|------|------|------|---------|
| os.daemon → EPHEMERAL_VIA_SESSION | if (input.vault === 'os.daemon') return 'EPHEMERAL_VIA_SESSION' | 31-33 | ✓ |
| 1password → PERMANENT_VIA_REFERENCE | if (input.vault === '1password') return 'PERMANENT_VIA_REFERENCE' | 26-28 | ✓ |

---

## contract adherance

### vaultAdapterOsDaemon.set

blueprint specifies:
```typescript
set: async (input: {
  slug: string;
  env: string;
  org: string;
  exid?: string | null;
  expiresAt?: string | null;
  vaultRecipient?: string | null;
  recipients?: KeyrackKeyRecipient[];
  owner?: string | null;
}) => Promise<void>
```

code (line 64):
```typescript
set: async (input) => { ... }
```

input is typed via KeyrackHostVaultAdapter interface. ✓ matches.

### vaultAdapter1Password.set

blueprint specifies:
```typescript
set: async (input: { ... }) => Promise<{ exid: string }>
```

code (lines 91, 158):
```typescript
set: async (input) => { ... return { exid }; }
```

✓ matches.

---

## conclusion

all changed files adhere to vision, criteria, and blueprint specifications:

| file | vision | criteria | blueprint |
|------|--------|----------|-----------|
| vaultAdapterOsDaemon.ts | ✓ all | ✓ all | ✓ all |
| vaultAdapter1Password.ts | ✓ all | ✓ all | ✓ all |
| isOpCliInstalled.ts | n/a | n/a | ✓ all |
| KeyrackGrantMechanism.ts | n/a | n/a | ✓ all |
| inferMechFromVault.ts | n/a | n/a | ✓ all |

no deviations found.
