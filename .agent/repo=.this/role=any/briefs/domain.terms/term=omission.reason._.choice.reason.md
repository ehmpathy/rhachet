# domain.term.choice.reason: omission.reason

## .etymology

adopted, never coined. `unlockKeyrackKeys` has published `omitted: { slug, reason }[]` since the
keyrack round, so the pair *"it was left out, and here is why"* was already this repo's shape for
a wanted-but-undelivered item. the 2026-09-05 itemization records that settled pair and gives it
a boundary; it proposes no new word.

⚠️ **the noun form `omission` is `omitted`'s own inflection, not a second term.** see
`term=omitted._.choice._.md` → `.the NOUN form`. the boundary is spelled `omission` here because
a boundary heads a compound, and an adj cannot.

## .disputes

### dispute: `cause` — raised 2026-09-05 — status: RESOLVED (keep `reason`)
- raised.by  = driver, on the `v2026_08_25.fix-node-pty-install` drive
- claim      = `cause` was already the de-facto word for this exact value in this directory:
               `computeCloneSocketFallback`'s docblock said *"classify the socket-fallback
               **cause**"*, and the `fallback` dispute itself argued *"names a **CAUSE**, never a
               path"*. three sites, one word, in the code that owns the value
               ⚠️ **that name is HISTORICAL** — the same round renamed it to
               `computeCloneSocketOmissionReason`, so a glob of the quoted name returns naught
- counter    = the de-facto claim is true and **too narrow**. widen the frame past this directory
               and `omitted[].reason` is the same concept on a **published** contract, with the
               same shape (a closed union of why-values), the same audience (a caller who is
               told), and even a shared value (`'absent'`). two words for one concept is
               `rule.forbid.domain-term-inconsistency` outright
- resolution = keep `reason`; record `cause` as a forbidden synonym. ⇒ **the lesson is the
               asymmetry of the two reads:** the `cause` evidence was three sites in one dir, and
               the `reason` evidence was one site in another — but the second is a published
               contract and the first is prose. **a de-facto word counted inside its own
               neighborhood will always win a count it should lose**

## .evidence

### the enumeration that overturned `miss` — and it is the reason this cluster exists at all

the wisher authorized `CloneSocketMiss`, quoted from the `fallback` dispute's own `candidates`
line. the enumeration ran first (`rule.require.enumerate-before-you-name`) and it failed 4 of 5
rows against `term=miss`'s own definition — *"data, never a fault"*, *"the caller acts on it
rather than reports"*, *"carry on, this is the normal path"*.

the full table is in `term=fallback._.choice.reason.md` → the RESOLVED dispute. what belongs
**here** is the property it exposed, because that property is what this word names:

> 🔴 **`miss` and `blocker` failed for ONE structural reason: each binds to one side of a party
> split that the value spans.** `blocker` binds to exit 2. `miss` binds to *not-a-fault*. and
> `'pty-absent'` is a `💥 MalfunctionError` on one platform and a `✋ ConstraintError` on another.

⇒ so the word this value needed was one that **declines to name the party**, and `reason` is the
only candidate weighed that does. the two rejections were not two accidents; they were the same
requirement, discovered twice.

### the overload, measured

a grep of `src/**/*.ts` for `reason` in a contract slot returns both senses live today:

```
findsertActorOndisk({ reason: string | null })     ← free text, a human types it at `--reason`
unlockKeyrackKeys → omitted[].reason               ← 'absent' | 'lost' | 'remote', computed
enweaveOneCycle   → reason: 'DECIDED' | 'BREACHED' ← computed
getOneLazyEsmModuleLoader → reason: error.message  ← free text, from a throw
```

⚠️ **it splits on WHO AUTHORS THE VALUE, and that is not a shade of one sense — the two are
incompatible.** a human's justification cannot be switched on; a system's classification must be.
a reader who meets a bare `reason` field cannot tell which they hold without a read of its type.

**out of scope to fix here, and filed rather than dropped:** the justification sense predates this
round and lives in the enroll surface, which this wish does not touch (`rule.forbid.scope-leaks`).
what this round owes, and did, is to keep its OWN new name out of the collision — hence
`socketOmissionReason`, never a bare `socketReason`.

### why the boundary is `omission` and not `clone` or `socket`

per `rule.require.boundary-qualified-terms`' test — *"$word, of WHAT?"* — the answer is **an
omission**, on every ref: the keyrack one, the weave halt, and the clone socket. `clone` and
`socket` name *which* omission at one call site; they do not name the sense the word holds.

⇒ that also predicts where the word may next appear: **any surface that reports an omission**, and
no other.
