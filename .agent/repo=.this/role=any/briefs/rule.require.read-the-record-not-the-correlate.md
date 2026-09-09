# rule.require.read-the-record-not-the-correlate

## .what

for every question of **state**, exactly one artifact is the **record** — what the system writes
when the state changes. all else that moves with it is a **correlate**. read the record.

a correlate is not a lie. it tracks the state closely, often perfectly, for a long while. that is
what makes it dangerous: it earns your trust across many reads, then diverges once, silently, at
the moment the answer matters.

## .why

the correlate and the record agree everywhere anyone tested — that is *why* the correlate looked
authoritative. so the divergence never arrives as a contradiction you would catch. it arrives as a
confident, first-hand, wrong answer.

⚠️ and a state read is almost always the **premise of a decision** rather than the decision
itself. so the error does not surface where it was made. it surfaces one step later, under the
authority of the step that carried it.

## .the four instances

all four cost a round on one route, `v2026_08_25.fix-keyrack-all-skips-manifest`, 2026-09-05→07:

| the question | the correlate I read | the record | the divergence |
|---|---|---|---|
| did this reviewer find defects? | its **process exit** (`constraint ✋`) | its tallied `N blockers / N nitpicks` | exited non-zero on a harness stall while its verdict read `0/0 — clean` |
| what state is this stone in? | the **blocker artifact** on disk | the last **passage record** (`passage.jsonl`) | artifact fully struck through; a `blocked` record still stood |
| may I commit on this tree? | **one meter row** (`org: allowed`) | the **composition**, or the enforcement path | org is a veto lifted; the local grant was absent ⇒ no quota |
| which side removed this file? | the **diff output** | the **commit graph** (`git log A..B`) | `git diff A B` is byte-identical whether B removed or A added |

⇒ **four different subsystems, one error.** that is what makes it a law rather than four lessons.

## .the counter-move

before a state claim, name the record for that question — then read **that**:

| question shape | the record |
|---|---|
| what did a reviewer conclude? | its own tally (`contract.reviewer-output`) |
| what state is a route stone in? | the last passage record for that stone |
| is an action permitted? | the enforcement path — run it and read the exit |
| what changed, and in which direction? | the commit graph |

**the enforcement path deserves its own note.** where the state governs whether you *may* act, the
run IS the record — it is the only read that stays correct without knowledge of how the meters
compose. it costs one command and it cannot be wrong about its own subject.

## .the tell

a state claim whose warrant is a signal that merely **accompanies** the state:

- *"the lane failed — it exited non-zero"*
- *"the halt must come from the file — the file is there and it halts"*
- *"I am permitted — the org row says allowed"*
- *"that branch deleted it — the diff shows it gone"*

reach for the check whenever the evidence is what the state *causes*, rather than what the state
*is*.

## .not the same as a mechanism claim

`rule.forbid.mechanism-inferred-from-outcome` forbids a claim about **how a mechanism works** from
what it produced. this rule forbids a claim about **what state a subject is in** from a signal
beside it. the objects differ, so the cures differ:

| shape | the claim | the cure |
|---|---|---|
| mechanism | *"it works by Y"* | **narrow** — read the operation that decides |
| **state** | *"it IS in state Y"* | **redirect** — read the artifact the system writes |
| absence | *"no X does Y"* | **widen** — search before the claim |

⚠️ they compound. instance 2 above was **both**: I read the stone's state off an artifact, then
claimed a mechanism (*"route.drive halts on presence"*) to explain what I had misread. a wrong
state read invites a mechanism invented to justify it.

## .why a wrong state read costs more than it looks

it prescribes a **wrong cure**, and the wrong cure is usually destructive:

- *"halts on file presence"* ⇒ delete the artifact — clears no halt, destroys the audit trail
- *"the org row grants me quota"* ⇒ act as though granted — takes a pass never given
- *"that branch deleted the file"* ⇒ restore it — reverts a change the other side legitimately made

⇒ the cost is not the wrong answer. it is the confident action taken on it.

## .enforcement

- a claim about a system's state, in a yield, review, or escalation, sourced from a correlate
  rather than the record = **blocker**
- a decision acted on such a claim = **blocker** — the record must be read before the act
- a permission claim not backed by the enforcement path, where one exists = **blocker**

## .see also

- `define.invariant.verdict-is-not-passage.md` — instance 1, stated as an invariant
- `define.invariant.halt-is-driven-by-the-passage-record.md` — instance 2
- `rule.forbid.mechanism-inferred-from-outcome` — the peer; how-it-works, never what-state
- `rule.require.search-before-you-claim-absence` — the third of the family; the widen case
- `rule.require.trust-but-verify` (ehmpathy/mechanic) — the parent discipline all three serve

⚠️ **instance 4 has no brief in this repo.** it is dispatched to its owner as
`ehmpathy/rhachet-roles-ehmpathy#644` (a direction-explicit `rhx git.diff --since main`, plus a
forbid on the raw two-arg form), and is QUEUED there. cited here as the fourth data point, never
as an extant local rule — to link a brief that does not exist would be this rule's own error,
committed in its `.see also`.
