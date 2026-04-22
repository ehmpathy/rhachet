# self-review: has-questioned-requirements

## requirements questioned

### 1. automatic rotation on rate limit (core)

**who said?** wish explicitly states "automatically rotate when hits limit"

**evidence?** user has 3 subscriptions, manually cycles them, loses flow state. quote from wish: "each time we max out one, we have to open the others and cycle all the terminals"

**what if we didn't?** user continues manual rotation — opens browser, logs into another account, runs /login in each terminal, loses context. the pain that motivated this spike continues.

**scope?** right-sized — focused on the core pain of subscription cycling.

**simpler way?** considered:
- use API keys instead of subscriptions: but user specifically has subscriptions, not API access
- just use one subscription and wait: but 5hr limit with heavy use means constant interruption
- upgrade to enterprise: but user has 3x20max already, cost is addressed differently

this is the simplest path for the stated problem.

**verdict: holds**

**why it holds:** this requirement comes directly from the wish. the wish describes a real pain (manual cycling), proposes a clear solution (automatic rotation), and asks for a spike. the requirement is minimal — rotate on limit, no bells and whistles. there is no simpler way to solve the stated problem.

---

### 2. apiKeyHelper integration

**who said?** i inferred from research of claude-code auth flow. the wish asks "how does the claude-cli pull auth creds today?" — i researched and found apiKeyHelper.

**evidence?** claude code documentation shows:
- `apiKeyHelper` is called after TTL (default 5min, configurable via CLAUDE_CODE_API_KEY_HELPER_TTL_MS)
- `apiKeyHelper` is called on HTTP 401 (rate limit)
- output goes to ANTHROPIC_AUTH_TOKEN
this is the documented extension point for custom auth.

**what if we didn't?** alternatives:
- modify claude-code source: invasive, not sustainable
- wrap claude binary: loses 401 retry hook, would need to restart claude
- use ANTHROPIC_API_KEY: different auth model, not subscription tokens

**scope?** appropriate — leverages documented extension point without modifying claude-code.

**simpler way?** could set ANTHROPIC_AUTH_TOKEN directly and restart claude on limit, but apiKeyHelper gives us the 401 retry hook automatically — claude retries with new token without restart.

**verdict: holds**

**why it holds:** apiKeyHelper is the documented extension point. it handles 401 retry automatically. it lets us swap tokens without restarting claude. using this mechanism aligns with how claude-code expects custom auth to work. the alternative (manual token swap + restart) is more complex and disruptive.

---

### 3. keyrack integration

**who said?** wish mentions "when we `rhx enroll`, could we wrap on that auth swap?" — this implies using rhachet's secret management.

**evidence?** keyrack is how rhachet manages secrets:
- secure storage via age encryption or vault backends
- unlock ceremony with identity verification
- env-scoped access control (test/prep/prod)

**what if we didn't?** alternatives:
- store tokens in plaintext env vars: security risk, no access control
- use separate secret manager: fragmentation, another tool to configure
- hardcode tokens: even worse security

**scope?** appropriate — keyrack is already part of rhachet, no new tooling.

**simpler way?** raw env vars are simpler to implement but lose security model. keyrack is worth the complexity because tokens are long-lived (1yr) and sensitive.

**verdict: holds**

**why it holds:** the wish asks about wrapping auth swap in rhx enroll. keyrack is how rhachet handles secrets. using keyrack means tokens are encrypted, access-controlled, and follow the same unlock ceremony as other secrets. the security model justifies the complexity.

---

### 4. team pool use case (usecase.2)

**who said?** i added this — NOT in original wish.

**evidence?** none from wish. wish says "we have 3x 20max subscriptions" — this is personal subscriptions, not team shared.

**what if we didn't?** no impact on core problem. wish is about personal use.

**scope?** too broad for spike. team pools add:
- coordination: who has which token locked
- contention: multiple users rotating same pool
- complexity: distributed state management

**simpler way?** skip for spike.

**verdict: ISSUE**

