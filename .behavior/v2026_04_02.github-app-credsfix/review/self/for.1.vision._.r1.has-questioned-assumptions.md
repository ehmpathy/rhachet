# self-review: has-questioned-assumptions

## assumption 1: "truncation happens at first newline"

**what do we assume?** that the stdin read stops at the first `\n` character.

**evidence?**
- the stored secret is `"{"` — just the first character of the json
- jq outputs PRETTY-PRINTED json by default (multiple lines)
- the first line of pretty-printed json is just `{`
- ergo, only the first line was read

**what if opposite were true?**
if truncation happened elsewhere (e.g., at first `\n` inside a string value), we'd see more content stored — at least the full first json line up to `"privateKey": "-----BEGIN...`.

**verdict**: holds. the evidence strongly supports "read only first line" behavior.

**key insight**: the bug is not about `\n` escape sequences inside json strings. it's about literal newlines in the multi-line jq output. the stdin reader probably uses `readline()` instead of `read()`.

## assumption 2: "jq output is correct"

**evidence?** user ran jq inline and showed the output. the json is valid and complete.

**what if opposite were true?** if jq output were wrong, the user's inline test would have shown it. they verified jq → the json was correct.

**verdict**: holds.

## assumption 3: "the bug is in stdin read, not encryption/storage"

**what do we assume?** that the truncation happens before data reaches encryption.

**evidence?**
- empty string (`""`) for privateKey → json stored correctly
- real RSA key → only `"{"` stored
- both use same encryption/storage path
- only difference is the stdin content

**what if opposite were true?**
- if encryption truncated, we'd see consistent truncation for both empty and full keys
- if storage truncated, same — both would fail similarly

**counterexample?**
- could there be a size limit? RSA keys are ~1.6KB. unlikely to hit limits.
- could there be a character encode issue? possible but less likely than newline issue.

**verdict**: holds. stdin read is the most parsimonious explanation.

## assumption 4: "we need acceptance tests with real RSA-like content"

**did the wisher say this?** yes — "lets cover with unit and acceptance tests"

**what if we skip this?** regression could recur silently.

**verdict**: holds. the wisher explicitly requested tests.

## hidden assumption found: "compact json would work"

**what if we assume?** that `jq -c` (compact output) would work because it produces single-line json.

**is this true?** likely yes — but we should NOT rely on this as a workaround. the fix should handle multi-line stdin correctly.

**action**: not an issue for the vision, but a useful data point for diagnosis. we can test this hypothesis to confirm root cause.

## summary

all assumptions hold under scrutiny. the key insight from this review:

**the bug is about literal newlines in multi-line stdin (jq pretty print), not about `\n` escape sequences inside json string values.**

this points to `readline()` vs `read()` as the likely culprit in the stdin handler.
