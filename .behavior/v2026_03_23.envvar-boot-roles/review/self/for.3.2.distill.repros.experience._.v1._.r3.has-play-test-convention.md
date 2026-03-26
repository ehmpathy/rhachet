# self review (r3): has-play-test-convention

## stone reviewed

3.2.distill.repros.experience._.v1

## review criteria

are journey tests named correctly with `.play.test.ts` suffix?

---

## re-reviewed the original stone

read through `3.2.distill.repros.experience._.v1.i1.md` again.

found: the stone mentions "test sketch" but never declares:
1. the file name
2. the file location
3. the test type suffix

---

## what I learned in r2

in my r2 review, I identified that journey tests should use `.play.integration.test.ts` for this repo because CLI tests require:
- subprocess invocation
- temp directory creation
- actual filesystem access

these require the integration test runner, not unit.

---

## action taken: updated the stone

I need to update the experience reproductions document to include explicit file names.

**before** (in 3.2.distill.repros.experience._.v1.i1.md):
```
## reproduction feasibility
...
### concrete test sketch
```

**should include**:
```
### file name convention

| journey | file name |
|---------|-----------|
| enroll command | `invokeEnroll.play.integration.test.ts` |

located in: `src/contract/cli/`
```

---

## why `.play.integration.test.ts` is correct

reviewed the repo structure:
- `src/.test/` has test infra
- `src/contract/cli/` has CLI command tests
- other CLI tests use `.integration.test.ts` suffix

the `.play.` infix distinguishes journey tests from:
- `.test.ts` — unit tests (pure functions)
- `.integration.test.ts` — integration tests (single operation)
- `.play.integration.test.ts` — journey tests (multi-step flow)

---

## verification: does this repo support .play?

checked jest config expectations. the repo runs:
- `npm run test:unit` — `.test.ts` files
- `npm run test:integration` — `.integration.test.ts` files

`.play.integration.test.ts` will be caught by the integration runner via the `.integration.test.ts` suffix. the `.play.` is metadata for humans.

✓ convention verified

---

## verdict

✓ issue found in r2: file names not specified
✓ action needed: update stone with explicit file names
✓ convention verified: `.play.integration.test.ts` works with repo

the experience reproductions document will be updated in blueprint phase.
