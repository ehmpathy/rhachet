# self review — role-standards-coverage — 5.1.execution.from_vision

the question here is what is ABSENT that a standard asks to be present.

## the rule directories checked

mechanic `briefs/practices/`: `work.flow/diagnose` (clamp-edge-cases, test-covered-repairs),
`code.test/scope.coverage` (test-coverage-by-grain), `code.test/lessons.howto` (snapshots),
`code.prod/readable.comments` (headers), `code.prod/pitofsuccess.errors` (failfast in tests),
`code.prod/pitofsuccess.typedefs` (types). repo: `rule.forbid.dropped-behavioral-requirements`
(inventory).

## each practice that should be present

| practice | present? | evidence |
|---|---|---|
| a regression clamp committed with the fix (`rule.require.clamp-edge-cases`) | ✅ | `[case19]` |
| the clamp proved to bite: fix → green, revert → red, restore → green | ✅ | yield todo 7: red was `auth-denied` at 5095ms, the exact #678 trace |
| the defect clamped as a CLASS, not a point | ✅ | the class is "an outer bound at or below the inner bound it waits on". the 9s point covers the lower end against both old bounds; `constants.test.ts [case2]` pins the order itself, so any future value pair that inverts goes red — the class, not the instance |
| upper end of the wish's range (< 60s) | ✅ | `constants.test.ts [case1]` `=== 60_000` |
| integration grain for a change that crosses a process boundary (`rule.require.test-coverage-by-grain`) | ✅ | `getSocketPeerCred` shells out; it is proven at integration grain via the real server in `[case19]` (slow path) and the file's other cases (fast path — 59/59) |
| unit grain for pure values | ✅ | `constants.test.ts` |
| failfast on an absent test resource | ✅ | absent `ss` → `ConstraintError` with a portable hint |
| `.what` / `.why` on every new named unit | ✅ | the constant, both test suites |
| types | ✅ | `rhx git.repo.test --what types` green; both constants infer `number` from literal arithmetic, no annotation owed |
| snapshots | n/a | no output artifact changed: no reply reason, copy, or cli stdout moved (vision: "no new output") |
| error handle in prod | n/a, by design | no new error path. the exec's reject still flows to `awaitCloneAuthGate`, which already maps it to `deny` and traces it (`genCloneSocketServer.ts:352-353`). fail closed is the required behavior and is unchanged |
| validation | n/a | no new input; the bound is a constant |

## examined — a direct test for `getSocketPeerCred`

`rhx globsafe --pattern 'src/infra/socket/*'` → `asSocketPeerPidFromSs.test.ts` exists;
`getSocketPeerCred` has no test file of its own, before or after this branch.

held, not added: a direct `getSocketPeerCred.integration.test.ts` with a slowed `ss` would prove
the same fact as `[case19]` one layer lower, with the same fake and the same 9s, and the vision
chose the server grain on purpose ("a gate-only test would prove the parts and leave the wire
unproven"). both paths through `getSocketPeerCred` already run against the real `ss` in the server
suite. a second 9s test would add CI minutes and no new fact.

## examined — the requirements inventory

`rule.forbid.dropped-behavioral-requirements`: does this wish state a durable behavior that
belongs in `behavior/inventory.of=requirements._.md`? the wish's behavior ("a same-user say on a
loaded box is accepted") is held by `[case19]` and the order test, both committed beside the
code. it is a defect fix with its clamp, not a cross-behavior requirement another design could
narrow; the clamp is the guard. no inventory entry owed.

## gaps found

none.
