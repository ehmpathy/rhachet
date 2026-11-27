# self review — has-consistent-conventions — 5.1.execution.from_vision

## the extant conventions i measured against

- `rhx grepsafe --pattern 'export const [A-Z_]+_TIMEOUT_MS' --path src` — ten bound constants.
  every one is `<AREA>_<THING>_TIMEOUT_MS`, the area a noun that names the module's own domain:
  `CLONE_CONNECT_TIMEOUT_MS` in `clone/socket/`, `CLONE_SOCKET_BIND_TIMEOUT_MS` in
  `clone/socket/constants.bind.ts`, `BRAIN_CLI_VERSION_PROBE_TIMEOUT_MS` in `enroll/`. values in
  `_`-grouped literals (`10_000`, `60_000`)
- `rhx grepsafe --pattern 'lookup' --path src/domain.operations/clone/socket/genCloneSocketServer.ts`
  — the gate's own comments already call this step the "`ss` lookup" / "cred lookup" (lines 63,
  322, 326, 331)
- the case labels in `genCloneSocketServer.integration.test.ts`

## each name, checked

| name | convention | holds? |
|---|---|---|
| `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS` | `<AREA>_<THING>_TIMEOUT_MS`; area `SOCKET` = `src/infra/socket/`; `PEER_CRED` = the function it bounds, `getSocketPeerCred`; `LOOKUP` = the extant term in the gate's comments | ✅ no new term. "probe" was the alternative, but in this domain "probe" names a CLIENT connection kind (baseline/observe probes) — to reuse it here would overload it |
| `60_000` | `_`-grouped literal | ✅ |
| `CLONE_AUTH_GATE_TIMEOUT_MS` | unchanged name; only its value is now derived | ✅ |
| `src/infra/socket/constants.ts` | a `constants.ts` beside the code it bounds, as `clone/socket/constants.ts` and `clone/constants.ts` | ✅ |
| `constants.test.ts` | collocated `<file>.test.ts`, like `actor/enrolled/constants.test.ts` | ✅ |
| `describe('clone socket auth bounds')` | describes the subject, as the enrolled peer's `describe('constants')` does; mine names which constants, since the file holds forty | ✅ |
| `[case19]` | the file's cases run `[case1]` … `[case18]`; 19 is the next free number | ✅ |
| `[t0]` in each `when` | the file's and the repo's when-label shape | ✅ |
| `SS_DELAY_SECONDS` | a scene-local `SCREAMING_CASE` constant with its unit as suffix, like the file's other scene constants | ✅ |
| `genTempDir({ slug: 'clone-auth-slow-ss' })` | kebab slug that names the scene, like `op-absent-path` in the 1password suite | ✅ |
| `pathBefore` | `[noun][adj]` order (`rule.require.order.noun_adj`), the same name the 1password suite's `withPath` uses | ✅ |

## found, not fixed — extant, outside the diff

the file holds TWO `[case18]` labels: `:1040` ("a screen read that THROWS…") and `:1321` ("a human
types mid-dispatch…"), and `[case17]` at `:1143` sits after `[case18]` at `:1040`. both predate
this branch. a renumber would move test names that a log or a fulcrum may cite, and it is no
part of this wish; `[case19]` takes the next number past the highest, so it collides with
neither. left as found.

## open questions for the wisher

none.
