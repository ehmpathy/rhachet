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

### 🔴 .the fifth — a PRIOR VERIFICATION claim is a correlate of a CURRENT capability

| the question | the correlate I read | the record | the divergence |
|---|---|---|---|
| does self-say work? | **my own prior claim** that I verified it, plus the invariant brief that states the measurement | a **run in this session** — the command, and its output | the claim was true when written and said naught about the binary on disk now. one question exposed it; a whole unit tier had not |

**measured 2026-09-20**, this wish: a capability the wisher called **key** was reported closed across
a compaction boundary on the strength of a pre-compaction record. re-run after the question, it
**held** — so the claim was not wrong. it was **unwarranted**, which is a different defect and the one
this rule names.

⇒ 🟡 **this is the hardest instance to catch, because the correlate is YOUR OWN first-hand memory.**
the other four correlates are external signals a reader can learn to distrust. *"I verified that"*
arrives with no seam at all — it does not feel like evidence about a past state, it feels like
knowledge.

⇒ and the artifacts **agreed**: an invariant brief, a cure record, a green unit tier. every reviewer
that reads artifacts passed over it, because each was correct. what none of them reads is whether a
run happened **since the boundary**.

## .the counter-move

before a state claim, name the record for that question — then read **that**:

| question shape | the record |
|---|---|
| what did a reviewer conclude? | its own tally (`contract.reviewer-output`) |
| what state is a route stone in? | the last passage record for that stone |
| is an action permitted? | the enforcement path — run it and read the exit |
| what changed, and in which direction? | the commit graph |
| does a capability still work? | **a run in this session** — its command, and its output |

**the enforcement path deserves its own note.** where the state governs whether you *may* act, the
run IS the record — it is the only read that stays correct without knowledge of how the meters
compose. it costs one command and it cannot be wrong about its own subject.

## .the tell

a state claim whose warrant is a signal that merely **accompanies** the state:

- *"the lane failed — it exited non-zero"*
- *"the halt must come from the file — the file is there and it halts"*
- *"I am permitted — the org row says allowed"*
- *"that branch deleted it — the diff shows it gone"*
- 🔴 *"that works — I verified it"* / *"the brief records the measurement"*

reach for the check whenever the evidence is what the state *causes*, rather than what the state
*is*.

🔴 **the last tell needs its own trigger, because it has no seam.** a **compaction boundary voids
every *"I verified that"* that does not carry its own command and output** — so when a capability is
called **key**, its warrant is a run in the current session, never a citation of a run in a prior
one. one command, and it cannot be wrong about its own subject.

## .not the same as a mechanism claim

`rule.forbid.mechanism-inferred-from-outcome` forbids a claim about **how a mechanism works** from
what it produced. this rule forbids a claim about **what state a subject is in** from a signal
beside it. the objects differ, so the cures differ:

| shape | the claim | the cure |
|---|---|---|
| mechanism | *"it works by Y"* | **narrow** — read the operation that decides |
| **state** | *"it IS in state Y"* | **redirect** — read the artifact the system writes |
| absence | *"no X does Y"* | **widen** — search before the claim |
| **measurement** | *"it measured N"* | **re-read** — open the log, never the prose that quoted it |

## 🔴 .the fourth shape — a COPY of a record is not a correlate, and it decays worse

instance 5, measured 2026-09-16 on `v2026_09_11.fix-clone-say`. the question was *"what did this
suite report?"* — a **measurement**, never a state — and the thing I read was neither the record nor
a correlate. it was **my own earlier transcription of the record**.

that shape behaves unlike a correlate, and worse:

| | a correlate | a copy |
|---|---|---|
| at write time | may already diverge | **exactly right** |
| what earns trust | it tracks the state | **it WAS the record** |
| how it fails | diverges once, silently | decays from the moment the record moves on |
| the tell | evidence that *accompanies* the state | 🔴 **none — it reads as a first-hand measurement** |

⇒ **a context compaction is the sharpest decay event.** the prose survives a compaction; the path to
the log it came from usually does not. so a number arrives in the next session with full authority
and no way back to its source.

**what it cost here:** a verification yield carried five acceptance counts — a four-row chunk table
plus two scoped-suite rows. an audit against `.log/…/what=acceptance/` backed **not one of them**,
and the timeline independently forbade the chunks. the two FULL-run rows in the same table, audited
identically, matched their logs to within the skill's own wall-time overhead.

