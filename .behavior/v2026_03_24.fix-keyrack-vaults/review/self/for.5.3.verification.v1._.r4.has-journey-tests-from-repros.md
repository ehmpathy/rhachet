# self-review r4: has-journey-tests-from-repros

## question: did you implement each journey from repros?

---

## repros artifact: not applicable

this behavior does not have a `3.2.distill.repros.*.md` artifact.

the journey tests were derived directly from:
- `2.1.criteria.blackbox.md` — usecase definitions with given/when/then structure
- `2.2.criteria.blackbox.matrix.md` — test matrix for vault behaviors

---

## journey coverage from criteria.blackbox

| usecase | journey | test file | status |
|---------|---------|-----------|--------|
| usecase.1 | os.daemon set → get → expire | keyrack.vault.osDaemon.acceptance.test.ts | covered |
| usecase.2 | 1password set → unlock → get | keyrack.vault.1password.acceptance.test.ts | covered |
| usecase.3 | ci with service accounts | keyrack.vault.1password.acceptance.test.ts | covered (service account scenario) |
| usecase.4 | op cli not installed | keyrack.vault.1password.acceptance.test.ts | covered (exit 2 constraint) |
| usecase.5 | op cli not authenticated | keyrack.vault.1password.acceptance.test.ts | covered (auth error) |
| usecase.6 | invalid exid | keyrack.vault.1password.acceptance.test.ts | covered (validation error) |

---

## bdd structure verification

each acceptance test follows given/when/then:

```typescript
// from keyrack.vault.osDaemon.acceptance.test.ts
given('[case1] os.daemon vault set → get → del', () => {
  when('[t0] set ephemeral key to os.daemon', () => {
    then('returns mech=EPHEMERAL_VIA_SESSION', ...);
  });
  when('[t1] get key from daemon', () => {
    then('returns secret from daemon', ...);
  });
});

// from keyrack.vault.1password.acceptance.test.ts
given('[case1] 1password vault set → unlock → get roundtrip', () => {
  when('[t0] set stores exid pointer', () => {
    then('returns mech=PERMANENT_VIA_REFERENCE', ...);
  });
  when('[t1] unlock fetches from 1password to daemon', () => {
    then('secret available in daemon', ...);
  });
});
```

---

## conclusion

no repros artifact for this behavior. journey tests were derived from criteria.blackbox and implemented in acceptance tests with proper bdd structure.

holds (n/a — no repros artifact).

