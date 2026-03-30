# self-review: has-questioned-requirements

## requirements examined

### requirement 1: "after unlock, get should return the key"

**who said this was needed?**
the wisher. they ran unlock and expected get to work.

**what evidence supports this requirement?**
- the extant acceptance tests prove this works with `os.direct` vault
- the keyrack spec briefs define this exact flow
- the wish shows the user's expectation was violated

**what if we didn't do this?**
keyrack would be useless for sudo keys. the unlock/get pattern is the core contract.

**is the scope too large, too small, or misdirected?**
scope is correct. the issue is narrow: sudo keys don't work after unlock in certain conditions.

**could we achieve the goal in a simpler way?**
no. the current implementation is already simple. the issue is a defect, not a design flaw.

**verdict**: this requirement holds. it's the core functionality.

---

### requirement 2: "add negative TTL detection"

**who said this was needed?**
i proposed this in the vision. the -270m output suggests TTL calculation failed.

**what evidence supports this requirement?**
the wisher's output showed `-270m` which is unclear. detect and fail fast would help.

**what if we didn't do this?**
users would see negative TTL and not understand why get fails.

**is the scope too large, too small, or misdirected?**
might be misdirected. the -270m is a symptom, not the root cause. detect does not fix the bug.

**could we achieve the goal in a simpler way?**
yes — find and fix the root cause. the TTL calculation code looks correct. the issue is likely elsewhere.

**verdict**: this requirement is secondary. prioritize root cause analysis first.

---

### requirement 3: "add 1password integration tests"

**who said this was needed?**
i proposed this. the user used 1password vault.

**what evidence supports this requirement?**
- extant tests use `os.direct` vault
- 1password adapter has no test coverage
- the issue may be 1password-specific

**what if we didn't do this?**
we might ship a fix that doesn't cover the actual edge case.

**is the scope too large, too small, or misdirected?**
possibly misdirected. the extant acceptance tests cover the roundtrip. the 1password adapter is simple (just calls `op read`). the bug is likely in the daemon or CLI, not the adapter.

**could we achieve the goal in a simpler way?**
yes — reproduce the exact scenario with the extant os.direct tests. if those pass, the issue is environmental or configuration-related.

**verdict**: this requirement is deferred. focus on the core issue first.

---

### requirement 4: "daemon restart mid-session test"

**who said this was needed?**
i proposed this to cover the stale bytecode scenario.

**what evidence supports this requirement?**
the wisher may have had a stale daemon. this would explain the -270m.

**what if we didn't do this?**
users might hit the same issue without knowing daemon prune exists.

**is the scope too large, too small, or misdirected?**
misdirected. the real fix is documentation or auto-detection, not a test. the test would just confirm known behavior.

**could we achieve the goal in a simpler way?**
yes — add a diagnostic to unlock output that warns if daemon bytecode is stale.

**verdict**: this requirement is nice-to-have. not critical for the fix.

---

## summary of findings

| requirement | status | reason |
|-------------|--------|--------|
| after unlock, get should return key | **holds** | core functionality |
| negative TTL detection | secondary | symptom, not cause |
| 1password integration tests | deferred | extant tests cover the flow |
| daemon restart mid-session test | nice-to-have | not critical |

## what changed

after review, the focus should be:
1. **reproduce the exact issue** — can we replicate -270m TTL?
2. **diagnose root cause** — why was TTL negative?
3. **fix the defect** — not add detection for symptoms
4. **add test coverage** — for the specific edge case found

the vision stays valid, but the "proposed tests" section may be over-scoped. prioritize root cause over symptom detection.
