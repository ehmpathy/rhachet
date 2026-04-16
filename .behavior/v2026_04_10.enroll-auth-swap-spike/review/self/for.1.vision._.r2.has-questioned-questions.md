# self-review round 2: has-questioned-questions

## context

the vision has 11 open questions. this review triages them to determine which need research, which need wisher input, and which can be answered now.

## triage categories

| tag | definition | action |
|-----|------------|--------|
| [answered] | can answer from vision context | decide in this review |
| [research] | needs empirical verification | add to research phase |
| [wisher] | needs wisher input on preference | ask wisher before proceed |

---

## critical path questions (1-6)

### 1. rate limit http code

**question:** what code does claude return on subscription rate limit? 401 vs 429?

**triage:** [research]

**why research:** this determines whether apiKeyHelper triggers. if 429 (not 401), the design needs adjustment. must verify via observation or docs before implementation.

**research method:** trigger rate limit on subscription, observe http response code. or find claude code docs on error codes.

---

### 2. apiKeyHelper scope

**question:** does apiKeyHelper trigger on subscription rate limit, or only API key rate limit?

**triage:** [research]

**why research:** apiKeyHelper may only apply to API key auth path, not subscription auth. if subscription auth bypasses apiKeyHelper, the entire design premise fails.

**research method:** configure apiKeyHelper with subscription token, trigger rate limit, observe if helper is called.

---

### 3. env var for subscriptions

**question:** which env var should apiKeyHelper set? ANTHROPIC_AUTH_TOKEN vs CLAUDE_CODE_OAUTH_TOKEN

**triage:** [research]

**why research:** research showed both vars. ANTHROPIC_AUTH_TOKEN is for API keys, CLAUDE_CODE_OAUTH_TOKEN is for subscription tokens. need to verify which applies to apiKeyHelper output for subscription auth.

**research method:** set each var with subscription token, verify claude accepts it. check claude code source or docs for precedence.

---

### 4. setup-token exists

**question:** verify `claude setup-token` command exists. fallback: extract from ~/.claude/.credentials.json

**triage:** [research]

**why research:** if command doesn't exist, need fallback plan. research already documented fallback (extract from .credentials.json), but primary path needs verification.

**research method:** run `claude setup-token --help` or `claude --help` to check if command exists.

---

### 5. token validity period

**question:** verify 1yr claim — what is actual expiration?

**triage:** [research]

**why research:** informational, not critical path. but affects token refresh ceremony frequency. if tokens expire monthly, wisher may reconsider ROI of the spike.

**research method:** check token payload (if JWT) or claude docs for token lifetime.

---

### 6. rate limit scope

**question:** is rate limit purely per-token, or does IP factor in?

**triage:** [research] + [wisher]

**why research:** if IP is a factor, rotation may not help. wisher's manual process works (evidence that per-token is sufficient), but edge cases may exist.

**why wisher:** wisher has empirical experience with manual rotation. ask: "have you ever seen all accounts get blocked at once?"

**research method:** rate limit token A, switch to token B from same IP, observe if B works.

---

## design questions (7-11)

### 7. token generation ceremony

**question:** can we streamline N logins into single flow?

**triage:** [answered]

**decision:** out of scope for spike. current ceremony (N separate logins) is acceptable for N=3. future enhancement can address if N grows.

**rationale:** spike scope is personal use with 3 tokens. wisher cycles 3 accounts manually today — one-time token generation per year is less effort than daily manual rotation.

---

### 8. pool size

**question:** what's the practical limit? 3? 10? 100?

**triage:** [answered]

**decision:** no hard limit in design. round-robin scales to any N. practical limit is what wisher can afford (subscriptions) and manage (tokens).

**rationale:** the rotation mechanism is N-agnostic. pool = list of token keys. round-robin iterates until one works or all exhausted. complexity is O(N) in worst case.

---

### 9. usage visibility

**question:** how to show which subscription is active, quota left?

**triage:** [answered]

**decision:** out of scope for spike. future enhancement. for spike, rotation is invisible — user only notices if all tokens exhausted.

**rationale:** visibility requires either API for quota check (may not exist) or inference from rate limit timing. adds complexity without addressing core pain (manual rotation).

---

### 10. token refresh

**question:** how to handle yearly token expiration gracefully?

**triage:** [answered]

**decision:** treat token expiry same as rate limit — rotate to next token. if all tokens expired, report exhaustion with hint to regenerate.

**rationale:** yearly expiry is rare. when it happens, rotation mechanism tries next token. if all expired, user runs setup-token for each account. same ceremony as initial setup.

---

### 11. cross-machine

**question:** how to sync pool state across developer machines?

**triage:** [answered]

**decision:** out of scope for spike. state file is per-machine (~/.rhachet/auth-pool/state.json). future enhancement can add sync (e.g., via cloud storage or git-ignored dotfile).

**rationale:** wisher mentioned "terminals", not "machines". spike scope is single machine with multiple terminals. cross-machine adds distributed state complexity — address core problem first.

---

## summary

| question | triage | action |
|----------|--------|--------|
| 1. rate limit http code | [research] | observe or find docs |
| 2. apiKeyHelper scope | [research] | configure and trigger |
| 3. env var for subscriptions | [research] | test both vars |
| 4. setup-token exists | [research] | run command |
| 5. token validity period | [research] | check token or docs |
| 6. rate limit scope | [research] + [wisher] | test + ask wisher |
| 7. token generation ceremony | [answered] | out of scope |
| 8. pool size | [answered] | no limit |
| 9. usage visibility | [answered] | out of scope |
| 10. token refresh | [answered] | same as rate limit |
| 11. cross-machine | [answered] | out of scope |

## research phase plan

before implementation, verify:

1. **http code test:** trigger rate limit, observe response code
2. **apiKeyHelper test:** configure helper, trigger rate limit, observe if called
3. **env var test:** set CLAUDE_CODE_OAUTH_TOKEN, verify claude accepts it
4. **setup-token test:** run `claude setup-token --help`
5. **token lifetime:** check token payload or docs
6. **ip factor test:** rate limit A, try B from same IP

these tests can run in parallel or as a quick poc session.

## wisher input needed

before implementation, ask wisher:

1. **rate limit scope:** "have you ever seen all accounts get blocked at once, or does swap always work?"

this confirms the per-token assumption from lived experience.

## meta-lesson

triage separates questions into actionable categories. research questions need empirical verification before implementation. wisher questions need human judgment. answered questions can be decided from context.

the spike should not proceed to implementation until critical path research (questions 1-6) is complete. design questions (7-11) are decided or deferred.
