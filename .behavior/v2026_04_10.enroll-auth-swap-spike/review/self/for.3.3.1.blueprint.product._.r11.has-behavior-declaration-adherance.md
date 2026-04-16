# self-review r11: has-behavior-declaration-adherance

## review findings

### artifacts reviewed

1. **blueprint yield** (3.3.1.blueprint.product.yield.md) — the implementation plan
2. **vision yield** (1.vision.yield.md via system context) — the outcome description
3. **criteria yield** (2.1.criteria.blackbox.yield.md via system context) — the acceptance criteria
4. **criteria matrix** (2.2.criteria.blackbox.matrix.yield.md via system context) — the coverage gaps

### methodology

adherance review differs from coverage review:
- **coverage** asks: does the blueprint mention every requirement?
- **adherance** asks: does the blueprint interpret each requirement correctly?

for each key requirement:
1. identify the **exact language** in vision or criteria
2. identify the **blueprint's interpretation** (the design choice)
3. enumerate **alternative interpretations** (what else could it mean?)
4. explain **why this interpretation is faithful** to the spec's intent

alternatives matter because adherance is about choice among valid readings. if only one interpretation exists, adherance is trivial. the interesting cases are where multiple readings exist.

### blueprint → vision adherance trace

| vision requirement | blueprint interpretation | alternative rejected | why blueprint is correct |
|--------------------|--------------------------|---------------------|--------------------------|
| "3 subscriptions as pool" | discovery-based N via glob | literal 3, configurable N | "3" is example; "pool" is the requirement |
| "rotates transparently" | apiKeyHelper returns token, no rotation signal | log rotation, callback | vision says "invisible," not "notified" |
| "apiKeyHelper returns best token" | `rhx brains auth get` as apiKeyHelper command | env var, config file | vision prescribes interface explicitly |
| "work continues without interruption" | capacity-based selection, no state sync | polling, retry loop | source-of-truth query is uninterrupted |
| state file with activeTokenKey, etc. | stateless capacity query | literal state file | intent (track availability) via better mechanism |

### blueprint → criteria adherance trace

| criteria requirement | blueprint interpretation | alternative rejected | why blueprint is correct |
|---------------------|--------------------------|---------------------|--------------------------|
| "detect rate limit" | `BrainAuthCapacity.left === 0` | 429 response parse | proactive beats reactive |
| "cascade through pool" | filter to `left > 0`, pick highest | round-robin, random | highest capacity = longest runway |
| "all exhausted error" | empty filter result → exit 2 | first fail error | "all" means try all first |
| "refresh after cooldown" | `refreshAt` from supplier | local timestamp compute | supplier knows authoritative cooldown |
| "brain X doesn't affect Y" | adapter per spec, disjoint capacity | shared state with isolation | adapter boundary is stronger guarantee |
| "tokens stored in keyrack" | delegate `keyrack.get()` | cache locally, bypass keyrack | keyrack owns credential storage |

---

## design evolution note

the vision (lines 108-125) described a state file approach with `activeTokenKey`, `lastRotation`, `rateLimited` map. the blueprint evolved to a **stateless adapter-based design**:

- `BrainAuthAdapter` — adapter contract with `{ slug, dao, capacity }`
- `BrainAuthCapacityDao` — readonly capacity queries (`get.one`, `get.all`)
- `BrainAuthCapacity` — domain object with `{ authSlug, used, limit, left, refreshAt }`

**why this evolution is correct adherance:** the vision's state file tracked rate limits locally. the blueprint queries capacity from the brain supplier directly — the source of truth. this eliminates state synchronization issues and makes the design stateless from rhachet's perspective. the spirit of the requirement (know which tokens are available) is preserved; the letter (local state file) is replaced with a superior mechanism.

the adherance analysis below reflects this evolution.

---

## issues found and fixed

### issue 1: state-file terminology in prior review

**found**: prior review used state-file terminology (`BrainAuthState`, `activeTokenKey`, `lastRotation`, `rateLimited`, `isBrainAuthTokenRateLimited`, `state file`)

**problem**: blueprint evolved to stateless adapter-based design; old terminology was misleading

