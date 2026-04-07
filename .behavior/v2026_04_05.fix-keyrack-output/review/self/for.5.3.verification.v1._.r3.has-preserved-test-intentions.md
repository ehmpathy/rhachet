# self-review: has-preserved-test-intentions

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

### test files changed

ran `git diff main --stat -- '*.test.ts'`:

| file | change | nature |
|------|--------|--------|
| keyrack.get.output.acceptance.test.ts | +427 | **new file** |
| keyrack.source.cli.acceptance.test.ts | +721 | **new file** |
| asShellEscapedSecret.test.ts | +81 | **new file** |
| keyrack.set.acceptance.test.ts | +106 | **add case5** |
| asKeyrackKeyOrg.test.ts | +28 | **new test** |
| fillKeyrackKeys.integration.test.ts | +87 | **new test** |

**why it holds:** all keyrack-related test changes are additions. no extant test was removed, weakened, or had its intention changed.

### detailed analysis: keyrack.set.acceptance.test.ts

the only modified file is keyrack.set.acceptance.test.ts.

ran `git diff main -- blackbox/cli/keyrack.set.acceptance.test.ts`:

```diff
@@ -282,4 +282,110 @@ describe('keyrack set', () => {
       });
     });
   });
+
+  /**
+   * [uc-multiline] multiline json via stdin roundtrips correctly
+   * fixes bug where only first line was read from piped stdin
+   */
+  given('[case5] multiline json via stdin', () => {
```

- change starts after line 282, after extant tests
- entire change is a new case5 test block
- no extant assertions removed
- no extant assertions modified

**why it holds:** this is pure addition. cases 1-4 are untouched.

### verification: no removed assertions

searched diff for removed assertions (lines with `-` prefix that contain `expect`):

| file | removed expect lines |
|------|----------------------|
| keyrack.get.output.acceptance.test.ts | 0 (new file) |
| keyrack.source.cli.acceptance.test.ts | 0 (new file) |
| keyrack.set.acceptance.test.ts | 0 (only additions) |
| asShellEscapedSecret.test.ts | 0 (new file) |

**why it holds:** no `expect()` assertions were removed from any keyrack test file.

### other test files in diff

other test files in the diff (invokeAct, genActor, enweaveOneRoute, etc.) are unrelated to this behavior. they were changed in the branch for other reasons but are not part of the keyrack output modes implementation.

**scope:** this review covers only keyrack-related test files.

## found concerns

none. test intentions preserved:

| check | result |
|-------|--------|
| extant tests removed | no |
| assertions weakened | no |
| expected values changed | no |
| tests deleted instead of fix code | no |

## conclusion

**preserved test intentions check: PASS**

- all keyrack test changes are additions
- no extant keyrack test was modified
- keyrack.set case5 is a new test, not a modified extant test
- 0 assertions removed from keyrack test files
