# self-review: has-questioned-assumptions

## assumptions questioned

### assumption 1: keyrack is the right storage for tokens

**evidence:** keyrack provides secure encrypted storage, unlocked per-session.

**what if opposite:** tokens in plaintext settings.json = security risk.

**verdict:** HOLDS. keyrack is appropriate for sensitive credentials.

### assumption 2: 5-min TTL is acceptable latency

**evidence:** wisher didn't specify latency requirement. 5 min is default.

**what if opposite:** if latency must be instant, we'd need proactive rotation (complex).

**verdict:** HOLDS for spike. wisher can reduce TTL if needed.

### assumption 3: reactive rotation (after 429) is sufficient

**evidence:** research confirmed headers exist for proactive rotation, but reactive is simpler.

**what if opposite:** proactive would require quota API or response time inference.

**verdict:** HOLDS for spike. proactive is out of scope.

### assumption 4: tokens are rate-limited per-subscription

**evidence:** research confirmed per-organization/subscription, NOT per-IP.

**verdict:** CONFIRMED via research. not an assumption.

### assumption 5: each terminal operates independently

**evidence:** research confirmed apiKeyHelper is process-scoped.

**verdict:** CONFIRMED via research. not an assumption.

### assumption 6: shared state file needed for coordination

**evidence:** vision proposed shared state for cross-terminal consistency.

**what if opposite:** each terminal independently round-robins. simpler.

**verdict:** OVER-ENGINEERED for spike. removed from vision. can add later if needed.

## .status

all assumptions reviewed. one was over-engineered (shared state), already fixed.