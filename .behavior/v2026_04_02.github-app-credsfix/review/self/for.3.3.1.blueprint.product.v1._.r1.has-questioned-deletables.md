# self-review r1: has-questioned-deletables

## features reviewed

### feature 1: fix promptHiddenInput stdin read

**traces to criteria?** yes — usecase.1 (multiline json via stdin), usecase.2 (single-line regression)

**explicitly asked?** yes — wisher reported the bug in this exact code path

**deletable?** no — this is the core fix

### feature 2: fix promptVisibleInput stdin read

**traces to criteria?** yes — same bug, same usecases apply

**explicitly asked?** no, but discovered during research as same bug pattern

**deletable?** no — leaving it unfixed would be negligent; same root cause

### feature 3: unit tests for promptHiddenInput

**traces to criteria?** yes — vision mentions "add unit tests with multiline json input"

**explicitly asked?** yes — wisher said "lets cover with unit and acceptance tests"

**deletable?** no — required by wisher

### feature 4: unit tests for promptVisibleInput

**traces to criteria?** same as above

**explicitly asked?** implied by "cover with unit tests"

**deletable?** no — same bug, same test coverage needed

### feature 5: acceptance test for keyrack multiline stdin

**traces to criteria?** yes — wisher explicitly said "lets cover with unit and acceptance tests"

**explicitly asked?** yes

**deletable?** no — required by wisher

## components reviewed

### component 1: async iterator pattern for stdin

**can this be removed entirely?** no — we must read full stdin somehow

**if deleted and added back, would we?** yes — it's the fix

**simplest version?** yes — `for await (const chunk of process.stdin)` is minimal

**alternatives considered:**
- `stream.text()` from `node:stream/consumers` — would add import, same result
- accumulate with `data` event — more boilerplate than async iterator

**verdict:** keep as-is, this is the simplest pattern

### component 2: trailing newline trim

**can this be removed entirely?** maybe

**rationale for keep:** extant behavior trims trailing newline for single-line input. users expect `echo "secret" | keyrack set` to store `secret`, not `secret\n`.

**rationale for deletion:** multiline content might intentionally end with newline. trimming could mangle.

**resolution:** keep — the extant contract trims trailing newline. change would break expectations.

### component 3: separate test files

**can this be removed?** could combine into one file

**should we?** no — follows extant pattern of collocated `*.test.ts` files

**verdict:** keep separate files

## summary

| item | deletable? | reason |
|------|------------|--------|
| promptHiddenInput fix | no | core fix, traces to wish |
| promptVisibleInput fix | no | same bug, discovered in research |
| unit tests | no | explicitly asked by wisher |
| acceptance test | no | explicitly asked by wisher |
| async iterator pattern | no | simplest fix pattern |
| trailing newline trim | no | preserves extant contract |

## none deleted

all features trace to requirements. no unnecessary components found.

the blueprint is minimal — 2 files updated, 3 files created, ~200 lines total.
