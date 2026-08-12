# domain.term: blocked

term.chosen   = blocked
term.kind     = adj
term.synonyms.forbidden:
- failed
- errored
- rejected
- refused
- denied
- invalid
- aborted

## .what

**a command halted by a fault the CALLER can fix.** the work did not happen, the cause is named,
and the remedy is the caller's to perform — so the render states the fix rather than a stack trace.

`blocked` is the adjective on the render noun `report` (see `term=notice`'s three-noun table): a
**blocked report** is the tree a keyrack command emits when it refuses an input.

## ⚠️ .the admission rule — exactly ONE error word renders blocked

this is the whole weight of the term, and it is a **type**, never a judgment call:

| the fault is a… | renders blocked? | exit |
|-----------------|------------------|------|
| `ConstraintError` — the caller fixes it | ✅ yes | 2 |
| `MalfunctionError` — the server fixes it | ❌ no — it is a crash, not a refusal | 1 |
| `BadRequestError` / `UnexpectedCodePathError` | ❌ **never** — parents, which name no owner | — |

`emitKeyrackBlockedReport` takes a `ConstraintError` **by type**, so a `MalfunctionError` cannot be
dressed up as caller-fixable. a guard that catches a thrown error narrows the class itself and
rethrows what it does not recognize (`rule.forbid.failhide`).

> a fault that cannot render blocked has the WRONG ERROR WORD — correct the throw site, never widen
> the guard (`rule.forbid.helpful-error-parents`).

## .why not `failed`

`failed` is the obvious first reach and it is refused, because it spans **both** owners: a server
crash failed, and a caller's typo failed. the one distinction that decides the exit code and the
remedy would vanish into one word — `rule.forbid.domain-term-synonyms` at a published surface.

`blocked` names only the caller's half. it says *the road is closed and you hold the key*.

## .why not `rejected` / `refused`

both name the **act** the command performed. `blocked` names the **state** the caller is left in,
which is what the render is about — and it is already the word on the glyph line, so the term and
its render agree:

```
🐢 bummer dude...

🐚 keyrack fill
   └─ ✋ blocked: invalid mechanism choice
      └─ hint: enter a number between 1 and 2
```

`refused` also collides with the reach vocabulary, where REFUSED is a mech's reach policy
(`KeyrackMechReachPolicy`) — one word, two senses.

## .the invariant

> a keyrack command that refuses an input owes a human THREE: the blocked tree, on **stderr**,
> and exit 2.

the tree and the exit are inseparable by construction — `emitKeyrackBlockedReport` renders the
tree and sets `process.exitCode = 2` in one operation, so a new guard cannot land with one and
not the other.

## ⚠️ .the third leg — stderr — and how it was lost, silently (2026-08-10)

the stream sat implicit until a rebase moved it, and the way it moved is worth the record:
**a blocked report can migrate to stdout with its message byte-identical and its exit code still
2**, so every extant assertion stays green while the contract is gone.

what happened: `unlockKeyrackKeys` wraps each key in a per-key fault isolation that catches a
`ConstraintError` and re-renders it as a per-key **`status: errored 💥`** row on **stdout**. a
vault-posture refusal (`assertKeyrackReachAddressable`) fired inside that try, so it was swept in.
two legs broke at once, and neither had a signal:

| leg | owed | what it became |
|-----|------|----------------|
| glyph | `✋ blocked` | `💥` — which `rule.require.keyrack-emoji-palette` reserves for a **MalfunctionError**, so a caller-fixable refusal read *"we broke"* |
| stream | stderr | stdout — the machine-readable channel `keyrack source` **evals as shell** |

the exit code stayed 2 throughout, so the one check most likely to catch a downgrade did not.

**the boundary that isolation actually draws**, in its own words: it exists *"ONLY for the LIVE,
OPERATIONAL faults a vault adapter raises"*. a vault-posture refusal is **static** — decided by
the `(vault, reach)` pair with no i/o at all — so it belongs **above** the try, beside the
write-only-vault check already there. that is the repair: hoist the assert, never widen the catch.

> a `ConstraintError` raised from **input shape** is refused before the work starts.
> a `ConstraintError` raised from a **live vault fault** is isolated per key.
> the isolation is for the second kind alone, and where a guard sits decides which kind it looks like.

⚠️ the general shape, past keyrack: **a diff where content only MOVED — stream, glyph, position —
is where a silent contract loss hides.** the words match, so the eye reads "cosmetic". see
`rule.forbid.blanket-resnap-after-rebase`.

## ⚠️ .known violation sites — throws that CANNOT render blocked (2026-08-10)

the admission rule above is a type check, so a violation is greppable rather than a matter of
taste. these four are live on **both** this branch and `origin/main` (`git diff HEAD origin/main`
on the file is empty), so they predate any one wish:

```
src/access/daos/daoKeyrackHostManifest/index.ts
  :84   BadRequestError  'failed to decrypt host manifest'
  :96   BadRequestError  'keyrack host manifest has invalid json'
  :104  BadRequestError  'keyrack host manifest has invalid schema'
  :203  BadRequestError  'can not findsert; manifest already exists with different uri'
```

each is a **caller-fixable** fault that carries a parent word, so each renders as a raw stack trace
where a named fix belongs. the `:104` one is not hypothetical — it took down a peer reviewer on
2026-08-10: a branch whose `KeyrackHostVault` enum predated main's `aws.params` could not parse the
host manifest, and every brain-backed reviewer died on it with no legible cause
(`.behavior/v2026_07_31.feat-keyrack-unlock-scope/.reviews/peer/…i007…r002._.taken.by_self.ergo-contract-snapshots.md`).

⚠️ **the `:104` repair needs more than a class swap.** a schema fault is caller-fixable only when
the render names *which* value failed and *what to do* — here, "your build predates a vault kind
this manifest uses; rebase or upgrade". a bare `ConstraintError` with the zod issue dump attached
would satisfy the type and still fail `rule.require.errors-name-the-fix`.

## .refs
- `src/domain.operations/keyrack/cli/emitKeyrackBlockedReport.ts`  # the emit + the exit, paired
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts`  # the render itself
- `src/domain.operations/keyrack/inferKeyrackMechForSet.ts`  # the throw that must be a leaf
- `src/access/daos/daoKeyrackHostManifest/index.ts`  # ⚠️ four violation sites — see above
- `.agent/repo=.this/role=any/briefs/rule.forbid.helpful-error-parents.md`  # the rule this term rests on

## .reason
see the ref-level cluster beside this choice:
- `term=blocked._.choice.reason.md` — etymology, the defect that settled it, evidence
