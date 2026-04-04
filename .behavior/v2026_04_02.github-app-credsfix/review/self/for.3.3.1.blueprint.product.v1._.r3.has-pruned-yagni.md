# self-review r3: has-pruned-yagni (deeper)

## re-examine: what did r2 miss?

let me look harder at the blueprint sections.

### section: test coverage matrix (8 test cases)

**minimum viable?** let me trace to criteria:

| criteria usecase | required test |
|------------------|---------------|
| usecase.1 multiline json | multi-line stdin test |
| usecase.2 single-line json | single-line stdin test |
| usecase.4 empty stdin | empty stdin test |
| acceptance roundtrip | keyrack set/get test |

that's 4 required tests. the blueprint lists 8 because it duplicates for both files.

**is that YAGNI?** no — both files have the same bug, both need tests.

**could we reduce?** could share test helper, but that adds abstraction. simpler to duplicate 3 test cases.

**verdict**: holds — 8 tests = 4 cases × 2 files

### section: risk assessment

**requested?** no — not in criteria

**needed?** it's documentation, not code. helps reviewer understand why TTY branch is untouched.

**is it YAGNI?** borderline — it's a blueprint convention, not functional code

**verdict**: keep — it's part of blueprint format, costs no runtime

### section: dependencies

**requested?** no

**needed?** confirms no new packages needed

**is it YAGNI?** no — it's documentation that the fix is self-contained

**verdict**: keep — part of blueprint format

### section: notes

**requested?** no

**needed?** documents why `async` is compatible

**is it YAGNI?** borderline — could delete without loss

**potential issue found**: the notes say "must be async to use for await" but the functions are already async. this is redundant.

**action**: flag as minor cleanup, not blocker

## deeper question: could we use a simpler fix?

### alternative 1: use node:stream/consumers

```ts
import { text } from 'node:stream/consumers';
const content = await text(process.stdin);
```

**simpler?** yes — 1 line instead of 5
**why not used?** adds import, but same effect

**should we switch?** possibly — let me check if it handles charset

after thought: `text()` assumes utf-8 by default. same result, fewer lines.

**found**: blueprint could use simpler pattern

**severity**: nitpick — both work correctly

### alternative 2: just remove readline, use readable.read()

too complex — would need to handle chunks manually

## summary of r3

| item | YAGNI? | action |
|------|--------|--------|
| 8 test cases | no | keep |
| risk assessment | no | keep (blueprint convention) |
| dependencies | no | keep (blueprint convention) |
| notes section | borderline | keep (helpful context) |
| async iterator vs text() | nitpick | could simplify, not blocker |

**no YAGNI issues found that warrant blueprint change.**

the `node:stream/consumers` alternative is simpler but the async iterator pattern is also correct and explicit. both are acceptable.
