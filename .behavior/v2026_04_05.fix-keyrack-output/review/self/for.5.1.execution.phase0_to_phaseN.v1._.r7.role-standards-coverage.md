# self-review: role-standards-coverage

## the question

review for coverage of mechanic role standards.

go through each file changed in this pr, line by line, and check:
- are all relevant mechanic standards applied?
- are there patterns that should be present but are absent?
- did we forget error handle, validation, tests, types, or other required practices?

## rule directories checked

briefs directories relevant to this code:
- `code.prod/evolvable.procedures/` — function patterns
- `code.prod/evolvable.domain.operations/` — operation patterns
- `code.prod/pitofsuccess.errors/` — error patterns
- `code.prod/readable.narrative/` — code clarity
- `code.prod/readable.comments/` — comment patterns
- `lang.terms/` — term conventions
- `code.test/` — test patterns

confirmed: no rule categories omitted. these directories cover all applicable patterns for CLI commands and transformers.

## the review

### file: asShellEscapedSecret.ts

| standard | applied? | evidence |
|----------|----------|----------|
| arrow-only | yes | `export const asShellEscapedSecret = (input: {...}) => {...}` |
| input-context | yes | `(input: { secret: string })` — pure transformer, no context needed |
| what-why header | yes | `.what` and `.why` present in jsdoc |
| typed input | yes | `input: { secret: string }` |
| typed output | yes | `: string` return type |
| no gerunds | yes | function name uses verb pattern |
| no else branches | yes | uses early return for control char path |
| unit test coverage | yes | asShellEscapedSecret.test.ts with all edge cases |

**absent patterns check:**
- error handle: not applicable — pure transformer, cannot fail
- validation: not applicable — accepts any string
- failfast: not applicable — no preconditions to check

**conclusion:** no absent patterns.

---

### file: invokeKeyrack.ts (--output option changes)

| standard | applied? | evidence |
|----------|----------|----------|
| arrow-only | yes | `.action(async (opts) => {...})` |
| failfast | yes | line 370: `throw new BadRequestError('--value requires --key')` |
| exit-code semantics | yes | exit 2 for constraint errors |
| narrative flow | yes | guard clauses at top, linear execution |
| no else branches | yes | uses early return/throw, not if-else |
| typed options | yes | commander types inferred |

**absent patterns check:**
- error messages include hint: yes, error says "(single key only)"
- exit code semantics: yes, exit 2 for "not granted" status

**conclusion:** no absent patterns.

---

### file: invokeKeyrack.ts (source command)

| standard | applied? | evidence |
|----------|----------|----------|
| arrow-only | yes | `.action(async (opts) => {...})` |
| failfast | yes | validates --owner, --env, mutually exclusive flags |
| exit-code semantics | yes | exit 2 on strict mode failure |
| narrative flow | yes | flat guards, no nested blocks |
| no else branches | yes | `if (!isLenient && notGranted.length > 0)` without else |
| hint messages | yes | `console.error('hint: use --lenient...')` |

**absent patterns check:**
- did we validate all required inputs?
  - --env: yes (requiredOption)
  - --owner: yes (requiredOption)
  - --strict/--lenient: yes (mutual exclusion check)
- are there absent validation cases?
  - reviewed: no absent cases found

**conclusion:** no absent patterns.

---

### file: keyrack.get.output.acceptance.test.ts

| standard | applied? | evidence |
|----------|----------|----------|
| given-when-then | yes | imports from test-fns, proper structure |
| case/test labels | yes | `[case1]`, `[t0]` etc. |
| snapshots | yes | `toMatchSnapshot()` for stdout |
| useBeforeAll for scene | yes | shared setup via useBeforeAll |

**absent patterns check:**
- error cases covered: yes (locked, absent, blocked)
- validation errors: yes (--value without --key)
- edge cases: yes (special chars, newlines)

**conclusion:** no absent patterns.

---

### file: keyrack.source.cli.acceptance.test.ts

| standard | applied? | evidence |
|----------|----------|----------|
| given-when-then | yes | proper structure |
| case/test labels | yes | labeled correctly |
| snapshots | yes | used for export statement format |
| useBeforeAll | yes | shared scene setup |

**absent patterns check:**
- strict mode failure: yes (case3)
- lenient mode: yes (case4, case5)
- validation errors: yes (case6)
- shell escape edge cases: yes (case7)

**conclusion:** no absent patterns.

## found concerns

none. all files have complete coverage of applicable mechanic standards:

| file | standards checked | absent patterns |
|------|-------------------|-----------------|
| asShellEscapedSecret.ts | 8 | 0 |
| invokeKeyrack.ts (output) | 6 | 0 |
| invokeKeyrack.ts (source) | 6 | 0 |
| keyrack.get.output.acceptance.test.ts | 4 | 0 |
| keyrack.source.cli.acceptance.test.ts | 4 | 0 |

## conclusion

**role standards coverage check: PASS**

- all rule directories enumerated and checked
- all changed files reviewed line by line
- no absent patterns detected
- error handle, validation, tests, and types all present
