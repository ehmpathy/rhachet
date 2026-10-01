# F9 — the journey's local failures are an unfunded test key, not this diff

## .the fork

`brain-dir-boot.journey.acceptance.test.ts` fails 16 of 79 locally. (a) hold the stone until they pass locally; (b) pass the stone with the cause cited, and let ci's run judge them.

## .taken, and why

(b).

- the logged cause is `Credit balance too low · Add funds` on the test `ANTHROPIC_API_KEY`, in each failed `claude -p` launch (the yield cites the log path)
- the failed launches are bare `claude -p` calls in the journey's own harness. they never pass through rhachet's spawn env, so `CLAUDE_SECURESTORAGE_CONFIG_DIR` — the whole diff — cannot reach them
- `bootChars: 19039`, so a context-window cause is ruled out
- the last green run of this suite is release/v1.48.1 on 2026-09-26, run 36220484628
- to fund the key is a human lever. no change a driver may make closes it

if ci's journey goes red on the same message, the ask to the human is: fund the test key.

## .rework

clean — a rerun once the key holds credit.

## .confidence, and why it is not higher

85%. the cause is read from the record, not inferred. a second defect may hide behind the credit wall until the key is funded; ci's run is where it would surface.

## .where

`5.1.execution.from_vision.yield.md` › verification; peer concerns r008 nitpick.1, r009 blocker.3.
