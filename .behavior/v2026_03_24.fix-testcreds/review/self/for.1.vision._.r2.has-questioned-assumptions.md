# self-review: has-questioned-assumptions

## hidden assumptions surfaced

### A1: keyrack daemon persists across terminals

| question | answer |
|----------|--------|
| what do we assume? | once unlocked, keys stay available to all terminal sessions |
| what evidence? | wisher said "unlock once per session" — but unclear if session = terminal or OS session |
| what if opposite true? | if per-terminal, we've only shifted the manual step from `source` to `unlock` |
| did wisher say this? | implied ("tests just work from now on") but not explicit |
| counterexamples? | keyrack daemon could be process-scoped, not user-scoped |

**verdict**: needs verification. run `rhx keyrack status` across terminals to confirm daemon scope.

**action**: added to "research needed" in vision. implementation should verify.

---

### A2: execSync is appropriate for keyrack get

| question | answer |
|----------|--------|
| what do we assume? | sync spawn of keyrack cli is fast enough for test startup |
| what evidence? | jest.integration.env.ts already uses execSync for testdb check |
| what if opposite true? | slow keyrack startup could add seconds to every test run |
| did wisher say this? | wisher said "shell spawn cli" which implies sync is acceptable |
| counterexamples? | keyrack get could require daemon warmup, network calls, etc. |

**verdict**: assumption holds, with caveat.

keyrack get reads from daemon memory — should be fast (~10ms). but if daemon not up, first call may be slow. this is acceptable: same tradeoff as testdb check.

---

### A3: all developers have vault access

| question | answer |
|----------|--------|
| what do we assume? | everyone who runs tests can unlock keyrack |
| what evidence? | wisher focused on ehmpath developers who have vault access |
| what if opposite true? | external contributors or new developers cannot run tests |
| did wisher say this? | wisher asked about ehmpath specifically |
| counterexamples? | open source contributors, CI without vault access |

**verdict**: **assumption may be too narrow**.

the vision says "default to --owner ehmpath" but doesn't address:
- what if developer is not an ehmpath?
- what if CI has no vault access?

**action**: added question to "questions to validate with wisher" in vision.

---

### A4: keyrack get returns secrets when unlocked

| question | answer |
|----------|--------|
| what do we assume? | when keys are unlocked, keyrack get --json returns the actual secrets |
| what evidence? | the keyrack contract doc shows `{ "key": { "secret": "ghp_xxxx..." } }` |
| what if opposite true? | jest.integration.env.ts cannot extract secrets |
| did wisher say this? | wisher assumed keyrack would "grab the keys it needs via json" |
| counterexamples? | keyrack might return only status, not secrets, for security |

**verdict**: needs verification. test `rhx keyrack get --key X --json` when unlocked.

**action**: I ran `rhx keyrack get --for repo --env test --json` earlier — it returned status objects, not secrets. need to verify unlocked behavior.

---

### A5: jest.integration.env.ts can set process.env from keyrack output

| question | answer |
|----------|--------|
| what do we assume? | we can parse keyrack JSON and inject into process.env before tests run |
| what evidence? | this is standard Node.js — process.env is a mutable object |
| what if opposite true? | would need different injection mechanism |
| did wisher say this? | implied by "automatically grab the keys" |
| counterexamples? | none — this is well-established pattern |

**verdict**: assumption holds.

---

### A6: required test keys are OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY

| question | answer |
|----------|--------|
| what do we assume? | the keys in use.apikeys.json are complete and correct |
| what evidence? | use.apikeys.json explicitly declares these |
| what if opposite true? | tests might need other keys not declared |
| did wisher say this? | wisher said to use keyrack; keys are from current pattern |
| counterexamples? | other integration tests might need AWS_PROFILE, etc. |

**verdict**: assumption holds for current scope.

the keys are derived from use.apikeys.json — same source of truth. if more keys needed, add to keyrack.yml.

---

## issues found

### issue 1: daemon scope unclear

**found**: vision assumes daemon persists across terminals without verification

**action**: flagged in "research needed" — implementation should verify

### issue 2: non-ehmpath developers not addressed

**found**: vision focuses on ehmpath developers; external contributors unclear

**action**: added to "questions to validate with wisher"

### issue 3: unlocked output format unverified

**found**: I tested locked/absent status but not unlocked secret retrieval

**action**: need to unlock keyrack and verify output format before implementation

---

## non-issues confirmed

### execSync is appropriate

keyrack daemon is memory-resident; get calls are fast. same pattern as testdb check.

### process.env injection works

standard Node.js pattern; no barriers.

### required keys are known

derived from use.apikeys.json — same source of truth as current pattern.

---

## summary

| assumption | status |
|------------|--------|
| A1: daemon persists | ⚠️ needs verification |
| A2: execSync is fast | ✓ holds |
| A3: all devs have vault | ⚠️ question for wisher |
| A4: unlocked returns secrets | ⚠️ needs verification |
| A5: process.env injection | ✓ holds |
| A6: keys are known | ✓ holds |

three assumptions need verification or clarification before implementation. flagged in vision.

## fixes applied to vision

these edits were made to `1.vision.md` based on this review:

1. **questions to validate with wisher** (lines 198-202):
   - removed obsolete question about `keyrack fill` (command doesn't exist)
   - added explicit question about non-ehmpath contributors
   - added explicit question about CI environments without vault access

2. **research needed** (lines 204-208):
   - marked "keyrack get returns all keys" as ✓ verified
   - added "verify keyrack get --json returns secrets when unlocked"
   - clarified daemon persistence question: "user-scoped vs process-scoped"

## lessons learned

1. **question the daemon persistence model** — assumed unlock persists across all terminals without first verified keyrack's actual architecture
2. **consider all user types** — focused on happy path (ehmpath developers) without consider external contributors
3. **verify output format for all states** — tested locked/absent output but not unlocked/present output
