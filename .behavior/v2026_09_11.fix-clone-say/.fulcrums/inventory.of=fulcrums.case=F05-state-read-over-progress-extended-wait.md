# F05 — a state read, over a progress-extended transcript wait

**rework** clean · **status** OPEN · **confidence** 70% — the option within the fork is sound; the scope call (screen read vs a cheaper transcript wait) is the wisher's

## .the fork, stated fairly

the issue asserts the transcript approach cannot be saved:

> *"the transcript-poll approach only proves the FINAL state … it structurally cannot see the
> intermediate, safe 'queued' state at all, so it cannot avoid a false failure when the queue-wait
> exceeds the fixed timeout."*

🟡 **that is true of a FIXED bound, and a bound need not be fixed.** a third option the issue does
not weigh:

| option | cost |
|---|---|
| **A** — the screen read (this vision) | a new dep, a new socket verb, an invariant amendment, a TUI tie |
| **B** — a **progress-extended** wait: while the transcript GROWS (the brain writes assistant + tool records mid-turn), extend the deadline. fail only when the transcript goes quiet AND our message is absent | solves the primary ask with **no dep, no protocol change, no invariant change, no TUI tie**. solves the secondary ask not at all. 🔴 **and solves R3 only HALFWAY** — see the collapse table below |
| **C** — both | two mechanisms for one defect |

## .taken, and why at the time

**A alone.**

- **B cannot serve the secondary ask.** a pre-check for a human's half-typed input is unobtainable
  from the transcript at any bound — the input line is not in it. so B leaves case=2 and case=6 open,
  and those are the two cells that destroy a human's work rather than a nudge
- **C builds two mechanisms where one suffices.** once the screen read exists, the bound is only a
  trigger to go look, so a smarter bound buys no verdict
- the wisher asked for the screen read by name, and it is the superset

⚠️ **but B would be the right answer to a narrower wish.** if the wisher wants the cheap fix — no new
dependency, no security surface, land it today — B is a genuinely good option that this vision
rejects, and the rejection is the call I am least sure of.

### 🔴 .what a B verdict actually deletes — and the rows it HALVES

the rows a wisher most needs are the ones a shorter list omits:

| falls under B | why |
|---|---|
| R2 · V4 · V5 · V6 · V7 | the screen read and every term that carries it |
| 🔴 **R4** — pre-check the input line | **the wisher's own secondary ask.** an unsubmitted line is not in the transcript, at any bound |
| 🔴 **V1** — the `withheld` verdict | it names R4's refusal; with no pre-check there is no refusal to name |
| 🔴 **V3** — never answer a permission prompt | a modal is visible on the screen and nowhere else |
| 🔴 **V2** — the `unreadable` verdict | it exists because a **peer** may be unable to answer a **probe**; option B has no probe verb, so a daemon's version is immaterial — `say` reads the transcript itself. **both** causes (`peer-probe-blind`, `feed-not-live`) lose their cause, and a verdict with no reachable cause is the defect F07's entry names for `absent` |
| 🔴 **V8** — `verdict` + `reason` + `probe` in the json | 🟡 **HALF** — `verdict` survives at **two** values; **`reason` and `probe` fall**. `probe` states the strength of a read that no longer happens; `reason` discriminates causes that no longer exist (`withheld` gone with V1, `unreadable` gone with V2, `buffered`/`absent` fused) ⇒ the machine channel keeps its discriminator and loses the field a caller branches on for the **safe action** |
| 🔴 **R3** — tell `buffered` / `enqueued` / `absent` apart | 🟡 **HALF.** `enqueued` separates by a longer wait; **`buffered` and `absent` FUSE** — both are *"never appeared in the transcript"*. the issue defines both over the **screen** (*"in the live input line"* · *"neither the input line nor the queued region"*), and a transcript has neither. ⇒ B fuses the exact pair whose safe actions are **opposite**: a re-send doubles the paste on `buffered` and is correct on `absent` |

