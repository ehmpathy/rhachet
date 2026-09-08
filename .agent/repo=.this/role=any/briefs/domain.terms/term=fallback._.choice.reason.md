# domain.term.choice.reason: fallback

## .etymology

from the military sense — a **fallback position**, the ground you hold once the forward one is
lost. the metaphor carries the two properties the domain needs: there is a *first* position, and
you arrive at the second only by the first's failure.

`fallback` was already the repo's de-facto word before it was itemized: `getEnvAllFallbackSlug` is
a declared dop, `socketFallback` was a declared field, and the term appears in prose across four
other domain-term clusters (`mech`, `decide`, `reach`, `spawn`). the itemization records a settled
word rather than proposes a new one.

⚠️ **`socketFallback` was renamed out on 2026-09-05** — see the RESOLVED dispute below. that it was
a *de-facto* use is precisely how it slipped in: an inherited word carries no argument with it, so
the itemization is what forced the argument to be had.

## .the rejected synonyms, and why each fails

| rejected | why |
|----------|-----|
| `default` | applies when **no choice was made**; a fallback applies when a choice was made and failed. `term=reach._.choice._.md` already rejects `default key` on these grounds, so to admit `default` here would re-open a settled dispute |
| `alternate` | names a peer, not a successor — two alternates have no order between them, and the order is the whole guarantee |
| `secondary` | names rank, not trigger. a secondary may be consulted always; a fallback is consulted only on failure |
| `backup` | in this repo's neighborhood `backup` reads as a **copy kept against loss** (a data concern), which collides with the path sense |
| `degraded` | names the outcome's quality, never the path's order — see the say-file's `.not a synonym of` |
| `plan-b` | informal, and it implies a plan chosen in advance rather than a branch reached on a fault |

## .disputes

### dispute: degraded — raised 2026-08-30 — status: RESOLVED (keep `fallback`; they are distinct concepts)
- raised.by  = driver, on the `v2026_08_25.fix-node-pty-install` drive
- claim      = the clone's socket-absent path is described as "degraded" in the wish and in the
               `--no-socket` design, so `degraded` and `fallback` may name one concept
- counter    = they are orthogonal, and the pty case proves it. a bundled pty copy reached by
               fallback is byte-identical to the primary — a fallback with **no** degradation. and
               `--no-socket` is a degraded outcome reached by an **opt-out**, with no primary that
               failed — degradation with **no** fallback. one word for both would lose the ability
               to say which of the two holds
- resolution = keep both. `fallback` names the path's order; `degraded` names the outcome's
               quality. record `degraded` as a forbidden synonym of `fallback`

### dispute: socketFallback is not a fallback — raised 2026-08-30 — status: RESOLVED 2026-09-05 (rename the REF; keep the word)

> ⚠️ **this entry keeps the OLD name verbatim**, because the disputed word IS its subject. every
> other file in this repo now reads `socketOmissionReason`; the map is
> `socketFallback` → `socketOmissionReason`, `CloneSocketFallback` → `CloneSocketOmissionReason`,
> `computeCloneSocketFallback` → `computeCloneSocketOmissionReason`,
> `asCloneSocketFallbackError` → `asCloneSocketOmissionReasonError`.

- raised.by  = human, on the `v2026_08_25.fix-node-pty-install` drive
               > *"why is there even talk of a fallback at all? why would we ever need a fallback?"*
- claim      = `socketFallback` does not name a fallback under this term's own definition, so
               one of the three declared uses in the say-file is a misuse:
               1. **this term defines a fallback as a PATH** — *"the path taken only after the
                  preferred path fails"* — and the property it rests on is *"a fallback is
                  reached only on the primary's failure."* `socketFallback` names a **cause**,
                  never a path. the say-file admits it in its own words — it says the field
                  *"names **the reason** a socket was unavailable"*
               2. **no second path is ever taken.** `genCloneOndisk.ts` reads
                  `if (socketFallback !== null) throw …` — the enroll fails loud and no clone is
                  made. a fallback that falls back to naught is a failure, not a fallback
               3. **the polarity is inverted.** `computeCloneSocketFallback` returns `null` for
                  the case where a real fallback DOES occur (socket not wanted or not eligible →
                  `genBrainCliPlainClone`), and returns a non-null "fallback" only for the case
                  where we throw. the function named for the term covers exactly the rows the
                  term does not apply to
               4. so the say-file's *"three declared uses, all one sense"* is false:
                  `genBrainCliPlainClone` is a genuine path-fallback, `getEnvAllFallbackSlug` is a
                  genuine lookup-fallback, and `socketFallback` is neither
