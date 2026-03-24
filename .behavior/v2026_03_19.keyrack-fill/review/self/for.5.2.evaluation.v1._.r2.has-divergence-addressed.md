# self-review: has-divergence-addressed

## question

> for each divergence: did you address it properly?
> is the rationale credible? would a skeptic accept it?

## divergence-by-divergence review

### 1. getOnePrikeyForOwner removed

**rationale:** DAO already has discovery built in via `daoKeyrackHostManifest.get()`. to extract a prikey finder would duplicate logic.

**skeptic test:** is this laziness or improvement?

- the blueprint proposed a new `getOnePrikeyForOwner` to find which prikey works for each owner
- actual implementation passes `prikeys` array to `genKeyrackHostContext({ owner, prikeys })`
- `genKeyrackHostContext` already does: discover prikeys + merge supplied + trial decryption
- to create a separate function would duplicate this logic or just wrap it

**verdict:** improvement. less code, same behavior, reuses extant capability.

### 2. genMockKeyrackRepoManifest removed

**rationale:** inline mocks in tests proved clearer and more maintainable.

**skeptic test:** is this laziness or improvement?

- blueprint proposed shared test fixture
- actual tests define mocks inline
- each test is self-contained, no fixture lookup required
- follows codebase pattern (other keyrack tests do the same)

**verdict:** improvement. locality > shared fixtures for test clarity.

### 3. test file named .integration.test.ts instead of .play.integration.test.ts

**rationale:** codebase convention is `.integration.test.ts` without `.play.` suffix.

**skeptic test:** did I just not follow the blueprint?

- checked codebase: no `.play.integration.test.ts` files exist
- all integration tests use `.integration.test.ts`
- `.play.` would be inconsistent with extant patterns

**verdict:** correct. blueprint used incorrect convention; adopted extant patterns.

### 4. withStdoutPrefix added

**rationale:** needed for tree-format output with nested set stdout.

**skeptic test:** could this cause problems later?

- utility is simple: prefixes each line of child process stdout
- enables tree-formatted output without need to change setKeyrackKey
- has unit tests
- general-purpose, may be reused

**verdict:** required. blueprint's design implied nested output; this enables it.

### 5. test fixtures added (mockPromptHiddenInput, withSpyOnStdout)

**rationale:** enable isolated tests for interactive prompts and stdout capture.

**skeptic test:** is this over-engineered?

- mockPromptHiddenInput: returns controlled values for hidden prompts
- withSpyOnStdout: captures console output for assertions
- both are small, focused utilities
- enable proper integration tests without manual input

**verdict:** required. to test interactive CLI without these would be fragile.

### 6. blocked key detection added (--repair, --allow-dangerous)

**rationale:** discovered that keys can be blocked (dangerous tokens). fill must handle this gracefully.

**skeptic test:** is this scope creep?

- blocked key detection is part of extant keyrack behavior
- without --repair/--allow-dangerous, fill would fail unexpectedly on blocked keys
- fail-fast with hint matches keyrack's error pattern
- user can choose: repair (overwrite) or allow (accept as-is)

**verdict:** required. handles real edge case. fail-fast pattern maintains user awareness.

## conclusion

all divergences have strong rationale. no lazy shortcuts. each change either reduces duplication, follows conventions, or handles discovered requirements.