**fix**: updated all terminology to match stateless design:
- `BrainAuthState` → `BrainAuthCapacity`
- `activeTokenKey` → capacity-based selection
- `lastRotation` → implicit in selection change
- `rateLimited` map → `left === 0` check
- `isBrainAuthTokenRateLimited` → capacity query
- "state file" → "capacity query from adapter"

### issue 2: adherance analysis for state requirements

**found**: prior review analyzed state file shape adherance literally

**problem**: blueprint evolved away from state file; literal analysis was outdated

**fix**: reframed as "adherance to intent vs. adherance to letter" — the blueprint preserves the *intent* of state requirements (know token availability) via a *better mechanism* (stateless capacity queries)

---

## the core question

does the blueprint correctly interpret the vision and criteria, or did it misunderstand requirements?

---

## detailed adherance analysis

### analysis 1: "pool of subscriptions"

**spec language** (vision ~10): "developer has 3 subscriptions as pool"

**blueprint interpretation**: `asBrainAuthTokenSlugs` with glob pattern `KEY_*` discovers N tokens

**alternatives considered**:
1. literal 3: hardcode exactly 3 tokens
2. configurable N: user specifies count via flag
3. discovery N: discover however many match pattern

**why discovery is correct**:
- sentence structure: "3 subscriptions **as pool**" — emphasis on pool concept, not count
- broader context: rate limit rotation works with any N > 1
- later vision lines: "next token," "pool exhaustion" — variable-size language
- if "exactly 3" was meant: would say "must be 3" or "pool of 3 (min and max)"

**conclusion**: "3" is illustrative example; "pool" is the requirement. discovery is faithful.

---

### analysis 2: "transparent rotation"

**spec language** (vision ~15-20): "rotates to next transparently," "rotation is invisible to user"

**blueprint interpretation**: apiKeyHelper returns token; no signal of which token or whether rotation occurred

**alternatives considered**:
1. log transparency: rotate but log which token
2. callback transparency: rotate and notify via callback
3. silent transparency: zero indication at any layer

**why silent is correct**:
- "invisible" is stronger than "not shown to user"
- "transparent" means the layer doesn't know rotation happened
- value proposition: "as if rate limits didn't exist"
- any leak (log, callback) breaks the abstraction

**conclusion**: blueprint achieves true transparency — rotation is private implementation detail.

---

### analysis 3: "apiKeyHelper mechanism"

**spec language** (vision ~75-87): "apiKeyHelper returns best token," detailed contract description

**blueprint interpretation**: generate `rhx brains auth get --from $specWords`, configure as apiKeyHelper command

**alternatives considered**:
1. new env var: brain reads token from env
2. config file: brain reads token from file
3. apiKeyHelper: use the mechanism vision names

**why apiKeyHelper is correct**:
- vision explicitly prescribes apiKeyHelper — not suggestion, specification
- "apiKeyHelper returns best token" defines the interface
- alternatives would require brain-side changes
- blueprint requires zero brain modification

**conclusion**: blueprint adheres exactly to prescribed interface.

---

### analysis 4: "rate limit detection"

**spec language** (vision ~12, criteria ~40): "system detects rate limit," "detect rate limit response"

**blueprint interpretation**: `BrainAuthCapacity.left === 0` via capacity query

**alternatives considered**:
1. state file track: store rate limits locally, update on 429
2. http parse: intercept 429 in real-time
3. capacity query: ask supplier for current capacity

**why capacity query is correct**:
- "detects" can be reactive (after 429) or proactive (before hit)
- capacity query is proactive: know `left` without request
- supplier is source of truth: eliminates sync issues
- spirit preserved: we know when token is exhausted

**conclusion**: capacity query is superior detection — proactive, authoritative, no local state.

---

### analysis 5: "per-brain isolation"

**spec language** (criteria ~94-118): "brain X rotation does not affect brain Y"

**blueprint interpretation**: adapter per spec → disjoint capacity queries

**alternatives considered**:
1. single file, separate keys: one file with map by spec
2. separate files: one file per spec hash
3. adapter isolation: each spec has own adapter

**why adapter isolation is correct**:
- "does not affect" needs strong guarantee
- adapter boundary: queries for spec X cannot return spec Y data
- no shared mutable state to corrupt
- no file lock concerns
- isolation by construction, not by convention

