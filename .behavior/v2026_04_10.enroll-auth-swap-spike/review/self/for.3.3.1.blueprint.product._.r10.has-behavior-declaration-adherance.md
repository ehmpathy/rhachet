# self-review r10: has-behavior-declaration-adherance

## review findings

reviewed blueprint for adherance to vision and criteria. blueprint correctly implements the behavior declaration.

---

## issues found

### issue 1: terminology mismatch

**prior state**: review used old terminology (`AuthPool*`, `brains auth`, `--creds`, `specHash`, `getAuthPoolBest`, etc.)
**fix**: updated to match vision (`BrainAuth*`, `brains auth`, `--auth`, `specHash`, `getBrainAuthBest`, etc.)

---

## the question

does the blueprint correctly adhere to the vision and criteria? not just "does it cover them" — but "does it implement them correctly?"

coverage asks: did we forget any requirement?
adherance asks: did we misunderstand any requirement?

---

## adherance check: "pool" interpretation

**vision says:** developer has 3 subscriptions as pool

**blueprint interprets as:** N tokens discovered via glob pattern in keyrack URI

**adherance verified:** the blueprint correctly generalizes. "3 subscriptions" is an example, not a hard requirement. the glob pattern (`KEY_*`) allows any number of tokens. if the vision meant exactly 3, it would have said "exactly 3" — it says "as pool," which implies a collection of any size.

**why this adherance matters:** a hardcoded 3 would break when users have 2 or 4 subscriptions. the generalization is faithful to the intent.

---

## adherance check: rate limit detection interpretation

**vision says:** system detects rate limit

**blueprint interprets as:** detection via keyrack.get response status at token selection time

**adherance verified:** the vision does not specify *how* to detect rate limits — only that the system must detect them. the blueprint places detection at the keyrack.get boundary, which is the moment when we know if a token works. this is correct because:
- rate limits are discovered, not predicted
- the discovery moment is when we try to use the token
- keyrack.get is where we try to use the token

**why this adherance matters:** if we tried to detect rate limits separately (via poll or pre-check), we'd add latency and complexity. the blueprint's approach is minimally invasive.

---

## adherance check: transparent rotation interpretation

**vision says:** rotates to next transparently

**blueprint interprets as:** apiKeyHelper returns best token; consumer doesn't know which token it got

**adherance verified:** "transparent" means invisible to the consumer. the blueprint achieves this by:
- consumer calls apiKeyHelper (or the brain invokes it automatically)
- apiKeyHelper runs `get`
- `get` returns a token
- consumer uses that token

the consumer never asks "which token?" — it just gets "a token." this matches the vision's transparency requirement.

**why this adherance matters:** if the rotation were visible (e.g., via stdout messages, config changes, or re-enrollment prompts), the vision would be violated.

---

## adherance check: apiKeyHelper mechanism interpretation

**vision says:** apiKeyHelper returns best token

**blueprint interprets as:** apiKeyHelper is configured with `rhx brains auth get --from $specWords`

**adherance verified:** the vision specifies the apiKeyHelper *mechanism* — a way for brains to refresh auth tokens. the blueprint correctly wires into this mechanism by:
- the command is generated at enrollment time
- the spec words are embedded in the command
- the brain invokes this command when it needs a token

the blueprint does not modify how apiKeyHelper works — it provides a command that apiKeyHelper can run. this respects the extant apiKeyHelper contract.

**why this adherance matters:** a new mechanism (instead of apiKeyHelper) would require brain-side changes. the blueprint avoids that by use of the current contract.

---

## adherance check: state file interpretation

**vision says:** shared rotation state with activeTokenKey, lastRotation, rateLimited map

**blueprint interprets as:** BrainAuthState domain object with exactly those fields

**adherance verified:** the blueprint's BrainAuthState shape matches the vision exactly:
- `activeTokenKey: string` — the key of the current/last-used token
- `lastRotation: IsoTimeStamp` — when rotation last occurred
- `rateLimited: Record<string, IsoTimeStamp>` — map of token keys to rate-limit timestamps

no fields were added or removed. the blueprint is faithful to the vision's state specification.

**why this adherance matters:** extra fields would add complexity without justification. absent fields would break functionality. exact adherance ensures the simplest correct implementation.

---

## adherance check: per-brain isolation interpretation

**criteria says:** brain X rotation does not affect brain Y

**blueprint interprets as:** separate state files via specHash derived from spec words hash

**adherance verified:** the criteria requires isolation between brains with different pools. the blueprint achieves this by:
- specHash is derived from a hash of the spec words
- state is stored at `~/.rhachet/brain/auth/{specHash}/state.json`
- different URIs → different hashes → different paths → isolation

