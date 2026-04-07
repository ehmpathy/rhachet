# self-review: role-standards-adherance

## the question

review for adherance to mechanic role standards.

## rule categories checked

briefs directories relevant to this code:
- `code.prod/evolvable.procedures/` — function patterns
- `code.prod/evolvable.domain.operations/` — operation patterns
- `code.prod/pitofsuccess.errors/` — error patterns
- `code.prod/readable.narrative/` — code clarity
- `code.prod/readable.comments/` — comment patterns
- `lang.terms/` — term conventions
- `code.test/` — test patterns

## the review

### rule: require-arrow-only

**brief:** enforce arrow functions for procedures; disallow function keyword

**check (invokeKeyrack.ts):**
- all new code uses arrow functions in `.action(async (opts) => { ... })`
- no `function` keyword introduced

**why it holds:** pattern matches extant keyrack command structure.

### rule: require-input-context-pattern

**brief:** procedure args must be (input, context?)

**check (asShellEscapedSecret.ts):**
```ts
export const asShellEscapedSecret = (input: { secret: string }): string => { ...
```

**why it holds:** follows (input) pattern. no context needed for pure transformer.

### rule: require-failfast

**brief:** use early returns and BadRequestError for invalid state

**check (invokeKeyrack.ts):**
- line 370-372: `if (outputMode === 'value' && !opts.key) { throw new BadRequestError(...) }`
- line 530-534: `if (opts.strict && opts.lenient) { throw new BadRequestError(...) }`

**why it holds:** validation at function entry with clear error messages.

### rule: require-exit-code-semantics

**brief:** exit 0 = success, exit 2 = constraint error

**check (invokeKeyrack.ts):**
- line 472: `process.exit(2)` for not granted
- line 577: `process.exit(2)` for strict mode failure

**why it holds:** exit 2 for constraint errors (user must fix). no exit 1 (malfunction) introduced.

### rule: require-what-why-headers

**brief:** require jsdoc .what and .why for every named procedure

**check (asShellEscapedSecret.ts):**
```ts
/**
 * .what = transform secret value for safe shell eval
 * .why = prevents command injection in export statements
 */
export const asShellEscapedSecret = ...
```

**why it holds:** .what and .why present.

### rule: forbid-gerunds

**brief:** no gerunds (-ing as nouns)

**check:**
- asShellEscapedSecret: no gerunds in function name
- comments: checked for gerunds, none found

**why it holds:** function named with verb+noun pattern, not gerund.

### rule: require-narrative-flow

**brief:** structure logic as flat linear code paragraphs — no nested branches

**check (invokeKeyrack.ts source command):**
```ts
// validate: --owner is required
if (!owner) { throw ... }

// validate: --strict and --lenient are mutually exclusive
if (opts.strict && opts.lenient) { throw ... }

// default to strict mode
const isLenient = opts.lenient ?? false;
```

**why it holds:** flat guard clauses, no nested if/else.

### rule: forbid-else-branches

**brief:** never use else or if-else

**check:** no `else` introduced in new code. all logic uses early returns/throws.

**why it holds:** guards use if + throw/return, not if-else.

### rule: require-given-when-then (tests)

**brief:** use jest with test-fns for given/when/then tests

**check (acceptance tests):**
```ts
given('[case1] key granted via env passthrough', () => {
  when('[t0] --value outputs raw secret', () => {
    then('exits with status 0', () => { ... });
  });
});
```

**why it holds:** both test files follow given/when/then pattern with proper labels.

### rule: require-snapshots (tests)

**brief:** use snapshots for output artifacts

**check:**
- keyrack.get.output.acceptance.test.ts: `expect(asSnapshotSafe(result.stdout)).toMatchSnapshot()`
- keyrack.source.cli.acceptance.test.ts: `expect(asSnapshotSafe(result.stdout)).toMatchSnapshot()`

**why it holds:** snapshots used for stdout verification.

## found concerns

none. all code follows mechanic role standards:
- arrow functions only
- input pattern for transformers
- failfast with BadRequestError
- exit code semantics (2 for constraints)
- .what/.why headers
- no gerunds
- flat narrative flow
- no else branches
- given/when/then tests
- snapshots for output

## conclusion

**role standards adherance check: PASS**

- all mechanic briefs checked
- no violations found
- code follows established patterns
