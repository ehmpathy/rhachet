# self-review: has-questioned-assumptions

## assumptions surfaced

### 1. rate limit returns 401

**assumption:** rate limit errors return HTTP 401, which triggers apiKeyHelper retry.

**evidence?** research showed apiKeyHelper is called "on 401". but rate limits often return HTTP 429 (too many requests), not 401.

**what if opposite?** if rate limit is 429 and apiKeyHelper only triggers on 401, rotation would not happen automatically.

**did wisher say?** no — wisher described the symptom ("usage limits time out too fast"), not the http response.

**verdict: ISSUE** — need to verify which http code claude returns on rate limit. if 429, design may need adjustment.

**how fixed:** added to open questions: "what http code does claude return on subscription rate limit? 401 vs 429?"

---

### 2. tokens can be generated with `claude setup-token`

**assumption:** `claude setup-token` command exists and generates long-lived oauth tokens.

**evidence?** research mentioned this command. but did not verify it exists in current claude cli.

**what if opposite?** if command doesn't exist, token generation ceremony is unknown.

**did wisher say?** wisher asked "how does it /login to swap the creds on the fly?" — no mention of setup-token.

**verdict: ISSUE** — need to verify `claude setup-token` exists and produces usable token.

**how fixed:** added to open questions: "verify `claude setup-token` exists and produces CLAUDE_CODE_OAUTH_TOKEN"

---

### 3. tokens are valid for 1 year

**assumption:** long-lived oauth tokens are valid for 1 year.

**evidence?** research stated "1 year validity" but no source cited.

**what if opposite?** if tokens expire sooner (30 days, 90 days), refresh ceremony becomes more frequent.

**did wisher say?** no — wisher mentioned "long term creds" but no duration.

**verdict: ISSUE** — need to verify token validity period.

**how fixed:** added to open questions: "what is actual token validity period? verify 1yr claim."

---

### 4. 5hr usage limit is accurate

**assumption:** subscription rate limit is 5 hours of usage.

**evidence?** wisher said "5hr usage limits time out too fast". treat as ground truth since wisher experiences this.

**what if opposite?** limit could vary by subscription tier or change over time.

**did wisher say?** yes — "5hr usage limits"

**verdict: holds**

**why it holds:** wisher explicitly stated 5hr limit. this is their lived experience. design should work regardless of exact duration — the mechanism (rotate on limit) is the same.

---

### 5. rate limit is per-token, not per-IP

**assumption:** if token A is rate-limited, token B will work from the same IP.

**evidence?** none — this is a critical assumption for the design.

**what if opposite?** if rate limit is per-IP, token rotation would not help. all tokens would be blocked until IP cooldown.

**did wisher say?** wisher said "cycle all the terminals" after account switch — implies different accounts work, so rate limit is likely per-account/token.

**verdict: holds (with evidence)**

**why it holds:** wisher's current manual process works: log into different account, works again. this implies rate limit is per-subscription, not per-IP. the spike should work the same way.

---

### 6. rate limit resets after some time

**assumption:** a rate-limited subscription becomes usable again after time passes.

**evidence?** wisher said "after C, back to A (hopefully refreshed)". implies A resets after cycle through B and C.

**what if opposite?** if rate limits don't reset, pool would exhaust and never recover.

**did wisher say?** yes — "hopefully refreshed" implies reset happens.

**verdict: holds**

**why it holds:** wisher's manual process cycles back to A. if A never reset, wisher would have mentioned that all 3 get stuck. design should track last-used time per token to prefer tokens with most recovery time.

---

### 7. `rhx enroll` wraps claude binary

**assumption:** we can wrap claude binary with rotation logic via rhx enroll.

**evidence?** wisher asked "could we wrap on that auth swap?" — suggests wrap is acceptable.

**what if opposite?** if wrap is not acceptable, need different integration point.

**did wisher say?** wisher asked if we "could" wrap — this indicates openness to the approach.

**verdict: holds**

**why it holds:** wisher explicitly asked about wrap. the apiKeyHelper mechanism is the integration point — it doesn't require binary wrap, just set an environment variable and provide a command.

---

### 8. get-best can detect rate limit state

**assumption:** rotation mechanism can tell if a token is rate-limited before use.

**evidence?** none — this is complex to implement without api access.

**what if opposite?** if we can't detect state, we try tokens blindly until one works.

**did wisher say?** no — wisher didn't specify detection mechanism.

**verdict: ISSUE** — current design assumes health check. simpler approach: round-robin until success.

**how fixed:** changed get-best description from "checks current token health" to "tries tokens in order until one works". removed "token health" terminology that implied api-based check.

---

### 9. unlock happens at session start

**assumption:** user unlocks all pool tokens at session start.

**evidence?** follows keyrack usage pattern.

**what if opposite?** tokens could be unlocked on-demand when rotation happens.

**did wisher say?** no — wisher didn't specify unlock ceremony.

**verdict: holds (acceptable simplification)**

**why it holds:** unlock at session start is simpler than on-demand unlock. for personal use with 3 tokens, unlock of 3 keys at start is not burdensome. on-demand unlock adds complexity (unlock prompts in work flow).

---

### 10. ANTHROPIC_AUTH_TOKEN is the right env var

**assumption:** set ANTHROPIC_AUTH_TOKEN from apiKeyHelper is the correct integration point.

**evidence?** research showed auth precedence: ANTHROPIC_AUTH_TOKEN → ANTHROPIC_API_KEY → apiKeyHelper → CLAUDE_CODE_OAUTH_TOKEN

**what if opposite?** if wrong env var, tokens won't be recognized.

**did wisher say?** no — wisher asked how auth works, i researched and found this.

**verdict: holds (research-backed)**

**why it holds:** research confirmed ANTHROPIC_AUTH_TOKEN is checked. apiKeyHelper output becomes this env var. this is documented behavior.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| rate limit is 401 | ISSUE | add to open questions — need verification |
| setup-token exists | ISSUE | add to open questions — need verification |
| 1yr token validity | ISSUE | add to open questions — need verification |
| 5hr usage limit | holds | wisher's lived experience |
| per-token rate limit | holds | wisher's process implies this |
| rate limit resets | holds | wisher cycles back to A |
| wrap via rhx enroll | holds | wisher asked about wrap |
| detect rate limit state | ISSUE | simplified to round-robin |
| unlock at session start | holds | acceptable ceremony |
| ANTHROPIC_AUTH_TOKEN | holds | research-backed |

## fixes applied

1. **added open questions:**
   - "what http code does claude return on subscription rate limit? 401 vs 429?"
   - "verify `claude setup-token` exists and produces CLAUDE_CODE_OAUTH_TOKEN"
   - "what is actual token validity period? verify 1yr claim."

2. **simplified get-best operation:** changed from "checks token health" (implies api) to "tries tokens until success" (simpler, no api needed). updated vision contract section.

## meta-lesson

several assumptions came from research but were not verified against current claude cli. research shows documented behavior, but docs can be outdated.

before implementation, need to verify:
- `claude setup-token` command exists
- produces token that works as ANTHROPIC_AUTH_TOKEN
- rate limit http code triggers apiKeyHelper

these are critical path assumptions. if wrong, design fails.
