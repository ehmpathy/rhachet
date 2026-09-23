# F01 — the say verdict vocabulary collides with the wire ack vocabulary, on TWO words

**rework** clean · **status** OPEN · **confidence** 72% — the fork is two collisions, and option B reaches only one of the two

## .the fork, stated fairly

`asCloneDispatchAck.ts:12` declares the wire vocabulary:

```ts
export type CloneDispatchAckPhase = 'queued' | 'delivered' | 'rejected';
```

the new verdict set needs two of those three words, in other senses:

| word | the WIRE sense | the SAY sense | where the wire sense is declared |
|---|---|---|---|
| `queued` | the server took it into OUR write queue | **the brain** holds it behind an active turn | `asCloneDispatchAck.ts:7` |
| `delivered` | the bytes reached the pty, whole | the submit was confirmed by the transcript | `sayClone.ts:21` |

🔴 **the `delivered` collision is already LIVE on disk.** `data: { delivered: true }`
(`invokeCloneSay.ts:161`) carries the say sense while the ack carries the wire sense. case=3 renders
it verbatim: for one message the ack is `delivered` **and** the json is `delivered: false` — both
correct in their own layer, and a reader cannot tell that without the table above.

⇒ so this is not one fork. it is one fork (`queued`, ours to introduce) beside one **extant** defect
(`delivered`, ours to disturb) — and `rule.forbid.domain-term-ambiguity` warns at exactly this seam:

> *"enumerate the senses of the word you keep BEFORE the inconsistency settles"*

| option | reaches | cost |
|---|---|---|
| **A** — rename the ack phases to `accepted` + `handed`, tolerant parse both directions; `data.delivered` keeps the say sense | **both** | two wire literals, two live processes that may disagree across a version boundary |
| **B** — give the verdicts other words | 🔴 **`queued` only** — see below | the verdicts lose the words their own users say |
| **C** — qualify in prose, keep every literal | both | two overloaded terms in one contract — the rule blocks it outright |
| **D** — rename only `queued`, leave `delivered` overloaded | `queued` only | the cheaper half, and it ships the live collision my own demo exhibits |

### 🔴 B is a HALF option

the fork is two collisions, and **B can only reach one of them**:

| the collision | is the say-side word a VERDICT? | so does B reach it? |
|---|---|---|
| `queued` — wire write-queue vs brain hold | ✅ yes, `queued` is one of the six | ✅ pick another verdict word, collision gone |
| `delivered` — wire bytes-to-pty vs `data.delivered` | 🔴 **no.** the say-side verdict is `landed`; `delivered` is the **legacy published boolean field**, which no verdict names | 🔴 **no. it is untouched** |

⇒ **so a wisher who rules B gets D's outcome on the `delivered` half** — the live collision case=3
renders on the page, shipped — and D is the option the ⚠️ above refuses. the options
table carries a `reaches` column for exactly this reason: without it, every row reads as a whole-fork
alternative, and the half-reach of B is invisible.

🟡 **B remains a legitimate call on its half**, and it is the cheapest one there: it changes a word
this wish has not shipped yet, where A changes a literal two live processes already exchange. so the
honest combination a council should weigh is **B, plus A applied to `delivered` alone** — which buys
the rename's version-skew risk on one literal instead of two.

## .taken, and why at the time

🔴 **no rename — the wire still ships `queued | delivered | rejected` as it did before this wish**
(`asCloneDispatchAck.ts:12`, unchanged). the say verdict set uses its OWN words (`released`,
`enqueued`, …), so the collision is contained to prose and the two wire literals were left untouched.
a rename of a live wire literal exchanged by two processes across a version boundary is not a call to
make inside this wish's own hand — it is the wisher's, surfaced as Q4.

**A is the RECOMMENDATION carried up to the wisher, not a decision enacted here.** on the rule's own
sort, both pairs differ by **context** (two boundaries), never by concept, so the repair is to
**qualify** — and a rename of the internal literal (`queued → accepted`, `delivered → handed`) is how
you qualify a wire word with no room for a prefix. the human-faced surface keeps the human's word; the
internal ack would yield, twice. that is the option A a council should weigh — but the wire on disk
does not yet reflect it.

`handed` is proposed for the wire's second phase because *"the bytes were HANDED to the clone's pty
input"* is `sayClone.ts:21`'s own sentence for it — **adopted, never coined**.

