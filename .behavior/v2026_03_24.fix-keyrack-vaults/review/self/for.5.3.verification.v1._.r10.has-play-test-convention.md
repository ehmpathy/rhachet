# self-review r10: has-play-test-convention

## deeper pass: verify journey test file convention

r9 documented the repo uses `.acceptance.test.ts`. this pass verifies each criteria from the guide.

---

## guide criteria checklist

the guide asks three questions:
1. are journey tests in the right location?
2. do they have the `.play.` suffix?
3. if not supported, is the fallback convention used?

---

## question 1: are journey tests in the right location?

**answer: yes**

journey tests for keyrack vaults live in:
```
blackbox/cli/
├── keyrack.vault.osDaemon.acceptance.test.ts
├── keyrack.vault.1password.acceptance.test.ts
└── ... (60 total acceptance tests in this directory)
```

this is the canonical location for cli acceptance tests in this repo. the `blackbox/cli/` directory contains all cli journey tests.

---

## question 2: do they have the `.play.` suffix?

**answer: no**

the files use `.acceptance.test.ts`, not `.play.test.ts` or `.play.acceptance.test.ts`.

---

## question 3: is the fallback convention used?

**answer: yes**

the repo has 60 acceptance tests, all with `.acceptance.test.ts` suffix. this is the established repo convention.

| evidence | count |
|----------|-------|
| files with `.acceptance.test.ts` in blackbox/cli/ | 60 |
| files with `.play.test.ts` in blackbox/cli/ | 0 |
| files with `.play.acceptance.test.ts` in blackbox/cli/ | 0 |

the keyrack vault tests follow this established convention:
- `keyrack.vault.osDaemon.acceptance.test.ts`
- `keyrack.vault.1password.acceptance.test.ts`

---

## why fallback is correct here

the guide states: "if not supported, is the fallback convention used?"

this repo does not use `.play.` convention. it uses `.acceptance.test.ts` as the journey test convention. the new vault tests follow this.

---

## no issues found

the journey tests are:
1. in the right location (`blackbox/cli/`)
2. named with the repo's fallback convention (`.acceptance.test.ts`)
3. consistent with 60 other acceptance tests in the same directory

---

## conclusion

journey tests follow the repo's fallback convention. no issues found.

holds.