🔴 **the discriminator was not care. it was whether the number still had a path attached.**

⇒ and the tool was never at fault: `git.repo.test` prints both log paths on every exit
(`git.repo.test.sh:1757`, `:1766`). the paths were emitted and I did not carry them.

| when… | then… |
|---|---|
| you cite a measurement you did not take **in this session** | 🔴 the strongest cue. open its log before you cite it |
| a number survived a compaction | it has no path. treat it as unbacked until re-read |
| you record a run's result | **record its log path in the same line.** a number with no path is unverifiable the moment it scrolls |
| a tool prints a log path you do not copy | that path is the citation. the summary is a convenience |
| a table mixes checkable and uncheckable rows | audit them all — the checkable ones that pass prove naught about the rest |

## 🔴 .instance 6 — the DOCBLOCK names the record and the CODE reads the correlate, one line apart

measured 2026-09-16 on `v2026_09_11.fix-clone-say`. the question was *"was this transcript created
after the clone spawned?"* — and the file states the right rule in prose, then implements the wrong
one in code:

```ts
// isTranscriptWithinSpawnWindow.ts — the docblock
//   "a transcript CREATED before this clone spawned cannot be ours"
return input.transcriptMtimeMs >= spawnedAtMs - CLONE_SPAWN_WINDOW_TOLERANCE_MS;
```

| the question | the correlate read | the record | the divergence |
|---|---|---|---|
| when was this file created? | its **`mtime`** | its **`birthtime`** | for a file never appended to again they agree — **for a LIVE session `mtime` is always `now`**, so it is in-window forever |

⇒ **the author knew the rule. they wrote `created` in the sentence above the line that reads
`mtime`.** so this is not ignorance of the record; it is a reach for the field that was *closer to
hand*, which is the one thing every instance here shares.

🔴 **what it cost:** a clone silently linked its **enroller's** transcript, and `rhx clone get`
rendered the enroller's own messages under the `🎧` glyph — *heard from the clone*. the wrong state
read then forged a downstream verdict: `clone say`'s `released` means *the transcript count rose*, so
the enroller's own output satisfied it for a message no peer ever took.

⚠️ **and it defeated its own proof.** a dogfood that says *"reply with token X"* and reads `X` back
from the enroller's transcript has measured the enroller — the token is present because the enroller
wrote it into the prompt. **a test can be a correlate too.**

| when… | then… |
|---|---|
| you gate on a file's age | `mtime` answers *when was it last written*. **`birthtime` answers *when was it created*.** name which you meant |
| a file may still be **open and appended to** | 🔴 the sharpest cue. its `mtime` is `now`, so every mtime window admits it |
| a docblock says `created` and the line below says `mtime` | the defect, fully visible, in one screen |
| a probe reads back a token **you supplied** | it can be satisfied by your own writes. what would distinguish the peer's echo from yours? |

### ✅ the cure — and it is the one instance here that names what a REDIRECT costs

cured 2026-09-17. the predicate now reads `birthtime`, with a trustworthiness bound, and degrades to
`mtime` on every untrustworthy read — so it **narrows where the record is knowable and never widens
where it is not**:

```ts
input.transcriptBirthtimeMs !== null &&          // the fs reported one
input.transcriptBirthtimeMs > 0 &&               // and keeps one
input.transcriptBirthtimeMs <= input.transcriptMtimeMs   // and it is not a stamp it invents
  ? input.transcriptBirthtimeMs
  : input.transcriptMtimeMs;
```

🟡 **the third clause is what the other five instances never needed.** a passage record, a commit
graph, and a reviewer tally are each *always* readable. a **filesystem** record is not — so a
redirect to the record owes a stated fallback, and a naive swap would have put every transcript
out of window and given every clone an empty history.

⇒ **the cure for a correlate is a redirect. the cure for an UNAVAILABLE record is a declared
degrade.** name which one you are owed before you swap the field.

⇒ full record, with the mutation proof at both grains:
`.dream/2026_09_16.a-clone-adopts-its-parents-live-transcript-via-mtime.dream.md`

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
- a **measurement** cited in a yield, review, or escalation with no path to the log that produced it,
  where the tool emitted one = **blocker**
- a measurement carried across a compaction and re-cited without a re-read = **blocker**

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
