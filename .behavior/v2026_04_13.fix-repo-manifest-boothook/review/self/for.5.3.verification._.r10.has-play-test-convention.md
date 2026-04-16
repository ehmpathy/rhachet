# self review: has-play-test-convention (round 10)

## pause and question deeper

the prior review stated "this repo uses `.acceptance.test.ts`." but i did not question whether this is the RIGHT convention to use. let me examine this critically.

## what is the `.play.` convention for?

the `.play.test.ts` suffix signals:
- **journey test** — tests a user path end-to-end
- **blackbox** — tests from outside the implementation
- **behavioral** — tests what, not how

## what does `.acceptance.` accomplish?

the `.acceptance.test.ts` suffix signals:
- **acceptance test** — verifies acceptance criteria
- **blackbox** — tests via public interfaces
- **behavioral** — tests observable outputs

## are they equivalent?

| aspect | `.play.` | `.acceptance.` |
|--------|----------|----------------|
| blackbox | yes | yes |
| journey-based | yes (explicit) | yes (implicit) |
| test runner | configured | configured |
| purpose | user journeys | acceptance criteria |

**key difference:** `.play.` emphasizes the journey metaphor. `.acceptance.` emphasizes acceptance criteria.

for this behavior, the test is:

1. create package with bootable content, no boot hook
2. run `repo introspect`
3. observe failfast error

this IS a journey. but it also IS an acceptance criterion.

## why `.acceptance.` is acceptable here

1. **repo consistency** — 65+ tests use `.acceptance.test.ts`
2. **semantic equivalence** — both indicate blackbox behavioral tests
3. **runner configuration** — `npm run test:acceptance` runs these tests
4. **no `.play.` infrastructure** — would require new config

**a convention change mid-repo would create inconsistency.**

## critical question: should this behavior introduce `.play.`?

**no.** reasons:

1. this is a single behavior, not a repo-wide convention change
2. repo convention is established and consistent
3. the test achieves the same goal under either name
4. no test coverage is lost

## the actual test file

`blackbox/cli/repo.introspect.acceptance.test.ts` case9:

```ts
given('[case9] rhachet-roles package with bootable content but no boot hook', () => {
  when('[t0] repo introspect', () => {
    then('exits with non-zero status', ...)
    then('stderr includes bummer dude message', ...)
    then('stderr includes role slug', ...)
    then('stderr includes no-hook-declared reason', ...)
    then('stderr includes hint about boot hook', ...)
  });
});
```

this is a journey test:
- setup: create broken package
- action: run introspect
- observation: verify error output

it follows the repo convention with `.acceptance.test.ts`.

## conclusion

holds. the `.acceptance.test.ts` convention is the established fallback in this repo. the journey test for this behavior:
- is in the correct location (`blackbox/cli/`)
- uses the correct suffix (`.acceptance.test.ts`)
- tests the user journey end-to-end
- follows repo conventions

no convention violation. no test coverage gap.

