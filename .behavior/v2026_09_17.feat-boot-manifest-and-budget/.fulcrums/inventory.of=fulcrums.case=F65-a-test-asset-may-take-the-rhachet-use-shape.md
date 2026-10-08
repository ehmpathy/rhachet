# F65 — may a test asset take the `rhachet.use.ts` shape, to exercise a path that still ships?

- **raised** = 2026-10-02, at `5.1.execution.from_vision`, `review.peer i024` — `repo-rules` nitpick.1
- **rework** = clean
- **status** = OPEN — **yes**
- **confidence** = **80%**

## .the fork, stated fairly

`src/.test/example.use.repo/example.rhachet.use.plainThrow.ts` is a new file in the
`rhachet.use.ts` shape. `rule.forbid.rhachet-use-ts` names new rhachet.use.ts files a blocker, and
its scope names test assets.

| | **keep the explicit-config fixture** (taken) | **rebuild on the convention path** |
|---|---|---|
| what `invoke.unclassifiedThrow` `[case1]` proves | a throw from `invoke`'s own body, via the explicit-config load (`getRoleBySpecifier`, `isExplicit`) | 🔴 the convention path never raises from `invoke`'s body, so the case proves naught |
| the rule's intent | consumers stop to author new configs | same |

## .the call, and why

**keep it.** the explicit-config load path still ships, and the one way to test a path is to feed
it its input shape. the fixture lives under `src/.test/`, is never a consumer config, and its own
`.note` names why. the peer over-budget fixture was rebuilt on the convention path because its
test does not need the explicit path; this one does.

## .why the confidence is 80%

the open question is whether the rule should state a carve-out for tests of a deprecated path
that still ships. that is a rule edit, not a code edit.

## .rework

clean — delete the fixture and `[case1]` once the explicit-config path is retired.