- counter    = `fallback` is the extant, de-facto word here and predates this wish, so a rename
               touches ~6 files beyond the wish's scope. and the say-file's own
               `.not a synonym of` already draws the right line (*"`--no-socket` is an opt-out,
               never a fallback"*) — the defect may be the REF, not the term
- scope      = **the term survives either way.** this dispute does not challenge `fallback`'s
               definition; it argues that `socketFallback` fails to meet it. so the likely
               resolution is a **rename of the ref**, never a change to the canonical word
- candidates = `CloneSocketMiss` / `computeCloneSocketMiss` / `asCloneSocketMissError` — `miss` is
               already itemized (`term=miss`) and names a wanted-but-absent lookup, which is what
               this value actually is. `blocker` was weighed and rejected: `term=blocked` binds to
               exit 2 / `ConstraintError`, and this value also carries the `MalfunctionError` row
- resolution = **`CloneSocketOmissionReason`, applied 2026-09-05.** `fallback` is unchanged and
               keeps its two legitimate refs; `socketFallback` alone was renamed, so the term
               survived exactly as `scope` predicted. ⚠️ **the `candidates` line above was WRONG,
               and the enumeration that overturned it is the entry below.**

#### 🔴 evidence added 2026-09-04 — the value now picks an ERROR CLASS, measured on screen

the claim above was argued from a read of `genCloneOndisk.ts`. it is now **measured**, and the
measurement makes point 2 stronger than its author could state it.

`asCloneSocketOmissionReasonError` reads the value and returns **which error class to throw**. the
acceptance snapshots pin four rows, each rendered through the real binary:

```
[case4]  💥 MalfunctionError: … node-pty failed to load on a supported platform
[case5]  ✋ ConstraintError:  … node-pty ships no prebuilt addon for this platform
[case6]  ✋ ConstraintError:  … this host's libc could not be read
[case7]  ✋ ConstraintError:  … the pty device could not be allocated
```

⇒ **every row is a throw. not one is a second path.** the value's entire job is to answer *"whose
fault, and what do they do about it?"* — which is the question a **cause** answers, and a question
a **path** cannot even be asked.

⚠️ and it sharpens the `blocker` rejection in `candidates` rather than overturns it: `[case4]`
renders `💥 MalfunctionError`, so the value genuinely spans both exit codes and cannot take a name
bound to exit 2. **`miss` remains the strongest candidate.**

⇒ the drive again **conformed rather than drifted** — `asCloneSocketOmissionReasonError` keeps the
disputed word, so a single rename still settles every ref at once.

#### 🔴 evidence added 2026-09-05 — a SECOND, unprompted read hit the same confusion

the human re-raised it cold, on a later day, with no reference to the open dispute:

> *"also, whats up with all these 'fallback' things? what was the idea there. why fallbacks"*

⚠️ **that is a different kind of evidence than the two entries above, and it is the strongest of the
three.** those argue from the code — a definition, a read of `genCloneOndisk`, a snapshot. this one
is a **reader outcome**: the same person who raised the dispute on 2026-08-30 met the word again and
did not recognize it as a settled question. the word did not merely fail a definition; it failed to
carry its sense to a reader who had already been told what it meant.

⇒ per `def.ergonomic`'s *unambiguous* line — *"no result invites a re-read"* — a term re-questioned
by its own disputant is one that costs a re-read every time it is met. **this moves the dispute from
`awaits the wisher` toward a resolution owed.**

⚠️ **and one claim made in that exchange was WRONG, so it is corrected here rather than left as it
was said.** the drive replied that `fallback` was *"an overload — a load-order sense and a
socket-cause sense, both in contracts."* the load-order sense (upstream binary first, bundled copy
second) is a genuine **path-fallback**, the same sense as `genBrainCliPlainClone` — a legal use, not
a second concept. so the defect is **exactly the one this dispute already names** and no wider:
`socketFallback` alone fails the definition. an invented second charge would have inflated the case
for a rename that the real argument already carries on its own.

#### ✅ RESOLVED 2026-09-05 — and the enumeration overturned this file's OWN candidate

the wisher authorized the rename and named the `candidates` word: **`CloneSocketMiss`.** the first
act of the rename was to test that word against every row it must cover
(`rule.require.enumerate-before-you-name`), and it failed 4 of 5:

| value | who acts | class raised |
|---|---|---|
| `null` | — | none |
| `pty-absent` + **supported** | **us** | 💥 `MalfunctionError` |
| `pty-absent` + unknown | caller, after a diagnostic | ✋ `ConstraintError` |
| `pty-absent` + unsupported | caller | ✋ `ConstraintError` |
| `host-incapable` | caller | ✋ `ConstraintError` |

🔴 **`term=miss` binds the word to the exact properties this value lacks**, in its own words:
*"a miss is **data, never a fault**"* · *"the caller **acts on** it rather than reports"* ·
`miss : the value is absent → carry on, this is the normal path`. and `term=absent`'s boundary
table settles the axis outright: a not-there that the caller **is told about** is `omitted`, never
`miss`. every non-null row here is a throw; row 2 is explicitly OUR fault; `host-incapable` is not
an absence at all.

⇒ 🚨 **`miss` fails for the SAME structural reason `blocker` failed, one entry above: the candidate
binds to one side of a party split that the value spans.** `blocker` binds to exit 2; `miss` binds
to *not-a-fault, not-reported, normal-path*. that this file rejected `blocker` on the argument and
then proposed `miss` — which the same argument kills — is the lesson: **a candidate weighed against
one instance is a sample of one, and `pty-absent` is the one instance that reads like a miss.**

