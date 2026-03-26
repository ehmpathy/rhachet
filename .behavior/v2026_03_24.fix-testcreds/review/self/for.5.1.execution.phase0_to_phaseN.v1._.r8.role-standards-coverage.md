# self-review: role-standards-coverage

## rule directories checked

i identified the mechanic briefs directories relevant to this code:

| directory | why relevant |
|-----------|--------------|
| `code.prod/evolvable.procedures` | jest env files are procedural code |
| `code.prod/pitofsuccess.errors` | ConstraintError usage, fail-fast |
| `code.prod/readable.comments` | .what/.why headers |
| `code.prod/readable.narrative` | code paragraph structure |
| `lang.terms` | variable and function names |

i confirmed i have not missed any rule categories by:
- read through the subdirectories under `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`
- `code.test` not relevant (we modified test infrastructure, not test code)
- `work.flow` not relevant (no release or refactor workflow)

## systematic coverage check

i walked through each relevant rule directory and checked if applicable patterns are present.

### code.prod/pitofsuccess.errors

**rule.require.fail-fast**: does the code fail fast on invalid state?

| error condition | guard present? | line |
|-----------------|----------------|------|
| keyrack locked | ✓ yes | 114-122 |
| keys absent | ✓ yes | 126-131 |
| keyrack command fails | ✓ yes | 143-156 |

**holds**: all error conditions throw ConstraintError immediately.

**rule.forbid.failhide**: does try/catch hide errors?

i examined lines 105-156. the try/catch:
- re-throws ConstraintError unchanged (line 145)
- wraps other errors with context and re-throws (lines 148-155)
- never swallows or ignores errors

**holds**: errors are wrapped with context, not hidden.

**rule.require.exit-code-semantics**: does error use correct exit code?

ConstraintError from helpful-errors uses exit code 2 for user-fixable constraints. i verified:
- `require('helpful-errors')` import at line 95
- `new ConstraintError(...)` at lines 115, 127, 148

**holds**: exit code 2 is provided by ConstraintError class.

### code.prod/readable.comments

**rule.require.what-why-headers**: does new code have .what/.why comment?

i checked each new code block:

| code block | .what present? | .why present? | lines |
|------------|----------------|---------------|-------|
| keyrack check | ✓ yes | ✓ yes | 86-94 |
| getAllAvailableIdentities | ✓ yes | ✓ yes | 50-57 |

**holds**: both new code blocks have .what/.why headers.

### code.prod/readable.narrative

**rule.require.narrative-flow**: are code paragraphs flat with comment titles?

i checked each paragraph:

| paragraph | comment title? | flat structure? |
|-----------|----------------|-----------------|
| spawn keyrack | ✓ line 97 | ✓ no nests |
| parse response | ✓ line 97 (implicit) | ✓ single line |
| locked guard | ✓ line 112 | ✓ if-throw only |
| absent guard | ✓ line 124 | ✓ if-throw only |
| inject secrets | ✓ line 133 | ✓ simple for loop |
| error wrap | ✓ lines 144, 147 | ✓ if-throw then throw |

**holds**: all paragraphs have comment titles and flat structure.

**rule.forbid.else-branches**: are there any else blocks?

i searched for `else` in the new code. none found. all conditionals use early return/throw pattern.

**holds**: no else branches.

### lang.terms

**rule.forbid.gerunds**: are there gerund variable names?

i listed all new variable names:

| variable | is gerund? | analysis |
|----------|------------|----------|
| `keyrackResult` | no | noun + noun |
| `keys` | no | noun |
| `keysLocked` | no | noun + adjective |
| `keysAbsent` | no | noun + adjective |
| `envVarName` | no | noun + noun + noun |
| `ownerPath` | no | noun + noun |
| `identity` | no | noun |

**holds**: no gerunds. all names follow noun or noun+adjective pattern.

**rule.require.order.noun_adj**: do composite names follow [noun][adj] order?

i checked composite variable names:

| variable | pattern | correct? |
|----------|---------|----------|
| `keysLocked` | keys + locked | ✓ [noun][adj] |
| `keysAbsent` | keys + absent | ✓ [noun][adj] |

**holds**: composite names follow noun_adj order.

### code.prod/evolvable.procedures

**rule.require.arrow-only**: are functions declared with arrow syntax?

i checked getAllAvailableIdentities at line 58:

```ts
const getAllAvailableIdentities = (owner?: string | null): string[] => {
```

**holds**: arrow function syntax used.

**rule.require.input-context-pattern**: does function follow (input, context?) pattern?

i checked getAllAvailableIdentities:
- takes single optional input `owner`
- no context needed (pure discovery function)

this is acceptable because the function has no dependencies to inject.

**holds**: function follows input pattern (no context needed for pure function).

## potential omissions i investigated

### did we forget type definitions?

question: are all external contracts typed?

i checked:
- `KeyrackGetResponse` type defined at lines 98-103 ✓
- all properties typed with union literals ✓

**holds**: external contract is typed.

### did we forget error context?

question: do all errors include actionable guidance?

i checked each ConstraintError:

| error | fix command? | note? | cause? |
|-------|--------------|-------|--------|
| locked (line 115) | ✓ yes | ✓ yes | n/a |
| absent (line 127) | n/a (list of fixes) | n/a | n/a |
| command fail (line 148) | ✓ yes | ✓ yes | ✓ yes |

**holds**: all errors include actionable guidance.

### did we forget documentation for hardcoded values?

question: are all hardcoded values explained?

i found two hardcoded values:
- `--owner ehmpath` — explained at line 92
- `--env test` — matches jest.integration.env.ts context

**holds**: hardcoded values are documented.

### did we forget passthrough documentation?

question: is CI passthrough behavior documented?

i checked line 93:
```
 * .note = keyrack already prefers passthrough (checks env vars first)
```

**holds**: passthrough is documented.

## reflection

### my verification approach

i walked through each rule directory methodically:
1. identify which rules could apply
2. check if the pattern is present
3. cite line numbers for verification

### patterns that could have been forgotten

| pattern | was it forgotten? | evidence |
|---------|-------------------|----------|
| .what/.why headers | no | lines 86-94, 50-57 |
| fail-fast guards | no | lines 112-131 |
| ConstraintError (not Error) | no | lines 115, 127, 148 |
| error context | no | fix, note, cause fields |
| type for contract | no | lines 98-103 |
| no gerunds | no | all nouns or noun+adj |
| no else branches | no | only if-throw guards |
| arrow functions | no | line 58 |

### why coverage is complete

the implementation includes all required patterns because:

1. **error handle is complete** — all error paths throw ConstraintError with actionable fix commands
2. **comments are complete** — .what/.why headers on all new code blocks
3. **types are complete** — KeyrackGetResponse defined inline
4. **names are correct** — no gerunds, follows noun_adj order
5. **structure is correct** — flat paragraphs, no else branches

### what i learned

coverage review differs from adherance review:
- adherance asks "is this done correctly?"
- coverage asks "is this done at all?"

for coverage, i must check each applicable rule and confirm the pattern exists. tables with line numbers make verification easy.

**no issues found** — mechanic role standards coverage is complete.
