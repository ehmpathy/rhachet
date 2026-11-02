# F12 — the drift scan exempts the access's own test file

## .the fork

the drift check flags every test file whose text holds an access signature and that is off the
registry. the access's own wire clamp (`genRealClaudeAccess.integration.test.ts`) must call the
access to prove the fence refuses it, so its text holds a signature.

| option | what it does | the cost |
|---|---|---|
| A. the scan exempts that one file, `SMOKETEST_SCAN_EXEMPT` | the fence's own test may name the access; every other test file, its neighbours included, is scanned | one file is outside the static check |
| A'. the scan skips the whole `blackbox/.test/infra/smoketest/` dir | the same, wider | a future real-claude test in that dir escapes the check |
| B. the clamp calls the access by an indirect name built at runtime | no exemption | a test written to dodge its own check; it reads as a trick |
| C. no wire clamp; trust the unit test of the pure fence | no exemption | the fence call can be deleted from the access with every test green |

## .taken

A. a file, never a dir: a reviewer showed the dir form lets a new test beside it escape. the other
drift tests build their fixture text from each signature's `sample`, so no other file needs the
exemption. the exempt file still meets the fence and the tripwire at runtime. the drift unit test
asserts the exempt file is skipped and a second file in its dir is not.

## .rework

clean — one constant.

## .confidence

85%.

## .where

`3.3.1.blueprint.product.yield.md` — `.codepath tree`, signatures and the drift check.

## .verdict

best-guessed; narrowed from A' to A after review.
