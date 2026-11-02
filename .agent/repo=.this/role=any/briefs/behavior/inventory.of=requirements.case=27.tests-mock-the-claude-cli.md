# requirement: only the essential smoketests call anthropic; every other test runs on a mock claude cli

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- every test whose subject is not the real anthropic contract runs on a mock of the `claude` cli,
  and spends no anthropic tokens
- the only tests that reach the anthropic api are the essential smoketest acceptance tests, and each
  one runs on haiku

## .why

a real-claude test costs tokens, seconds, and flakes on every run. most tests prove rhachet's own
mechanism (enroll, the pty, the socket, the dispatch, the transcript read). a mock claude proves that
mechanism just as well. only the integration with a real claude needs a real claude.

## .clamp

owed — `.behavior/v2026_11_01.fix-tests-mock-the-claude-cli/`

## .proof

owed — `.behavior/v2026_11_01.fix-tests-mock-the-claude-cli/`

## .source

the wisher, 2026-11-01 (`v2026_11_01.fix-tests-mock-the-claude-cli` wish).
