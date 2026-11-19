# F26 — the pure transformer units stay data-driven caselists

## .the fork

peer review 5.3 r007 nitpick.1 asks fourteen unit files that test pure transformers
(`asTimeoutSecondsOfBrainHook`, `asHookDispatchManifestText`, `isHookMatcherPortable`, …) to move from a
`TEST_CASES.map(… test(…))` caselist under `describe` to the given/when/then hierarchy.

- **(a)** convert all fourteen to given/when/then
- **(b)** keep the caselists

## .taken

(b). `rule.prefer.data-driven` (mechanic) prefers a caselist for exactly this shape, a transformer
unit; `rule.require.given-when-then` names unit tests as recommended, not required. a caselist of
`{ description, given, expect }` reads each input beside its output on one screen. the files that
hold setup, an action and several outcomes (`asSettingsWithHookDispatchers`, the integration tests,
the acceptance suites) already use given/when/then with `[caseN]`/`[tN]` labels.

## .rework

clean. each file converts on its own; no caller reads test names.

## .confidence

85%. the two mechanic rules point opposite ways for units; the director may prefer one shape.

## .where

`src/domain.operations/**/as*.test.ts`, `is*.test.ts` named in the r007 report

## .verdict

open, for the director at the pr.
