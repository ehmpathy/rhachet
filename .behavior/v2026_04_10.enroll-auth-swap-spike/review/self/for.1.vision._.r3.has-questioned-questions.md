# self-review round 3: has-questioned-questions

## context

all research has been completed. this round confirms all questions are now resolved.

## status update: all questions answered

| question | prior status | current status | answer |
|----------|-------------|----------------|--------|
| 1. rate limit http code | [research] | [answered] | 429 for rate limit, 401 for auth error |
| 2. apiKeyHelper scope | [research] | [answered] | triggers on 401 and every TTL (5 min default) |
| 3. env var for subscriptions | [research] | [answered] | use apiKeyHelper, NOT env vars — apiKeyHelper is THE only way for mid-session rotation |
| 4. setup-token exists | [research] | [answered] | yes, generates 1-year OAuth token |
| 5. token validity period | [research] | [answered] | 1 year |
| 6. rate limit scope | [research] | [answered] | per-organization/subscription, NOT per-IP |
| 7. per-brain isolation | [research] | [answered] | process-scoped, each terminal independent |
| 8. proactive rotation | [research] | [answered] | headers available, reactive OK for spike |
| 9. keyrack glob support | [research] | [answered] | NOT supported, use explicit comma-separated list |
| 10. mid-session rotation | [research] | [answered] | apiKeyHelper is THE mechanism, env vars are cached at spawn |

## critical insight from research

the most important discovery: **env vars cannot rotate mid-session**.

- `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` — all cached at spawn
- only `apiKeyHelper` is re-called periodically (every 5 min or on 401)
- this shapes the entire design: configure apiKeyHelper in settings.json

## fixes applied

1. **vision updated** — key insight section added to explain apiKeyHelper mechanism
2. **open questions section** — all items marked as resolved with answers
3. **shared state simplified** — removed as over-engineered for spike

## final assessment

no open questions remain. all [research] items are now [answered]. no [wisher] items left.

vision is complete and ready for human approval.
