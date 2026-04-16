# self-review: has-zero-deferrals

## deferrals found in blueprint

### deferral 1: SDK extension
- **location**: blueprint notes → "### scope decisions"
- **text**: "CLI-only for spike: CLI contract is sufficient; SDK extension deferred to post-spike"
- **source**: research recommendation (prod pattern.7), NOT vision/criteria
- **verdict**: ACCEPTABLE — this was a research suggestion, not a requirement

### deferral 2: mock vault adapter extension
- **location**: blueprint notes → "### scope decisions"
- **text**: "no mock vault extension: transformers are pure (no vault deps)"
- **source**: research recommendation (test pattern.3), NOT vision/criteria
- **verdict**: ACCEPTABLE — this was a research suggestion for test infra, not a requirement

---

## vision/criteria coverage verification

### usecase.1 — configure auth pool
| criterion | in blueprint | how |
|-----------|--------------|-----|
| keyrack set for tokens | N/A (uses extant keyrack) | not new functionality |
| rhx enroll with --auth spec | YES | invokeEnroll.ts [~] |
| auth spec validation | YES | asBrainAuthSpecShape.ts |

### usecase.2 — automatic rotation on rate limit
| criterion | in blueprint | how |
|-----------|--------------|-----|
| detect rate limit | DEPENDS ON RESEARCH | apiKeyHelper invocation scope |
| rotate to next token | YES | getBrainAuthBest.ts orchestrator |
| state file records rate-limited | YES | setBrainAuthState.ts |
| cascade rotation | YES | round-robin in getBrainAuthBest.ts |
| rate limit refresh | YES | isBrainAuthTokenRateLimited.ts |

### usecase.3 — per-brain isolation
| criterion | in blueprint | how |
|-----------|--------------|-----|
| pool per brain | YES | specHash from auth spec hash |
| cross-terminal consistency | YES | state file is source of truth |

### usecase.4 — error states
| criterion | in blueprint | how |
|-----------|--------------|-----|
| exhaustion error | YES | getBrainAuthBest returns exhausted |
| invalid token handler | DEPENDS ON RESEARCH | 401 vs 429 distinction |
| keyrack locked error | YES | getBrainAuthBest checks keyrack status |

### exchange boundaries
| criterion | in blueprint | how |
|-----------|--------------|-----|
| enroll --auth command | YES | invokeEnroll.ts [~] |
| get command | YES | invokeBrainsAuth.ts [+] |
| status command | YES | invokeBrainsAuth.ts [+] |
| state file format | YES | BrainAuthState.ts [+] |

---

## research blockers vs deferrals

the blueprint has "open research blockers" — these are NOT deferrals:

1. **rate limit http code** — research to verify design assumptions
2. **apiKeyHelper scope** — research to verify mechanism works
3. **env var for subscriptions** — research to verify auth path

these are open questions that must be answered before implementation. if research invalidates assumptions, the design changes — but that's research validation, not deferred work.

the criteria items marked "DEPENDS ON RESEARCH" above are contingent on research findings, not deferred.

---

## why no vision items are deferred

### enrollment extension (usecase.1)
- blueprint adds `--auth` flag to `invokeEnroll.ts`
- auth spec validation in `asBrainAuthSpecShape.ts`
- not deferred

### rotation mechanics (usecase.2)
- all rotation logic in `getBrainAuthBest.ts` orchestrator
- state persistence in `getBrainAuthState.ts` / `setBrainAuthState.ts`
- cooldown check in `isBrainAuthTokenRateLimited.ts`
- not deferred (implementation contingent on research validation)

### per-brain isolation (usecase.3)
- specHash derived from auth spec hash
- state file per specHash
- not deferred

### error states (usecase.4)
- exhausted state returned by `getBrainAuthBest.ts`
- keyrack-locked detected via keyrack.get() status
- not deferred

### all CLI commands (exchange boundaries)
- `rhx enroll --auth` → invokeEnroll.ts
- `npx rhachet brains auth get` → invokeBrainsAuth.ts
- `npx rhachet brains auth status` → invokeBrainsAuth.ts
- not deferred

---

## summary

| category | count | acceptable? |
|----------|-------|-------------|
| deferrals from vision/criteria | 0 | n/a |
| deferrals from research recommendations | 2 | YES (extras) |
| research blockers (not deferrals) | 3 | n/a |

**result**: zero vision/criteria deferrals. two acceptable deferrals from research recommendations. three open research blockers that must be resolved before implementation.
