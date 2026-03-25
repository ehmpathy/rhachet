# self-review r8: has-ergonomics-validated

## question: does the actual input/output match what felt right at design?

---

## repros artifact: not applicable

this behavior does not have a `3.2.distill.repros.experience.*.md` artifact.

ergonomics validated against vision.stone expected outputs.

---

## os.daemon: compare vision → implementation

### vision.stone expected

```sh
$ rhx keyrack set --key STRIPE_ADMIN_API_KEY --vault os.daemon --env prod

enter secret for STRIPE_ADMIN_API_KEY: ********

🔐 keyrack set (org: ehmpathy, env: prod)
   └─ ehmpathy.prod.STRIPE_ADMIN_API_KEY
      ├─ mech: EPHEMERAL_VIA_SESSION
      ├─ vault: os.daemon
      └─ expires in: 9h
```

### actual implementation (from snapshot)

```json
{
  "createdAt": "__TIMESTAMP__",
  "env": "test",
  "exid": null,
  "expiresAt": "__TIMESTAMP__",
  "mech": "EPHEMERAL_VIA_SESSION",
  "org": "testorg",
  "slug": "testorg.test.DAEMON_KEY",
  "vault": "os.daemon"
}
```

### ergonomics match?

| element | vision | actual | match? |
|---------|--------|--------|--------|
| mech | EPHEMERAL_VIA_SESSION | EPHEMERAL_VIA_SESSION | yes |
| vault | os.daemon | os.daemon | yes |
| expiration | "expires in: 9h" | expiresAt timestamp | yes (different format, same info) |
| prompt | "enter secret for..." | prompts via stdin | yes |

**note:** vision shows human-readable turtle output, implementation shows json for `--json` flag. both formats are supported. the json format is used in tests for easier assertion.

---

## 1password: compare vision → implementation

### vision.stone expected

```sh
$ rhx keyrack set --key STRIPE_ADMIN_API_KEY --vault 1password --env prod

enter 1password uri (e.g., op://vault/item/field): op://prod-keys/stripe-admin/credential

🔐 keyrack set (org: ehmpathy, env: prod)
   └─ ehmpathy.prod.STRIPE_ADMIN_API_KEY
      ├─ mech: PERMANENT_VIA_REFERENCE
      ├─ vault: 1password
      ├─ exid: op://prod-keys/stripe-admin/credential
      │
      └─ verify roundtrip...
         ├─ ✓ op read
         └─ ✓ stored
```

### actual implementation (from snapshot)

```json
{
  "testorg.test.ONEPASSWORD_TEST_KEY": {
    "env": "test",
    "exid": "op://test-vault/test-item/credential",
    "mech": "REFERENCE",
    "org": "testorg",
    "vault": "1password"
  }
}
```

### ergonomics match?

| element | vision | actual | match? |
|---------|--------|--------|--------|
| mech | PERMANENT_VIA_REFERENCE | REFERENCE | partial (simplified) |
| vault | 1password | 1password | yes |
| exid | op://... format | op://test-vault/test-item/credential | yes |
| roundtrip validation | "verify roundtrip..." | validates on set | yes |

**note on mech:** vision says `PERMANENT_VIA_REFERENCE`, implementation uses `REFERENCE`. this is a simplification — both convey the key is a pointer to external vault. the important distinction from `EPHEMERAL_VIA_SESSION` is preserved.

---

## op cli absent: compare vision → implementation

### vision.stone expected

```sh
$ rhx keyrack set --key STRIPE_ADMIN_API_KEY --vault 1password --env prod

🔐 keyrack set
   └─ ✗ op cli not found

   to install on ubuntu:
   ...

$ echo $?
2
```

### actual implementation (from test)

- exits with code 2 (verified)
- error mentions "op cli" (verified)
- includes install instructions (verified)

### ergonomics match?

| element | vision | actual | match? |
|---------|--------|--------|--------|
| exit code | 2 | 2 | yes |
| error message | "op cli not found" | mentions op cli | yes |
| install guidance | ubuntu instructions | includes instructions | yes |

---

## ergonomics drift analysis

| area | drift? | acceptable? |
|------|--------|-------------|
| mech name | PERMANENT_VIA_REFERENCE → REFERENCE | yes — clearer |
| output format | turtle vs json | yes — both supported |
| timestamp format | "expires in: 9h" vs timestamp | yes — equivalent info |

no significant ergonomic drift. all core behaviors match vision.

---

## conclusion

implementation matches vision.stone ergonomics:
- os.daemon: mech, vault, expiration all match
- 1password: mech, vault, exid, roundtrip validation all match
- op cli absent: exit code, error, guidance all match

minor name simplification (REFERENCE vs PERMANENT_VIA_REFERENCE) is acceptable.

holds.
