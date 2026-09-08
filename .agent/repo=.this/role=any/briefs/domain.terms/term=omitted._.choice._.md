# domain.term: omitted

term.chosen   = omitted
term.kind     = adj  # noun form: `omission` — the same term, see `.the NOUN form` below
term.synonyms.forbidden:
- dropped
- excluded
- ignored
- withheld
- unavailable

⚠️ **`skipped` is NOT a forbidden synonym — it is a DISTINCT sibling term.** see the boundary
table below. to collapse the two would erase the one axis that separates them.

## .what

**work the command COULD NOT do.** the item exists in the ask, and the command could not deliver
it — because it is absent, lost, remote, because the namespace cannot carry it beside its peer, or
because the host could not open the socket that was asked for.

an omitted item is always reported, never silent. that is the whole reason the word sits on a
published contract rather than in a comment.

⚠️ **not scoped to keyrack keys**, though that is where it was itemized. its second surface is the
clone reach socket: `wantsSocket` is the ask, the host could not deliver, and the enroll throws —
never a quiet degrade. one word, two subjects, one sense (`rule.forbid.domain-term-ambiguity`).

## ⚠️ .the boundary — `omitted` vs `skipped`, and why both are right

both name "the command did not do this," and they are **not** interchangeable. the axis is
**whether the work was NEEDED**:

| term | where | means | was the work needed? | is it a fault? |
|------|-------|-------|----------------------|----------------|
| **`omitted`** | `unlockKeyrackKeys` → `{ unlocked, omitted }`, `asKeyrackReachOmittedNotice` | could NOT be done | ✅ yes — and it did not happen | ⚠️ yes, reported |
| `skipped` | `fillKeyrackKeys` → `FillKeyResult.status` | did not NEED to be done | ❌ no — already satisfied | ✅ no, a success |

concretely:

- `fill` **skips** a key that is already vaulted. no work was lost; the end state is correct
- `unlock` **omits** a key that is `absent` / `lost` / `remote`. something the caller asked for is
  not there
- `source` **omits** a reach the flat variable namespace cannot carry beside its reachless peer

> a skip means *"already handled."* an omission means *"you asked, and you did not get it."*

that is why an omission always earns a `notice` and a skip does not.

## .the NOUN form — `omission`

`omitted` is the adj; **`omission` is its noun, and it is the same term**, not a second one. an
inflection is not a drift, so `rule.forbid.domain-term-synonyms` does not fire — but the form is
recorded here so a reader who greps one finds the other.

reach for the noun where the word must head a compound rather than modify a subject:

```ts
// the adj — it modifies the item
omitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[];

// the noun — the omission is the subject, and `reason` qualifies it
export type CloneSocketOmissionReason = 'pty-absent' | 'host-incapable' | null;
```

## .the pair — an `omitted` always carries a `reason`

both surfaces below spell the same two-part shape, because *"it was left out, and here is why"*
is one fact rather than two. where the pair fits in a struct it reads `omitted[].reason`; where it
cannot, the noun form carries it: `CloneSocketOmissionReason`.

⚠️ **the reason NEVER names the party.** `'absent' | 'lost' | 'remote'` and
`'pty-absent' | 'host-incapable'` both state what happened and stop; whether it is the caller's to
fix is decided downstream, by a renderer with the context to judge. a reason that pre-judged the
party would put a second owner on that split — which is exactly how
`asCloneSocketOmissionReasonError` earns its own file.

## .the contract surfaces it appears on

`omitted` is **published**, not internal — so a rename is a breaking change:

```ts
// unlockKeyrackKeys.ts:64 — the returned shape
omitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[];
```

```ts
// invokeKeyrack.ts — the --json output a consumer parses
JSON.stringify({ unlocked, omitted })
```

```ts
// asCloneSocketOmissionReasonError.ts — the noun form, on error metadata a human reads
{ "socketOmissionReason": "pty-absent", "hostTuple": "linux-x64", "hint": "…" }
```

## .why not `dropped` / `excluded` / `ignored`

each implies a **choice the command made**, and that is the wrong agency:

- `dropped` — suggests carelessness; an omission is deliberate and reported
- `excluded` — suggests a filter the caller asked for; an omission is the opposite of asked-for
- `ignored` — suggests the ask was disregarded; it was honored and could not be met

`omitted` is neutral about blame and precise about outcome: it was left out, and here is why.

## .refs

⚠️ **two rows below are PHANTOM** — no such file exists at this head (globbed 2026-09-05, and
`asKeyrackReachOmittedNotice` survives only inside a comment in `getKeyrackKeySecrets.ts`). the
render they name is real and lives under some other name on the keyrack surface. that surface is
out of the `v2026_08_25.fix-node-pty-install` round's scope, so the audit is filed rather than
swept: `.dream/2026_09_05.omitted-notice-refs-are-phantom-across-six-briefs.dream.md`.

- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`  # the `{ unlocked, omitted }` contract
- 👻 `src/domain.operations/keyrack/cli/asKeyrackReachOmittedNotice.ts`  # the render — PHANTOM
- 👻 `src/domain.operations/keyrack/cli/emitKeyrackReachOmittedIfAny.ts`  # the shared emit — PHANTOM
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`  # `status: 'set' | 'skipped'` — the sibling
- `src/domain.operations/clone/computeCloneSocketOmissionReason.ts`  # the NOUN form — the declared type
- `src/domain.operations/clone/asCloneSocketOmissionReasonError.ts`  # the reason → party split

## .reason
see the ref-level cluster beside this choice:
- `term=omitted._.choice.reason.md` — etymology, the deferral that was wrong, evidence
