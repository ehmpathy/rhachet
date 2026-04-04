# self-review r1: has-questioned-deletables

## features review

### feature 1: extract org from slug (line 257)

**traces to requirement?** yes — the wisher explicitly showed the mismatch:
- prompt shows `ahbode.prod.USPTO_ODP_API_KEY`
- lookup expects `rhight.prod.USPTO_ODP_API_KEY`

this is the core bug. the fix is required.

**verdict**: cannot delete ✓

---

### feature 2: add integration test for cross-org extends

**traces to requirement?** yes — verifies the fix works and prevents regression.

the wisher showed a real-world scenario (ahbode extends rhight). a test that reproduces this scenario ensures the fix is correct and stays correct.

**verdict**: cannot delete ✓

---

## components review

### component 1: filediff tree

**can this be removed?** no — shows exactly which files change.

**simplest version?** already minimal:
- one file change (fillKeyrackKeys.ts)
- one test file change (fillKeyrackKeys.integration.test.ts)

**verdict**: holds ✓

---

### component 2: codepath tree

**can this be removed?** could argue it's redundant with filediff tree.

**why it holds**: shows the call flow and context around the fix. helps implementer understand where the fix applies within the larger function.

**verdict**: holds ✓ (brief, adds context)

---

### component 3: test coverage section

**can this be removed?** no — provides implementation guidance.

**simplest version?** the test example is detailed but necessary. it shows:
- how to set up cross-org extends fixtures
- which assertions verify the fix

**verdict**: holds ✓

---

### component 4: contracts section

**can this be removed?** no — shows before/after code.

**simplest version?** already minimal. shows only the changed line with context.

**verdict**: holds ✓

---

### component 5: maintainability section

**can this be removed?** could argue it's optional.

**why it holds**: explains that this fix follows extant patterns (`getKeyrackKeyGrant` already extracts org from slug). this helps reviewers understand the fix is consistent with the codebase.

**verdict**: holds ✓ (brief, 4 lines)

---

### component 6: edgecases section

**can this be removed?** could argue it's optional.

**why it holds**: documents what happens for key-in-both, env=all, etc. these are questions a reviewer would ask. answering upfront saves time.

**verdict**: holds ✓ (brief table)

---

## summary

| element | verdict | reason |
|---------|---------|--------|
| fix: extract org from slug | cannot delete | core bug fix, explicitly requested |
| test: cross-org extends | cannot delete | verifies fix, prevents regression |
| filediff tree | holds | minimal, shows what changes |
| codepath tree | holds | brief, adds call flow context |
| test coverage | holds | implementation guidance |
| contracts | holds | before/after code |
| maintainability | holds | explains pattern alignment |
| edgecases | holds | preempts reviewer questions |

the blueprint is already minimal:
- one code change (one line)
- one test case

no deletables found.
