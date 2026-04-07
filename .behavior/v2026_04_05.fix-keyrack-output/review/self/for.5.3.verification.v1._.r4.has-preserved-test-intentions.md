# self-review: has-preserved-test-intentions (fourth pass — deeper verification)

## the question

double-check: did you preserve test intentions?

- what did this test verify before?
- does it still verify the same behavior after?
- did you change what the test asserts, or fix why it failed?

forbidden:
- weaken assertions to make tests pass
- remove test cases that "no longer apply"
- change expected values to match broken output
- delete tests that fail instead of fix code

## the review

### verification method

used `git show main:<file>` to confirm whether test files exist on main branch.

### new test files confirmed

| file | git show result | conclusion |
|------|-----------------|------------|
| keyrack.get.output.acceptance.test.ts | `fatal: path '...' does not exist` | **new file** |
| keyrack.source.cli.acceptance.test.ts | `fatal: path '...' does not exist` | **new file** |
| asShellEscapedSecret.test.ts | `fatal: path '...' does not exist` | **new file** |

**why it holds:** git confirms these files do not exist on main. they are net-new tests for new functionality. no prior test intentions to preserve.

### modified test file: keyrack.set.acceptance.test.ts

ran `git diff main -- blackbox/cli/keyrack.set.acceptance.test.ts`:

```diff
@@ -282,4 +282,110 @@ describe('keyrack set', () => {
       });
     });
   });
+
+  /**
+   * [uc-multiline] multiline json via stdin roundtrips correctly
```

- diff begins at line 282, after all prior tests
- entire change is an addition (case5 test block)
- no lines removed (no `-` prefix lines)
- no prior assertions modified

**why it holds:** the change is pure addition. it appends after the prior test content. cases 1-4 remain untouched.

### verification: no removed expect() calls

searched diff for removed assertion lines:

```bash
git diff main -- '*.test.ts' | grep '^-.*expect'
```

result: empty (no removed assertions)

**why it holds:** no `expect()` lines were removed from any test file in this behavior.

### why this matters

the verification stone asks: did we preserve test intentions?

for new files: no prior intentions exist — these are new tests for new features.

for modified files: only keyrack.set.acceptance.test.ts was modified, and the modification is pure addition after prior content.

## found concerns

none.

| check | result |
|-------|--------|
| new test files overwrite prior | no (files are new) |
| modified tests weaken assertions | no (only additions) |
| assertions removed | no (0 removed expect lines) |
| expected values changed | no (no modifications to prior tests) |

## conclusion

**preserved test intentions check: PASS**

- new test files confirmed via `git show main:<file>` — they do not exist on main
- keyrack.set.acceptance.test.ts modification is pure addition (case5)
- 0 assertions removed from any test file
- all prior test intentions intact
