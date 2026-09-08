# domain.term: omission.reason

term.chosen   = reason
term.kind     = noun
term.boundary = omission        # REQUIRED — the bare word is overloaded; see `.the overload`
term.synonyms.forbidden:
- cause
- why
- code
- kind
- fallback

⚠️ **`fault` is NOT a forbidden synonym — it is a DISTINCT kin term.** a fault names *whose*
(`term=fault`: the world's, never ours); a reason names *what happened* and stops. the boundary
between them is the entire point of this word, and `.what` below rests on it.

## .what

**the closed classification of why an [`omitted`](./term=omitted._.choice._.md) item was not
delivered.** it states what happened, and makes no claim about the party, the exit code, or
whether anyone can repair it.

```
omitted[].reason           'absent' | 'lost' | 'remote'
CloneSocketOmissionReason  'pty-absent' | 'host-incapable' | null
```

## 🚨 .the load-carrying property — a reason NEVER names the party

this is what earns the word its place, and it is checkable:

> **one reason value can split across BOTH exit codes.** `'pty-absent'` yields a
> `💥 MalfunctionError` on a platform that ships a prebuild, and a `✋ ConstraintError` on one
> that does not. what splits it is the **platform**, never the reason.

⇒ so a reason cannot decide the party even in principle, and a value that tried would put a
**second owner** on the split. that is why the classification and its report are two artifacts:
`computeCloneSocketOmissionReason` states what happened; `asCloneSocketOmissionReasonError`
decides whose it is, with the platform in hand.

## ⚠️ .the overload — the BARE word carries a second, incompatible sense

`reason` is used elsewhere in this repo for a **human-authored justification**, which is the
opposite kind of value:

| surface | sense | authored by | shape |
|---|---|---|---|
| `omitted[].reason`, `CloneSocketOmissionReason`, `enweaveOneCycle`'s halt reason | **classification** | the system | a closed union |
| `rhx enroll --reason <text>`, `findsertActorOndisk({ reason })`, `setActorOndiskRolesLog` | **justification** | a human | free text |

🔴 **that is `rule.forbid.domain-term-ambiguity`, and it is why this cluster is boundary-qualified
rather than a bare `term=reason`.** the rule's test — *"$word, of WHAT?"* — yields two answers, so
it is two senses and owes two clusters.

**this cluster claims only the first.** the justification sense is extant, predates this
itemization, and is out of the scope that surfaced it — recorded rather than swept
(`rule.forbid.scope-leaks`, and the no-mass-rewrite clause of
`rule.forbid.domain-term-synonyms`). the audit is filed as a dream.

⇒ **a NEW contract must not take a bare `reason` slot** unless a struct supplies the boundary
(`omitted[].reason` is legal because `omitted[]` supplies it lexically). alone, the word must
carry its boundary: `socketOmissionReason`, never `socketReason`.

## .why not `cause` / `why` / `code` / `kind` / `fallback`

- `cause` — the closest, and a genuine synonym here, which is exactly why it is forbidden. the
  repo already publishes `omitted[].reason`; a second word for one concept is the sprawl
  `rule.forbid.domain-term-inconsistency` names. ⚠️ `cause` was the de-facto word in this dir's
  own docblocks and lost on that argument alone
- `why` — an interrogative, not a noun. it names the question, never the answer
- `code` — implies a stable numeric/string identifier a consumer switches on, and drags errno and
  http framework in with it. a reason is prose-adjacent and may be re-worded
- `kind` — taken, at a different grain: `term=kind` names the *variant* of an object, never the
  *why* of an outcome. `asNpmInstallFailureKind` is a kind; this is not
- `fallback` — 🔴 the word this replaced. a fallback is *the path taken after the preferred path
  fails* and requires a second path; no non-null reason here takes one. see the RESOLVED dispute
  in `term=fallback._.choice.reason.md`

## .refs
- `src/domain.operations/clone/computeCloneSocketOmissionReason.ts`   # the declared type + dop
- `src/domain.operations/clone/asCloneSocketOmissionReasonError.ts`   # the reason → party split
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`        # `omitted[].reason` — the published pair
- `src/domain.operations/weave/enweaveOneCycle.ts`                    # `'DECIDED' | 'BREACHED'` — the same sense

## .reason
see the ref-level cluster beside this choice:
- `term=omission.reason._.choice.reason.md` — etymology, the overturned `miss` candidate, the
  overload's evidence