⇒ and with them **case=2** · 🔴 **case=4** · **case=6** — demoed critipaths, one of them the box's
highest-cost cell. `case=4`'s whole subject is the probe-blind degrade, so a lever that deletes the
probe deletes the demo outright.

🔴 **the R3 row is the sharpest here — a table with only a full-collapse column has no cell for a row
that half-falls.** R3 is the wisher's ask with all three words quoted verbatim, and it exists to open
exactly the seam B closes. ⇒ **B does not shorten R3; it collapses R3 at the one seam R3 exists to
open.** the discipline this section holds to: **enumerate the members, never total them** — a
half-collapse has no place in a sum (`rule.require.a-cue-is-not-a-claim`).

#### 🔴 .and the fulcrums below

| fulcrum | deleted because |
|---|---|
| **F02** | its whole subject is the probe's reply shape. no probe, no reply, no fork |
| **F04** | the dep exists to model a screen. no screen, no dep |
| **F06** | its `--onDirty` default sits on a pre-check B deletes, and its no-`force` half on a modal only a screen sees |
| **F08** | the `kind` enum mixes a verb and a noun only once a **second** wire verb exists |
| **F07** | its question is *"is case=6 in scope?"*, and B makes case=6 unreachable — so the scope call is moot rather than answered |

⚠️ **this table and the inventory's lever table must name the SAME set** — a wisher who prices the
lever off either alone must read one answer to *what does this verdict cost?* neither may be short of
the other. the discipline is the same on both pages: **enumerate, never total.**

🔴 **the members are enumerated in several places, and the reason each falls has one owner.** a
citation beside a copy reads as assurance that no copy exists, so be exact about what each passage
holds:

| the part | where it lives |
|---|---|
| the **members** | 🔴 **enumerated, never totalled** — this table · the inventory's lever row · the yield's `.evaluation` line · the yield's `.the fulcrums` lever table · the yield's **Q0 cell**. a wisher prices the lever at each, and a struck member shows as an absence in a list |
| the **reason** each falls | one owner: **this table**. prose drifts silently, and a reader holds one copy at a time |
| the **count** of members | struck everywhere (`rule.require.a-cue-is-not-a-claim`) |

🟡 **F07 is the subtle row.** the inventory treats F07 as a *second lever*, which is right — it can be
ruled independently and it deletes things F05 does not. but the tie runs one way: **F05 = B moots F07,
while F07 = out leaves F05 whole.** so F07 is a lever *and* a dependent, and an entry can be both.

🟡 so the honest frame for the council is not *"A or B, a mechanism choice"* but: **B fulfills the
issue's PRIMARY ask cheaply, and closes neither its SECONDARY ask nor the safety hole this drive
found.** that is a scope decision dressed as a mechanism, and it is the wisher's to make — which is
exactly why this entry is best-guessed rather than blocked on.

## 🟡 .and B would improve the path A cannot reach

case=4's **probe-blind** clone has no read channel by construction, so its verify is today's
transcript poll forever. B is exactly what would make that path good rather than merely honest.

⇒ so C is not obviously wrong. it is two mechanisms, and one of them serves a population A cannot.

## .rework, and why

**clean.** B is additive to `getCloneSubmitLanded` — the poll loop already ticks every 250ms, so a
growth check is a stat of the same file inside the same loop. a later addition changes one operation
and no caller.

## .confidence 70%, and why it is low

two reasons, and the first is a measurement I could not take:

- **B's premise is unverified.** it rests on the transcript jsonl growth mid-turn (assistant and
  tool records written as the turn proceeds). I could not check — `rule.forbid.reads-outside-the-repo`
  bars the read, the same bar that leaves A1 open in the yield. if the jsonl does NOT grow mid-turn,
  B is void and this fulcrum collapses to "A, obviously"
- 🔴 **A's premise is unverified TOO.** option A rests on the yield's **Q6**: *does claude-code render
  a queued message on screen at all?* if it does not, the screen count never rises, neither count
  rises, and the verdict table returns **`absent`, exit 1** — today's false failure, reproduced by the
  new mechanism, after a dep, a socket verb, and an amended invariant were paid for. ⇒ both options
  rest on an unmeasured premise; to state only B's would be `rule.forbid.obfuscation` — every sentence
  true, the one the reader needs absent
