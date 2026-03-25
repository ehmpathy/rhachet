# self-review r3: has-questioned-questions

## third pass — fresh eyes

let me re-read the updated vision with the triaged questions and verify each is properly classified.

---

## verified: [answered] questions

### os.daemon manifest persistence

**classification:** [answered] — no manifest entry

**why this holds:**
- wish explicitly says "without persistent storage in any vault"
- "persistent" = disk, manifest is disk
- pure ephemeral = daemon memory only
- consistent with the vault's purpose

### os.daemon unlock behavior

**classification:** [answered] — report "already unlocked"

**why this holds:**
- keys set to daemon are already in daemon
- unlock's job is to move secrets from vaults to daemon
- if already in daemon, unlock is a no-op
- "already unlocked" report is informative and correct

### guided picker for 1password

**classification:** [answered] — manual exid for v1

**why this holds:**
- guided picker requires `op item list` integration
- scope creep for initial implementation
- manual entry is simple and works
- can always add picker later

---

## verified: [wisher] questions

### exid validation on set

**classification:** [wisher] — need decision

**why this needs wisher:**
- two valid approaches exist:
  - a: validate `op whoami` only (defer exid validation)
  - b: validate `op read $exid` (reveals secret earlier)
- both have tradeoffs
- recommendation is option a, but wisher should confirm

**what I updated in vision:**
- added recommendation with rationale
- marked as [wisher] for decision

---

## verified: [research] questions

### op cli + service accounts

**classification:** [research] — needs external verification

**why this needs research:**
- 1password docs suggest it works
- need to confirm `OP_SERVICE_ACCOUNT_TOKEN` + `op read` integration
- affects ci usecase

### op cli auth modes

**classification:** [research] — needs documentation

**why this needs research:**
- multiple auth modes exist (biometric, master password, service account)
- need to document for user guidance
- affects unlock ux

### op cli error codes

**classification:** [research] — needs map to messages

**why this needs research:**
- op cli returns various errors
- need to map them to helpful keyrack messages
- affects error ux

---

## issues found in r3

### issue: vision "what is awkward" section has unanswered questions

the "what is awkward" section lists concerns but some were answered in triage:

1. "os.daemon: set without persistence?" — this is a feature, not a bug. clarified in assumptions.
2. "unlock flow for os.daemon keys" — answered: report "already unlocked"

**fix:** these aren't open questions anymore — they're resolved design decisions. vision could be cleaner by move of resolved items out of "awkward" section, but leave them for transparency is also valid.

**decision:** leave them for transparency. they document the design tradeoffs.

---

## final verification

| question | classification | verified |
|----------|----------------|----------|
| os.daemon manifest? | [answered] | yes — wish is explicit |
| os.daemon unlock? | [answered] | yes — logic is sound |
| exid validation? | [wisher] | yes — needs decision |
| guided picker? | [answered] | yes — v1 scope |
| op + service accounts? | [research] | yes — needs external docs |
| op auth modes? | [research] | yes — needs documentation |
| op error codes? | [research] | yes — needs to map errors |

---

## summary

all questions properly triaged:
- 3 [answered] — decided now via logic
- 1 [wisher] — needs wisher input with recommendation
- 3 [research] — deferred to research phase

vision updated to reflect these classifications.
