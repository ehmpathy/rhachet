# self review — has-consistent-mechanisms — 5.1.execution.from_vision

## what i searched

- `rhx globsafe --pattern 'src/infra/**/constants*.ts'` — one hit, my own. no extant infra
  constants file to fold into
- `rhx grepsafe --pattern 'process\.env\.PATH = ' --path src` — three suites swap PATH: mine,
  `vaultAdapter1Password.integration.test.ts`, `sshPrikeyToAgeIdentity.integration.test.ts`
- `rhx grepsafe --pattern "split\(':'\)|split\(delimiter\)|isCommandOnPath|findBinOnPath|getBinPath" --path src`
  — one extant PATH walker, `getAllBrainCliPathResolutions.ts:59-84`

## found, and fixed

1. **the clamp split PATH on a literal `':'`.** the extant walker splits on `delimiter` from
   `node:path` and skips empty entries (`getAllBrainCliPathResolutions.ts:70-71`). the clamp now
   does the same: `.split(delimiter).filter((dir) => dir !== '')`, and the swap joins with
   `delimiter` too
2. **the clamp made the fake executable with a separate `chmodSync`.** the extant fake-binary
   writer passes `{ mode: 0o755 }` to `writeFileSync` (`vaultAdapter1Password.integration.test.ts:41`).
   the clamp now does the same; the `chmodSync` import is gone

3. **the unit test skipped the `when` layer.** `rhx globsafe --pattern 'src/**/constants*.test.ts'`
   found two peers. `actor/enrolled/constants.test.ts:20-22` nests `given('[caseN]') → when('[t0]')
   → then`; `keyrack/constants.test.ts` is a predicate caselist, which fits a predicate, not two
   scalar bounds. `clone/socket/constants.test.ts` now nests a `when('[t0]')` in each given, like
   its enrolled peer. rerun: 2 passed; format check green

clamp rerun after 1 and 2: `rhx git.repo.test --what integration --scope 'path://src/domain.operations/clone/socket/genCloneSocketServer' --scope 'name://case19' --mode apply`
→ 5 passed, 24s.

## examined, and held

- **reuse `getAllBrainCliPathFiles`?** no. it is a private, unexported helper in the enroll
  domain, capped by `BRAIN_CLI_PATH_RESOLUTION_CAP` and paired with a version probe. to export it
  for one test would couple the clone socket suite to enroll internals. the clamp's lookup is
  four lines and now follows the walker's conventions
- **reuse `withPath` from the 1password suite?** no. it is local to that file, not shared infra,
  and wraps one call. the clamp needs PATH held across the whole server lifecycle — a
  `useBeforeAll` / `afterAll` pair — so the wrapper shape does not fit. two suites with
  different shapes do not yet make a shared fixture (`rule.prefer.wet-over-dry`: wait for three)
- **a new `src/infra/socket/constants.ts`.** it mirrors the extant
  `src/domain.operations/clone/socket/constants.ts`: one module per area for its bounds, each
  bound a named `_MS` export with a `.what`/`.why` docblock. the lookup bound lives with the
  lookup it bounds, in infra, and the domain imports it downward (`rule.require.directional-deps`).
  to place it in the clone constants instead would have infra import from a domain
- **the bound itself** rides node's own `exec` `timeout` option, which the code already used.
  no new timer, no `AbortController`, no wrapper (F7 measured that the option settles the
  pipeline at the bound)
- **the gate** still goes through the extant `awaitCloneAuthGate({ check, timeoutMs })`; only the
  value passed changed
- **the clamp's scene** reuses the file's extant `genServerWithCapture()`, `sayClone`, and the
  `traced` capture other cases already read; the fail-fast on an absent `ss` throws
  `ConstraintError` with a hint, as the rest of the file does