⚠️ **D was the cheap option and is the one to refuse.** it would ship a collision my own case=3
demonstrates on the page, which `rule.forbid.obfuscation` grades worse than an unnoticed one: I would
have seen it and shipped it anyway. the safe default — the one this wish took — is to ship neither
rename and let the wisher rule the whole fork at once.

## .rework, and why

**clean**, with one pinned edge. the ack phases are consumed in two places
(`sayClone.ts`, the server's `reply`) and rendered to no human. but `data.delivered` **is** published,
so its sense is pinned by this decision — a later reversal would touch a consumer contract rather
than two internal literals.

🔴 **the `queued` half carries a second defensible call.** the rationale above — *"a rename of the
internal literal is how you qualify a wire word that has no room for a prefix"* — is true of
`delivered`, whose say-side sense sits in a **published field** we cannot rename. it is **not** true of
`queued`, whose say-side sense sits in a word this wish has not shipped yet. ⇒ for that half, to
qualify our own unshipped word costs a preference; to qualify theirs costs a version boundary.

## .confidence 72%

two surfaces hold the 28%. the version-skew surface: a tolerant parse must run in **both**
directions, and only one direction is obvious. and `data.delivered` itself — I keep it for
back-compat, and thereby keep a word whose two senses sit one layer apart **by deliberate choice
rather than by accident**. that is defensible, and it is still an overload a reviewer may rule
against — the alternative (drop the field, bump a major) is a call the wisher owns, not mine.

## .where

- `src/domain.operations/clone/socket/asCloneDispatchAck.ts:7,12,19`
- `src/domain.operations/clone/socket/sayClone.ts:21,98-99` — the wire sense, and its own word `handed`
- `src/domain.operations/clone/socket/genCloneSocketServer.ts:108,190`
- `src/contract/cli/invokeCloneSay.ts:161` — the live say-sense `delivered`
- `1.vision.yield.md`, `.the machine channel` + `.the verdict set`

### 🔴 .the demos that RENDER this call

| demo | what it renders | marked unruled? |
|---|---|---|
| `case=3` | the **collision itself** — one message whose ack is `delivered` and whose json is `delivered: false`, both correct in their own layer | ✅ yes |
| `case=1` t1 | the **SHIPPED wire**, `queued` then `delivered` — the pre-rename literals — and it names F01 option A as the rename that *would* apply, never as one already applied | ✅ yes, and it names option A by letter |

🔴 **`case=1` t1 renders the SHIPPED wire and marks A as the unresolved option** — this matches the
`.taken` above (no rename shipped). a demo that rendered `accepted` then `handed` as fact would assert
a rename this wish did not perform; a demo that rendered `accepted` then `delivered` would be **half**
the rename, this entry's own **option D**, the row the ⚠️ above says to refuse. so the demo and the
entry check each other: a fulcrum that lists its demos catches a demo that renders the wrong option.

⇒ **a fulcrum that does not list its demos cannot audit them**, and an unaudited demo is the path by
which a reserved call is settled downstream (the criteria stage seeds bdd from the demos).

### 🟡 .the CORPUS this entry covers — and the third collision it does NOT

this entry's subject is the **wire ack** corpus (`asCloneDispatchAck`), and its answer there is two.
that is not the wish's total, and a reader who takes it for the total is misled by omission:

| collision | corpus | F01's business? |
|---|---|---|
| `queued` — wire write-queue vs brain hold | the wire ack | ✅ yes |
| `delivered` — wire bytes-to-pty vs `data.delivered` | the wire ack ↔ the published cli field | ✅ yes |
| 🔴 `landed` — **our exit-0 success** vs the **issue's** label for the drop case | the wisher's issue prose ↔ a repo dop name | 🔴 **no** |

⇒ the third is recorded at `1.vision.yield.md`, `.their words vs ours`, and **it asks no fork**:
`rule.forbid.domain-term-ambiguity` scopes to a contract, and an issue's prose is not one, so no
rename is owed and this entry's options are unchanged. what it owes is a **record**, because the
wisher wrote the other usage and is the one reader certain to trip on it at the council.

🟡 stated here rather than only there, so a council that opens F01 to price Q4 does not conclude the
vocabulary audit was two words wide.

## .the verdict

unruled. ⚠️ **surfaced to the wisher as Q4, widened**: the ask is no longer *"may I rename one wire
literal?"* but *"may I rename two — and may `data.delivered` keep the say sense?"*
