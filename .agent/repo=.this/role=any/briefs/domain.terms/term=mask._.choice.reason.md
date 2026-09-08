# domain.term.choice.reason: mask

## .etymology

a mask covers a face without removal of the person behind it — the shape stays, the identity goes.
that is exactly the render contract: the LEAF stays (`value: …`), the BYTES go (`__REDACTED__`).

the word was chosen for the property it does NOT allow. every rejected candidate below permits a
render that omits the field entirely; `mask` does not, because a mask over an absent face is a
contradiction. the term encodes the invariant.

## .why not `sanitize` / `scrub`

both name a CLEANUP whose output shape is unspecified: a scrubbed record may lack the field, may
hold an empty string, may hold a normalized stand-in. that latitude is the defect — the render
this term governs sits one rule away from `rule.require.refusals-carry-context`, which forbids a
refusal that says LESS than the raw dump it replaced. a word that permits omission would license
the exact regression the renderer exists to prevent.

⚠️ `scrub` also reads as destructive-at-source: it suggests the secret is removed from the ERROR,
not from the RENDER. the metadata object is untouched; only how it is spelled out changes.

## .why not `filter`

`filter` is already itemized in this glossary, for the OTHER act keyrack performs on a set: it
NARROWS a swept set and removes members (`term=filter`). a mask removes no member. to reuse
`filter` here would overload one word onto two acts that are opposites on exactly the axis that
matters — one drops rows, one guarantees the row survives
(`rule.forbid.domain-term-ambiguity`).

## .why not `hide` / `obfuscate`

`hide` states the goal but not the guarantee — a hidden field may be an absent field.
`obfuscate` is worse: it implies a REVERSIBLE or partial transform (a prefix, a length, a hash),
which is precisely the class the invariant forbids. a four-character prefix of an aws access key
narrows the search space; a length narrows it; a hash is a verifier. the marker is fixed and
carries no bits of the value, and `obfuscate` would leave room to argue otherwise.

## .disputes

### dispute: redact  —  raised 2026-09-03  —  status: RESOLVED (both, at different levels)
- raised.by  = mechanic (self — the rendered marker is literally `__REDACTED__`)
- claim      = the output token already says `REDACTED`, so `redact` is the word the code speaks,
               and a second word for the same act is a synonym by definition
- counter    = they name different LEVELS, not the same act. `redact` is the OUTCOME visible in
               the render (a marker a human reads); `mask` is the DECISION and its mechanism (the
               two grounds, OR'd). the repo needs both: `isKeyrackSecretShaped` decides — it
               redacts no value itself — while `__REDACTED__` is what a reader sees.
               ⚠️ the distinction carries weight, since `helpful-errors` ALREADY exports
               `.redact(['metadata','cause'])`, used at `getKeyrackBlockedReport.ts:36`. to elect
               `redact` for our act would overload a word an upstream package has already bound to
               a DIFFERENT operation (drop whole keys off a message) — and that operation is a
               DROP, the very act `mask` is defined against.
- resolution = keep `mask` for the decision + mechanism; `__REDACTED__` stays as the rendered
               marker. `redact` is NOT a forbidden synonym — it is a distinct, upstream-owned term
               for the drop. a contract that means "decide whether bytes may print" says `mask`

## .evidence

**the invariant is what the term buys, and it is checkable in one line.** the masked branch is
ternary rather than a `continue`, so the field cannot vanish:
`` `${key}: ${isMasked ? '__REDACTED__' : spelled}` ``. a future `if (isMasked) continue` is a
drop, and this file is what lets a reviewer name it as one rather than debate taste.

**the negative clamp is the term's real proof** —
`getKeyrackBlockedReport.test.ts [case10][t1]` renders ordinary context under the SAME four keys a
secret arrived on (`value`, `body`, `data`) and asserts `not.toContain('__REDACTED__')`. a mask
that swallowed real context would go red there. so the word's boundary — mask the bytes, keep the
field, keep the non-secret — is executable, not aspirational.

**the two-grounds structure follows from the term, not the other way round.** once "mask" is
defined as a DECISION about a value, a key-name-only decision is visibly partial: it reads the
label, never the value. the value-shape ground exists because the term made the gap legible.

## .see also
- `term=secret._.choice._.md` — what a mask acts upon
- `term=filter._.choice._.md` — the narrow-a-set act this word is deliberately kept apart from
- `rule.require.refusals-carry-context` — why a drop is forbidden here, which is what forces a mask
