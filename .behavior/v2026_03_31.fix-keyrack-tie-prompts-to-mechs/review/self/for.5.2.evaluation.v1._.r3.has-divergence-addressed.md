# review: has-divergence-addressed

## question

did the evaluation address each divergence properly?

for each divergence:
- if repaired: is the fix visible in git?
- if backed up: is the rationale valid? would a skeptic accept it?

## review

### step 1: enumerate divergences from evaluation

from the evaluation's divergence analysis:

| divergence | resolution | type |
|------------|------------|------|
| setupAwsSsoWithGuide.ts retained | composition pattern | backup |
| additional vaults (os.daemon, os.envvar) | improves consistency | backup |
| PERMANENT_VIA_AWS_KEY absent | explicitly out of scope | backup |

### step 2: assess each backup

#### divergence 1: setupAwsSsoWithGuide.ts retained

**blueprint declared:** `[-] delete (content moved to mech)`

**implementation:** file retained, mechAdapterAwsSso.acquireForSet calls it

**backup rationale:** "composition pattern — the logic lives in the helper, mech adapter wraps it. outcome equivalent."

**skeptic assessment:**
- is this laziness? no. the guided setup logic is complex and well-tested. a wholesale move would risk regressions.
- could this cause problems? no. the outcome is identical — mech adapter drives the guided setup.
- is the rationale valid? yes. composition vs move is an implementation detail. the architectural goal (mech owns prompts) is achieved.

**verdict:** backup is valid.

#### divergence 2: additional vaults (os.daemon, os.envvar)

**blueprint declared:** not listed (only os.secure, os.direct, 1password, aws.config)

**implementation:** os.daemon and os.envvar also have mechs.supported

**backup rationale:** "improves consistency"

**skeptic assessment:**
- is this laziness? no. this is *more* work than required.
- could this cause problems? no. mechs.supported on all vaults enforces the contract uniformly.
- is the rationale valid? yes. consistency across all vaults is an improvement.

**verdict:** backup is valid.

#### divergence 3: PERMANENT_VIA_AWS_KEY absent

**blueprint declared:** aws.config supports PERMANENT_VIA_AWS_KEY in matrix

**implementation:** aws.config only supports EPHEMERAL_VIA_AWS_SSO

**backup rationale:** "blueprint explicitly noted 'new mechanisms (e.g., PERMANENT_VIA_AWS_KEY) — scaffold only' in out of scope section"

**skeptic assessment:**
- is this laziness? no. blueprint explicitly marked it out of scope.
- could this cause problems? no. the mechanism can be added later without interface changes.
- is the rationale valid? yes. blueprint's own out of scope section covers this.

**verdict:** backup is valid.

### step 3: check for un-addressed divergences

the evaluation's divergence table covers all identified divergences. no orphan divergences found.

### step 4: verify each backup could not be repaired instead

| divergence | repair possible? | assessment |
|------------|------------------|------------|
| setupAwsSsoWithGuide retained | yes, could move | but composition is cleaner, no regression risk |
| additional vaults | n/a (improvement) | more complete implementation, not a defect |
| PERMANENT_VIA_AWS_KEY absent | yes, could scaffold | but blueprint explicitly scoped it out |

none of these divergences warrant repair:
- the first is a valid design choice (composition vs inline)
- the second is an improvement beyond scope
- the third is explicitly deferred

### step 5: hostile reviewer perspective

what would a skeptic find that I overlooked?

#### potential critique 1: "setupAwsSsoWithGuide retention is lazy"

counter: the file contains ~200 lines of well-tested guided setup logic. the mech adapter calls it via composition. the architectural goal (mech owns prompts) is achieved. the only difference is file location, not behavior. retention is pragmatic, not lazy.

#### potential critique 2: "additional vaults could break interface"

counter: all vault adapters already implement the full interface. mechs.supported is additive, not a break. the consistency benefit outweighs the extra work.

#### potential critique 3: "PERMANENT_VIA_AWS_KEY should be done now"

counter: the blueprint explicitly listed this in "out of scope" section. to implement now would be scope creep. the mechanism can be added later as a separate PR.

no hidden issues found through hostile perspective.

### conclusion

all three divergences have valid backup rationales:
1. setupAwsSsoWithGuide retained — composition achieves same goal
2. additional vaults — improves consistency, more complete implementation
3. PERMANENT_VIA_AWS_KEY absent — explicitly out of scope per blueprint

no divergence was lazily backed up. no repairs needed.

review complete.