- 🟡 **the joint case is the sharpest.** both premises can be false at once — no mid-turn jsonl growth
  AND no rendered queue — and then **the primary ask is unreachable by either route**, so the wish
  needs a third mechanism rather than a verdict between these two. one realbrain dogfood settles both
- 🔴 **the two premises are testimony-grade but NOT equally supported.** the evidence differs in kind:

  | option | its premise | what stands behind it |
  |---|---|---|
  | **A** | a queued message **renders** on screen | 🎙️ the wisher's own first-person observation: *"the message shows in the queued messages region"* (#527, quoted in the yield's `.their words vs ours`) |
  | **B** | the transcript jsonl **grows** mid-turn | a hypothesis the issue attributes to a reviewer. **no observation of the file is reported by anyone** |

  ⇒ so the honest statement is *"both unmeasured, and A's has a report of the exact behavior while B's
  has a conjecture about a file"* — a real asymmetry, and one that favors the option this entry took

- 🟡 **the two premises are also CORRELATED, which a reader would otherwise price as independent.**
  both are claims about one brain's mid-turn behavior, and the human who reported them read one TUI
  over one set of sessions. ⇒ a misread of what that TUI does mid-turn moves both at once, so *"both
  false"* is likelier than two independent unknowns would suggest
- **the scope judgment is the wisher's.** A is right for the wish as written and B is right for a
  smaller wish, and which wish this is was never mine to decide

## .where

- `src/domain.operations/clone/getCloneSubmitLanded.ts:37-47` — the poll loop B would extend
- `1.vision.yield.md`, `.the aha` — the argument that a bound cannot part `not yet` from `never`
- `1.vision.experience.case=3` — why a longer fixed bound is a bad trade
- `1.vision.experience.case=4` — the population B would serve and A cannot

### 🔴 .the demos that RENDER this call — ALL SEVEN

the two rows in `.where` above cite demos that **argue** for A; they are not the set that **renders**
it. the render set is every demo, because every `case=N` renders a probe and so presumes A.

⇒ **a B verdict does not amend the demo set, it replaces it** — case=2 · 🔴 case=4 · case=6 have no
B-shaped form at all,
since a transcript cannot see a half-typed line or a modal at any bound, and a peer that answers no
probe is indistinguishable from one that does when no probe is ever sent.

🟡 **F03 is this same lever from the socket's side**, and the two must be ruled together — see that
entry's demo section. F05 asks *should `say` read the screen?*; F03 asks *may the socket carry the
read?* a **no** to either collapses both.

🔴 **so the table above is F03's collapse set too, and F03's entry points here rather than keep its
own prose list.** the two verdicts yield the identical outcome, so the set is identical **by
construction** — which makes a pointer strictly stronger than a copy, since it cannot go short as
this table grows. ⇒ this entry is the owner for **both** sides of the lever.

## .the verdict

🔴 **RULED 2026-09-21 — option A. the state read stays.** the wisher ruled it together with F03, as
this entry asked, and in the affirmative: the read channel ships, and it grew a standalone CLI surface
(F15) in the same sentence. so the collapse table above never collapsed — every one of V2 · V3 · R4 ·
R5 and the `case=2` / `case=4` / `case=6` demos holds.

⇒ the fork was correctly IDENTIFIED and correctly DEFERRED: it was the largest lever on the list, the
drive had no seat to rule a scope call of that size, and it cost one sentence to settle at the close.
⇒ `rule.always.defer-fulcrums-to-last`, as written.

🟡 **the 70% guess was right in direction, and the 30% was the half worth a row.** a 30% chance of a
collapse that drops three requirements and three demos is exactly the weight a fulcrum exists to raise
— the record let the wisher settle it in one pass rather than re-derive the lever from the code.
