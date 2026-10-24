# F14 — extant shapes this pr did not author stay until disturbed

nitpicks that grade a shape this pr inherits, or a convention a rule endorses. each is held, not
fixed, for the reason named.

| concern | the shape | why it holds |
|---|---|---|
| r006 nitpick.2 | `cannot both add and remove role "mechanic"` quotes with doubles | the message is extant (pinned in `enroll.acceptance` since before this pr); the focus refusals beside it are new and use singles. a quote swap moves an extant contract snapshot for a cosmetic gain |
| r006 nitpick.5 | `/TMP_TEST_DIR` beside `/TMP_REPO` | two roots, two tokens, by design: `invokeRhachetCliBinary.ts` masks a `rhachet-test-*` root as `/TMP_REPO` and a test-fns `genTempDir` root as `/TMP_TEST_DIR`. the focus suites use `genTempDir`, so the token is the masker's correct answer |
| r004 nitpick.1 · r007 nitpick.1 | `TEST_CASES.map(...)` caselists | `rule.prefer.data-driven` (mechanic) asks for exactly this shape for a transformer; the given/when/then wrap is kept where the file already uses test-fns |
| r008 nitpick.1 | `inherit: { always: true }` in extant fixtures | `inherit` is a resolved field of the domain object (`parseRoleBootYaml` defaults it to `true`), so a fixture that builds the object directly must name it; the implicit default stays clamped at the parser grain (`parseRoleBootYaml` [case15][t0]), which is the only place an absent key exists |

- **rework:** clean for each row
- **confidence:** 80%
- **where:** 5.3 i001 r004, r006, r007, r008
- **verdict:** —