**how it was fixed:** removed usecase.2 (team pool) from the vision. added "team pools" to "future enhancements (out of scope for spike)" section. this narrows the spike to the stated problem: personal subscription rotation.

**lesson:** i was projecting future needs onto the spike. the wish is focused on personal subscriptions ("we have 3x"). team pools are a valid future enhancement but distract from the core problem. next time, stick to what's asked for in the wish.

---

### 5. ci/cd use case (usecase.3)

**who said?** i added this — NOT in original wish.

**evidence?** none from wish. wish describes manual terminal cycling, not pipeline failures.

**what if we didn't?** no impact on core problem. ci/cd has different auth patterns.

**scope?** too broad for spike. ci/cd pipelines typically use:
- API keys (not subscription tokens)
- service accounts
- different rate limit tiers

**simpler way?** skip for spike.

**verdict: ISSUE**

**how it was fixed:** removed usecase.3 (ci/cd) from the vision. added "ci/cd integration" to "future enhancements (out of scope for spike)" section. this keeps the spike focused on subscription tokens, not API keys.

**lesson:** ci/cd is a different problem space. pipelines use API keys with different rate limits. conflating subscription rotation (interactive use) with API key rotation (automated use) muddies the design. next time, identify the auth model first and design for that specifically.

---

### 6. glob pattern for pool (CLAUDE_OAUTH_TOKEN_*)

**who said?** i proposed this syntax for convenience.

**evidence?** keyrack supports key patterns in some operations, but glob patterns add implementation complexity for the rotation mechanism.

**what if we didn't?** would use explicit list: `CLAUDE_OAUTH_TOKEN_1,CLAUDE_OAUTH_TOKEN_2,CLAUDE_OAUTH_TOKEN_3`

**scope?** nice-to-have optimization, not core to the spike.

**simpler way?** explicit comma-separated list is:
- simpler to implement (just split on comma)
- explicit about pool membership
- no pattern matching logic needed

**verdict: ISSUE**

**how it was fixed:** changed all contract examples from glob pattern (`"CLAUDE_OAUTH_TOKEN_*"`) to explicit list (`CLAUDE_OAUTH_TOKEN_1,CLAUDE_OAUTH_TOKEN_2,CLAUDE_OAUTH_TOKEN_3`). added "glob patterns" to "future enhancements" section.

**lesson:** glob patterns are elegant but add implementation complexity. for a spike, explicit is better than clever. the user has 3 tokens — typing three names is not a burden. next time, start with the simplest interface that solves the problem.

---

## summary

| requirement | verdict | action |
|-------------|---------|--------|
| automatic rotation on 401 | holds | none — core ask |
| apiKeyHelper integration | holds | none — documented extension point |
| keyrack integration | holds | none — aligns with rhachet security model |
| team pool use case | ISSUE | removed from usecases, moved to future |
| ci/cd use case | ISSUE | removed from usecases, moved to future |
| glob pattern for pool | ISSUE | changed to explicit list |

## fixes applied to vision

1. **removed usecase.2 (team pool)**: deleted 15 lines of team pool description. this was scope creep beyond the wish.

2. **removed usecase.3 (ci/cd)**: deleted 9 lines of ci/cd description. this conflated different auth models.

3. **changed glob to explicit list**: updated 4 code examples from `"CLAUDE_OAUTH_TOKEN_*"` to `CLAUDE_OAUTH_TOKEN_1,CLAUDE_OAUTH_TOKEN_2,CLAUDE_OAUTH_TOKEN_3`. simpler implementation.

4. **added future enhancements section**: documented team pools, ci/cd, and glob patterns as out of scope for spike but valid future work.

## meta-lesson

the vision originally had 3 usecases. after review, only 1 remains. this is a 66% reduction in scope.

the wish was clear: personal subscription rotation for someone with 3 subscriptions. i expanded scope to team pools and ci/cd without evidence. the review caught this.

next time: read the wish more carefully. if it says "we have 3x 20max subscriptions", the scope is personal, not team. if it describes terminal cycling, the scope is interactive, not automated.

scope creep in vision documents leads to scope creep in implementation. catch it early.
