# domain.term: withheld

term.chosen   = withheld
term.kind     = adj
term.synonyms.forbidden:
- refused
- denied
- suppressed
- dropped
- vetoed

⚠️ **`rejected` is NOT a forbidden synonym — it names the WIRE ack, not the verdict.** the socket's
`rejected` ack (`asCloneDispatchAck`) carries a reason STRING for every refusal — a `withheld`
pre-check slug OR an operational reject (a full queue, a drained clone, a pty fault, a bad
request). the client parts the two: a known withheld slug is a `withheld` verdict a retry policy
reads; every other reason is a `CloneOperationalRejectReason` (a closed set,
`computeCloneOperationalRejectClass`) that fails loud. so `withheld` is the sub-class of `rejected`
the caller can act on as a verdict.

⚠️ **an operational reject splits by WHO must fix it, so the exit code is not uniform.**
`computeCloneOperationalRejectClass` parts the closed set into two classes, per
`rule.require.exit-code-semantics`: a caller-amendable reason (`frame-cap-exceeded`,
`not-valid-json`, `not-a-say`, `disallowed-control`) throws ConstraintError (exit 2); a server-fault
reason (`no-live-brain-cli`, `pty-write-fault`, `queue-full`, `clone-stopped`, `clone-drained`)
throws MalfunctionError (exit 1). an unknown reason defaults to server-fault — the safe default
fails loud.

⚠️ **`blocked` is a DISTINCT keyrack term, never a synonym here.** `term=blocked` is a keyrack
grant status; it lives in another bounded context and reports a credential outcome.

## .what

**the server refused the write at the dequeue pre-check — no bytes reached the pty.** the one
verdict orthogonal to the input triple: because no write happened, there is no `buffered` /
`enqueued` / `released` state to read. it is a refusal BEFORE the message enters the triple.

it is a failure verdict: exit 2, stderr, class `constraint` — a caller MAY amend it (clear the
modal, wait for the box, or `--force` a dirty region). `delivered: false` — the only verdict where
no write occurred, so a re-send never duplicates.

## ⚠️ .the boundary — the reason decides whether a force path exists

`withheld` carries one of three reasons, and the retry contract splits ON the reason:

| reason | what refused the write | forceable? |
|--------|------------------------|------------|
| `modal-holds-focus` | a modal ate the keyboard — a say would answer a permission prompt (V3) | ❌ never |
| `focus-unrecognized` | an unknown screen — refuse rather than paste blind | ❌ never |
| `input-region-dirty` | a human's uncommitted text sits in the box | ✅ `--force` overrides |

the pre-check checks the two focus reasons FIRST, so `--force` can never override a modal — it
overrides only the dirty region (case=6, V3).

## ⚠️ .the boundary — the refusal is decided at DEQUEUE, server-side

the write channel serializes the write, so a client-side probe taken before enqueue may be stale
by up to 128 dispatches. so `withheld` is decided server-side, at the moment the write dequeues,
when the screen read is current at the write (`computeCloneDispatchPrecheck`). the read is off a
LIVE screen, so its strength is `capable` regardless of the client's own post-probe.

## .refs
- `src/domain.operations/clone/socket/computeCloneDispatchPrecheck.ts`  # the three withheld reasons, force-path order
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts`        # the `withheld` branch — refusal, delivered false
- `src/domain.operations/clone/socket/computeCloneSayReport.ts`         # the per-reason copy (constraint, exit 2)
- `src/domain.operations/clone/socket/asCloneDispatchAck.ts`            # the wire `rejected` ack this sub-classes
- `src/domain.operations/clone/socket/computeCloneOperationalRejectClass.ts`  # the NON-withheld reject set + its exit-code split (caller-amendable vs server-fault)

## .reason
see the ref-level cluster beside this choice:
- `term=withheld._.choice.reason.md` — etymology, the safety root, the force-path split
