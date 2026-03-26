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

## coverage analysis

this review asks: are there patterns that should be present but are absent?

### patterns that should be present

| pattern | applies to | present? |
|---------|-----------|----------|
| .what/.why comment | new code blocks | ✓ lines 86-94 |
| fail-fast guard | error conditions | ✓ lines 112-131 |
| ConstraintError | user-fixable errors | ✓ used throughout |
| arrow functions | new functions | ✓ no function keyword |
| narrative flow | procedural code | ✓ flat paragraphs with comments |
| noun-adj order | variable names | ✓ keysLocked, keysAbsent |

### patterns that could have been omitted

i looked for cases where a pattern should exist but might have been forgotten:

**1. error wrap with context**

question: did we wrap errors with sufficient context?

check: lines 143-156 wrap unknown errors with:
- actionable fix command
- note about expected owner
- cause from original error

**holds**: error wrap includes all necessary context.

**2. type definition for external contract**

question: did we define types for the keyrack response?

check: lines 98-103 define `KeyrackGetResponse` type inline.

**holds**: type is present and matches the contract.

**3. comment on hardcoded values**

question: did we explain why `--owner ehmpath` is hardcoded?

check: line 92-93 include `.note = hardcoded to --owner ehmpath because we expect only ehmpaths to work in this repo`

**holds**: hardcoded value is documented with reason.

**4. passthrough documentation**

question: did we document CI passthrough behavior?

check: line 93 includes `.note = keyrack already prefers passthrough (checks env vars first)`

**holds**: passthrough behavior is documented.

**5. guard clause comments**

question: did we add comments before guard clauses?

check:
- line 112: `// check if any keys are locked`
- line 124: `// check if any keys are absent`
- line 133: `// inject unlocked secrets into process.env`

**holds**: each code paragraph has a comment title.

## daoKeyrackHostManifest coverage

### patterns that should be present

| pattern | applies to | present? |
|---------|-----------|----------|
| .what/.why comment | new/modified function | ✓ lines 50-57 |
| arrow function | function definition | ✓ line 58 |
| fallback order docs | owner path check | ✓ line 56 in header |
| skip on error | identity conversion | ✓ lines 100-101 |

### patterns that could have been omitted

**1. document fallback order**

question: did we document that owner path is checked last?

check: line 56 says `.note = then checks owner-specific path as fallback (~/.ssh/$owner)`

**holds**: fallback order is documented.

**2. safe error handle in try/catch**

question: does the try/catch around identity conversion handle errors safely?

check: lines 97-102 use try/catch with empty catch block. the comment says `// skip if conversion fails`.

**holds**: error is intentionally skipped because this is trial-discovery (try many paths, use what works).

## reflection

### what i looked for

i focused on patterns that could have been omitted:
- comments on non-obvious decisions
- types for external contracts
- error wrap with context
- guard clause structure

### why coverage is complete

**error context is complete:**
- fix command tells user exactly what to run
- note explains why ehmpath is expected
- cause preserves original error for debug

**documentation is complete:**
- .what/.why header describes purpose
- .note explains hardcoded values
- .note explains passthrough behavior
- each code paragraph has comment title

**types are complete:**
- KeyrackGetResponse type defined inline
- all properties typed with union for status

### potential gaps i investigated

| potential gap | investigation | outcome |
|---------------|---------------|---------|
| absent test coverage | vision says "manual verification" | no tests required per spec |
| absent validation | keyrack get returns JSON | JSON.parse will throw on invalid |
| absent timeout | execSync defaults | acceptable for sync test setup |
| absent retry | keyrack unlock is one-time | no retry needed |

### what i learned

coverage review asks "what is absent?" not "what is incorrect?". the question is completeness: did we include all that should be there? for this behavior, the coverage is complete because:

1. all error paths throw ConstraintError with fix commands
2. all hardcoded values are documented with reasons
3. all code paragraphs have comment titles
4. the type for the external contract is defined

**no issues found** — mechanic role standards coverage is complete.
