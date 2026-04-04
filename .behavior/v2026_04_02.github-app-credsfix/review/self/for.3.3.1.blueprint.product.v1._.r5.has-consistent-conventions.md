# self-review r5: has-consistent-conventions

## name conventions in blueprint

### variable names

**blueprint uses**:
- `chunks: string[]` — array accumulator
- `chunk` — loop variable
- `content` — joined result

**check extant patterns**:
- `src/infra/promptHiddenInput.ts:47` uses `password` for accumulator
- `src/infra/promptHiddenInput.ts:58` uses `char` for character

**verdict**: `chunks` and `chunk` are appropriate for stdin bytes. different from `password`/`char` because this is different code path (piped vs TTY).

### comment conventions

**blueprint uses**:
```ts
// read ALL stdin content, not just first line
```

**extant pattern** (line 15):
```ts
// read from stdin as a line
```

**verdict**: consistent single-line comment style.

### file name conventions

**blueprint proposes**:
- `promptHiddenInput.test.ts` — unit test
- `promptVisibleInput.test.ts` — unit test
- `keyrack.stdin-multiline.acceptance.test.ts` — acceptance test

**extant patterns**:
- `src/infra/*.test.ts` — collocated unit tests (none extant for these files)
- `blackbox/cli/keyrack.set.acceptance.test.ts` — acceptance test

**verdict**: follows extant patterns exactly.

### test structure

**blueprint proposes**: use `given/when/then` from test-fns

**extant pattern**: `blackbox/cli/keyrack.set.acceptance.test.ts` uses this pattern

**verdict**: consistent with extant tests.

## summary

| convention | blueprint | extant | match? |
|------------|-----------|--------|--------|
| variable names | chunks, chunk, content | appropriate for context | yes |
| comment style | single-line // | single-line // | yes |
| unit test names | *.test.ts | *.test.ts | yes |
| acceptance test names | *.acceptance.test.ts | *.acceptance.test.ts | yes |
| test structure | given/when/then | given/when/then | yes |

no convention issues. blueprint is consistent.