the isolation is physical (different files), not logical (same file with different keys). this is correct because:
- concurrent access from multiple processes is safe (no lock needed within file)
- each pool is fully independent
- no risk of cross-contamination

**why this adherance matters:** if isolation were logical (same file, different sections), concurrent writes could corrupt shared state. the blueprint's physical isolation is the safer choice.

---

## adherance check: exhausted error interpretation

**criteria says:** all tokens exhausted → error with hint

**blueprint interprets as:** loop completes without return → return exhausted error

**adherance verified:** the criteria requires an error when no tokens are available. the blueprint's flow:
1. iterate through all tokens in pool
2. skip rate-limited tokens
3. skip locked/absent tokens
4. if any token is healthy, return it
5. if loop completes, no token was returned → exhausted error

the error path is correct: it triggers only after all tokens have been tried. the hint (from test coverage) guides the user to resolution.

**why this adherance matters:** a premature exhausted error (e.g., after first failure) would be wrong. the blueprint correctly exhausts all options before error.

---

## adherance check: exit code interpretation

**criteria says:** get exit code 0 on success, exit code 2 on exhaustion/locked

**blueprint interprets as:** test coverage specifies exit codes

**adherance verified:** the criteria uses semantic exit codes:
- 0 = success (token returned)
- 2 = constraint error (user must fix first)

exit code 2 is correct for both exhaustion and keyrack-locked because:
- exhaustion: user must wait for cooldown or add tokens
- keyrack-locked: user must unlock keyrack

both require user action, not retry. the blueprint's test coverage enforces these codes.

**why this adherance matters:** exit code 1 (malfunction) would imply retry might help. exit code 2 (constraint) correctly communicates "fix this first."

---

## adherance check: cooldown interpretation

**criteria says:** rate limit refresh after cooldown

**blueprint interprets as:** isBrainAuthTokenRateLimited checks `timestamp + cooldownMs > now`

**adherance verified:** the criteria requires that rate-limited tokens become available again after a cooldown period. the blueprint's timestamp check:
- stores when the token was rate-limited
- checks if cooldown has elapsed
- returns true (still limited) or false (available)

the logic is `rateLimitedAt + cooldownMs > now`:
- if current time is past the cooldown, token is available
- if current time is within cooldown, token is still limited

this is correct calendar math.

**why this adherance matters:** a boolean "isRateLimited" flag (without timestamp) would require external reset. the timestamp approach is self-correct.

---

## adherance check: scope boundary interpretation

**criteria says:** tokens stored in keyrack (not brains auth)

**blueprint interprets as:** extant — keyrack's responsibility

**adherance verified:** the criteria explicitly places credential storage in keyrack's scope. the blueprint correctly marks this as "extant" — brains auth uses keyrack's capability but doesn't reimplement it.

scope boundaries the blueprint respects:
- keyrack: stores credentials, handles encryption, manages unlock
- brains auth: rotation logic, state track, token selection
- enrollment: integration point, configures apiKeyHelper

no boundary violations detected.

**why this adherance matters:** if brains auth stored credentials, it would duplicate keyrack functionality and create two sources of truth. the separation is correct.

---

## adherance check: research blockers interpretation

**vision/criteria reference:** research blockers for rate limit http code, apiKeyHelper scope, env var, keyrack glob

**blueprint interprets as:** declared as open questions, not assumed

**adherance verified:** the blueprint lists research blockers honestly rather than assumed answers:
- rate limit code (401 vs 429): affects detection logic
- apiKeyHelper scope: affects when rotation happens
- env var: affects which variable the brain reads
- keyrack glob: affects URI expansion

these are design premises that need verification. the blueprint is correct *given* certain assumptions; research validates those assumptions.

**why this adherance matters:** assumed answers that turn out wrong would require rework. to acknowledge uncertainty is intellectual honesty.

---

## summary

| aspect reviewed | adherance status | key insight |
|-----------------|------------------|-------------|
| pool size | correct | generalized from example to N |
| rate limit detection | correct | at keyrack.get boundary |
| transparent rotation | correct | apiKeyHelper hides mechanism |
| apiKeyHelper mechanism | correct | works within extant contract |
| state file shape | exact match | no additions, no omissions |
| per-brain isolation | correct | physical separation via specHash |
| exhausted error | correct | triggers after all tokens tried |
| exit codes | correct | semantic (0=success, 2=constraint) |
| cooldown logic | correct | timestamp-based self-correct |
| scope boundaries | correct | keyrack stores, brains auth rotates |
| research blockers | correct | acknowledged, not assumed |

**result:** zero adherance issues. the blueprint correctly interprets and implements every requirement from the vision and criteria. interpretations are faithful to intent, generalizations are justified, and boundary decisions are appropriate.

