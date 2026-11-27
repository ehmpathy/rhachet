# F10 — transformer caselists and given-level thens keep the file shape

## .the fork
- a: recast `asHookDispatcherTimeoutSeconds.test.ts` into given/when/then, and nest the outcome thens
  of `hooks.dispatch.acceptance` [case2] and [case3] under a `when`
- b: keep the caselist (a pure transformer) and keep the given-level thens the file already uses

## .taken = b, why
`rule.prefer.data-driven` names a caselist the preferred frame for a transformer unit test, and
`rule.require.given-when-then` marks given/when/then only recommended at the unit grain. the
acceptance file's extant [case1] puts its thens at the given level; the new cases match their file.
each new case's action-outcome steps already sit under `when('[tN] …')`.

## .rework = clean, why
test-only reshapes in two files; no snapshot key a caller reads, no prod code.

## .confidence = 85%, why
two rules point two ways at the unit grain; the file's own shape breaks the tie.

## .where
`src/domain.operations/brains/dispatch/asHookDispatcherTimeoutSeconds.test.ts`,
`blackbox/cli/hooks.dispatch.acceptance.test.ts` [case2], [case3]
