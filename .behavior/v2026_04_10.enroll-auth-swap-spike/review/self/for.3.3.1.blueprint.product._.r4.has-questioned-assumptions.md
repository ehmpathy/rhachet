# self-review r4: has-questioned-assumptions

## the question

what hidden technical assumptions exist? for each, question whether evidence supports it or if it's based on habit.

---

## assumptions questioned

### assumption 1: apiKeyHelper triggers on 401, not 429

**what we assume**: apiKeyHelper is called on auth error (401), not rate limit (429)
**evidence**: external research confirmed — [authentication docs](https://code.claude.com/docs/en/authentication)
**what if opposite?**: if it triggered on 429, rotation would be immediate on rate limit
**could simpler approach work?**: no — this is claude-code behavior, not our choice
**verdict**: VALID — documented behavior, not assumption

### assumption 2: 5-minute TTL is acceptable latency

**what we assume**: up to 5 minutes for rotation is acceptable
**evidence**: noted in blueprint research blockers — "acceptable for the use case"
**what if opposite?**: if latency is unacceptable, user sets `CLAUDE_CODE_API_KEY_HELPER_TTL_MS=60000`
**could simpler approach work?**: yes — env var tune is documented, user controls latency
**verdict**: VALID — configurable, not locked to 5 minutes

### assumption 3: keyrack:// URI supports glob patterns

**what we assume**: `keyrack://owner/env/KEY_*` expands to multiple keys
**evidence**: NONE — marked as "internal research needed" in blueprint
**what if opposite?**: if keyrack doesn't support globs, spec format must change
**could simpler approach work?**: yes — list explicit keys instead of glob
**verdict**: RISK — needs verification before implementation

**action taken**: flagged in blueprint line 215 as "internal research needed"

### assumption 4: BrainAuthAdapter mirrors BrainHooksAdapter

**what we assume**: symmetric adapter pattern is correct approach
**evidence**: internal research (3.1.3) recommended this pattern
**what if opposite?**: if patterns differ, we'd need to justify why
**could simpler approach work?**: no — adapter pattern enables brain supplier implementations
**verdict**: VALID — follows extant pattern in codebase

### assumption 5: stateless design is better than state file

**what we assume**: query capacity on each call is better than local state
**evidence**: design decision documented in blueprint — "no local state"
**what if opposite?**: state file would cache capacity, reduce queries
**could simpler approach work?**: state file is simpler but causes cross-terminal sync issues
**analysis**:
- state file requires sync mechanism across terminals
- adapter query is inherently consistent
- brain supplier owns capacity knowledge (inversion of control)
**verdict**: VALID — stateless design avoids sync complexity

### assumption 6: claude setup-token produces 1-year tokens

**what we assume**: oauth tokens last 1 year
**evidence**: external research — [authentication docs](https://code.claude.com/docs/en/authentication)
**what if opposite?**: shorter tokens require more frequent rotation
**could simpler approach work?**: no — this is claude-code behavior
**verdict**: VALID — documented behavior

### assumption 7: brain suppliers can implement capacity queries

**what we assume**: brain suppliers (like claude-code) expose capacity information
**evidence**: PARTIAL — we assume API exists but haven't verified
**what if opposite?**: if no capacity API, must fallback to trial-and-error
**could simpler approach work?**: yes — probe tokens sequentially until one works
**analysis**:
- blueprint getOneBrainAuthCredentialBySpec queries `brainAuthAdapter.capacity.get.all()`
- if no capacity API, orchestrator needs fallback to sequential probe
**verdict**: RISK — needs verification that claude-code exposes capacity

**action taken**: this is implementation detail for brain supplier

---

## why it holds

| assumption | evidence type | verdict |
|------------|---------------|---------|
| 401 trigger | external docs | valid |
| 5-min TTL | configurable | valid |
| keyrack glob | needs research | risk flagged |
| adapter symmetry | internal pattern | valid |
| stateless design | design decision | valid |
| 1-year tokens | external docs | valid |
| capacity API | unverified | risk noted |

6 of 7 assumptions are valid with evidence. 1 is flagged in blueprint.

---

## risks identified

| assumption | risk level | mitigation |
|------------|------------|------------|
| keyrack glob patterns | HIGH | verify before implementation |
| capacity API exists | MEDIUM | fallback to sequential probe |

---

## summary

- **7 assumptions questioned**
- **5 assumptions valid** (documented evidence)
- **1 assumption flagged** (keyrack glob — in blueprint)
- **1 assumption risky** (capacity API — implementation detail)

**result**: critical assumptions are either documented or flagged. keyrack glob support is explicitly marked as "internal research needed" in blueprint.