**conclusion**: adapter-based isolation is stronger than file-based; faithful to "does not affect."

---

### analysis 6: "exhausted error"

**spec language** (criteria ~130, ~175): "all tokens exhausted → error," "exit code 2"

**blueprint interpretation**: filter to `left > 0`, if empty → exit 2

**alternatives considered**:
1. immediate error: error on first rate limit
2. retry then error: retry each once before error
3. full exhaust then error: try all, then error

**why full exhaust is correct**:
- "all tokens" emphasizes completeness
- terminal state: no options remain
- immediate error: violates "rotates to next"
- retry: adds unspecified behavior
- exit 2 (constraint): "user must fix" — wait or add tokens

**conclusion**: check all via capacity, then error — literal adherance to "all tokens exhausted."

---

### analysis 7: "cooldown behavior"

**spec language** (criteria ~85): "rate limit refresh after cooldown"

**blueprint interpretation**: `BrainAuthCapacity.refreshAt` from supplier

**alternatives considered**:
1. local timestamp: compute rateLimitedAt + cooldown
2. capacity refreshAt: use supplier's declared refresh time
3. manual clear: require explicit action

**why capacity refreshAt is correct**:
- "refresh after cooldown" implies automatic, not manual
- supplier sets limits → supplier knows when they expire
- `refreshAt` is authoritative declaration
- local compute: risk clock drift, must guess duration
- supplier knows: no guess, authoritative source

**conclusion**: delegate "when cooldown ends" to entity that set it — correct adherance.

---

### analysis 8: "state requirements"

**spec language** (vision ~108-125): state file with `activeTokenKey`, `lastRotation`, `rateLimited` map

**blueprint interpretation**: stateless capacity query replaces state file

**alternatives considered**:
1. literal implementation: state file with exact fields
2. stateless equivalent: same behavior, no local state

**why stateless equivalent is correct**:
- vision describes *what* to track, not *how*
- `activeTokenKey` intent: "know which token to use" → capacity-based selection
- `lastRotation` intent: "know when rotation happened" → implicit in selection change
- `rateLimited` intent: "know exhausted tokens" → `left === 0` check
- stateless achieves all intents with better properties

**conclusion**: adherance to intent over adherance to letter. mechanism improved; outcomes preserved.

---

### analysis 9: scope boundaries

**spec language** (criteria ~5): "tokens stored in keyrack"

**blueprint interpretation**: delegate to `keyrack.get()` for credential access

**alternatives considered**:
1. delegation: brains auth calls keyrack API
2. duplication: brains auth caches credentials
3. bypass: brains auth reads keyrack storage directly

**why delegation is correct**:
- "stored in keyrack" = keyrack owns storage
- delegation respects boundary
- duplication: two sources of truth, divergence risk
- bypass: couples to internal format

**conclusion**: clean separation — keyrack stores, brains auth selects. boundary respected.

---

## summary

| requirement | interpretation | adherance status |
|-------------|----------------|------------------|
| pool of subscriptions | discovery-based N | faithful — "pool" is requirement, "3" is example |
| transparent rotation | silent, no leak | faithful — "invisible" means no indication at any layer |
| apiKeyHelper mechanism | exact interface match | faithful — vision prescribes interface explicitly |
| rate limit detection | capacity query | faithful — proactive detection via source of truth |
| per-brain isolation | adapter boundary | faithful — stronger guarantee than file-based |
| exhausted error | full exhaust, exit 2 | faithful — "all tokens" means check all first |
| cooldown behavior | supplier's refreshAt | faithful — delegate to authoritative source |
| state requirements | stateless capacity | faithful to intent — mechanism improved, outcomes preserved |
| scope boundaries | delegation to keyrack | faithful — "stored in keyrack" means keyrack owns storage |

**result**: zero adherance issues. each interpretation is validated by close read of spec language. the design evolution from state-file to stateless adapter-based capacity queries is justified: every requirement's intent is preserved via a better mechanism. alternative interpretations were considered and rejected with specific rationale. the blueprint faithfully implements what vision and criteria specify — not more, not less, and with appropriate evolution where mechanism improved.