it would also have collided with `isKeyrackFillProbeMiss`, whose one-line invariant (*"a probe miss
is data; a defect is not"*) is the whole reason that predicate can carry an honest name.

**`omission reason` covers all five rows, and it is not a coinage.** `term=omitted` already defines
this exact situation — *"work the command COULD NOT do … an omitted item is always reported, never
silent … you asked, and you did not get it"* — and `unlockKeyrackKeys` already publishes the two
words together as `omitted: { slug, reason: 'absent' | 'lost' | 'remote' }[]`, down to the same
`'absent'` value shape. the new name spells that pair out because the two cannot sit in one struct
at this call site.

⚠️ **the value names the reason ALONE, and that is deliberate.** it makes no claim about the party,
the exit code, or repairability — `asCloneSocketOmissionReasonError` owns that, and it needs the
platform to decide it. one input value (`pty-absent`) splits across **both** exit codes, and what
splits it is the platform, never the reason. a value that pre-judged the party would put a second
owner on the split. ⇒ that is also the general form of why `miss` and `blocker` both failed.

## .evidence

**the property that earned the itemization** surfaced on the `v2026_08_25.fix-node-pty-install`
drive, where a whole acceptance criterion rests on the order alone:

> acceptance #5 — *"darwin and win32 are unregressed"* — has **no runner** that could verify it, so
> it is satisfiable only by a structural claim: *"the darwin code path is not modified."* under a
> design that weighed a second, self-built copy of a native addon, that claim held **only while the
> second copy stayed a fallback**. promote it to primary and the claim silently reverts to
> unverifiable, with no darwin runner to go red.

that is the general shape, not a one-off: **an order-dependent guarantee is invisible to the tests
that run on the primary's happy path.** so the word must carry the order, and a review must be able
to check that a refactor did not quietly drop it.

⚠️ **that drive settled on a different cure — a version bump, with no second copy at all — and the
settlement sharpens the term rather than retires it.** with one path there is no order to preserve,
so the same criterion is bought outright instead of held by an invariant a refactor could drop. the
lesson is the comparison: **an order-invariant is a liability a second path incurs.** a design that
needs no fallback owes no such invariant, and that is a reason to prefer it (see
`rule.require.fewer-paths-via-idempotency`) — never a reason to think the word did no work.

### the same round then found the OPPOSITE error — an order-invariant stated too broadly

the vision first recorded that invariant as *"our copy must stay a fallback."* one turn later a human
noted that a copy in our own tarball resists substitution by a compromised registry publish — and the
over-broad form **forbade the very refinement that would claim it**:

```
linux         : ours first, then upstream   ← the security win
darwin/win32  : upstream first, then ours   ← what #5 actually needs
```

the two are compatible, because they name disjoint platforms. the criterion says naught about linux.

so the invariant's true form is the narrow one — *"upstream stays darwin/win32's primary"* — and the
lesson generalizes past this case:

> **an order-invariant must name the context it binds.** stated globally it forbids inversions in
> contexts the guarantee never covered, and the cost is invisible: it reads as caution, and it
> silently deletes an option.

this is why the say-file states `fallback` as a **relation between two paths in one context**, never
a rank the artifact carries. the same copy is a fallback on darwin and a primary on linux, with no
contradiction — and only a word that admits that can express the design.

### why the order is the security boundary too

the supply-chain property turns on the identical fact, which is what makes it the term's business
rather than a note in passage: **only the copy the primary loads is the copy an attacker must
reach.** a clean artifact placed second is a clean artifact never consulted, so the whole property
lives in the order and in no other property of the artifact.

## .the adjacent overload to avoid — `vendor`

⚠️ `vendor` is **already taken in this repo's glossary, with the opposite sense**.
the `term=flag` cluster (`_.choice._.md` and `_.choice.reason.md`) fixes `vendor` as **the third
party we did not write** — commander's `opts` is "a vendor object", named so precisely to mark that
it is theirs.

> ⚠️ **no line numbers here, and that is deliberate.** a line span in a durable brief is a fact
> whose owner is another file, with an expiry date and no test to redden when it passes — the same
> class `term=deaf` retired its own spans for. cite the file; let the reader grep the word.

the npm-ecosystem sense of "to vendor" — *to bundle a copy into our own tree* — is the reverse: it
marks the artifact as **ours to ship**. both senses are live in the same repo, so the word is
ambiguous by overload (`rule.forbid.domain-term-ambiguity`).

**it is safe in prose** (the wish itself says *"do NOT vendor a prebuilt binary"*) **and forbidden
in a contract.** no dobj, dop, field, flag, or path segment may be named `vendor*` until the
ambiguity is settled. this is the same trap `term=blocked` recorded one round earlier: an inherited
word from a wish is safe in prose and dangerous the moment a contract is named after it.
