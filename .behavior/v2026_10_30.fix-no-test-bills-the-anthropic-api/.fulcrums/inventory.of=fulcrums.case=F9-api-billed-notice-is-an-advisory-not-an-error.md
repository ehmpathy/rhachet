# F9 — the api-billed notice is an advisory, not an error

## .the fork
- (a) keep `🟡 this clone bills the anthropic api, since ANTHROPIC_API_KEY is set` on stderr, as an advisory with no error class
- (b) give it an error class (`✋ ConstraintError:`), per `rule.require.qualified-error-headers`
- (c) move it to stdout, or mark it `ℹ`

## .taken
(a). the clone starts and works; naught failed and enroll exits 0, so a `ConstraintError` header would claim a refusal that did not happen and teach a reader to ignore that class. `qualified-error-headers` scopes to human-read errors. stderr is the right channel: stdout of `enroll` is the clone's own tty and the json a machine parses, which a notice must not touch. `🟡` over `ℹ`: the notice names money spent, so it must not read as trivia beside the `ℹ` no-login line; `🟡` over `⚠️`, which `rule.prefer.emoji-language` forbids for new output (an ambiguous-width glyph that shifts the columns to its right).

## .what (a) gives up
one more opener glyph beside the two error classes.

## .rework
clean: one string in `asBrainAuthApiBilledLine`, its unit snap, `ENROLL_API_BILLED_NOTICE_PATTERN`, and the enroll snaps.

## .confidence = 80%

## .where
`src/domain.operations/brain/auth/asBrainAuthApiBilledLine.ts`; `blackbox/.test/infra/invokeRhachetCliBinary.ts` (`ENROLL_API_BILLED_NOTICE_PATTERN`).
