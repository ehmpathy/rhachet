# self-review r9: has-play-test-convention

## question: do journey test files use the play test convention?

---

## repo convention

this repo uses `.acceptance.test.ts` suffix for journey tests, not `.play.test.ts`.

the blackbox acceptance tests live in `blackbox/cli/` and follow the pattern:
- `keyrack.*.acceptance.test.ts`

---

## keyrack vault journey tests

| file | convention | match? |
|------|------------|--------|
| `keyrack.vault.osDaemon.acceptance.test.ts` | `.acceptance.test.ts` | yes |
| `keyrack.vault.1password.acceptance.test.ts` | `.acceptance.test.ts` | yes |

both files follow the repo's acceptance test convention.

---

## test structure

both files use test-fns BDD patterns:

```typescript
given('[case1] description', () => {
  when('[t0] action', () => {
    then('outcome', () => { ... });
  });
});
```

---

## conclusion

journey tests for keyrack vaults follow the repo's `.acceptance.test.ts` convention.

holds.
