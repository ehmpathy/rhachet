# domain.term: omitted

term.chosen   = omitted
term.kind     = adj
term.synonyms.forbidden:
- dropped
- excluded
- ignored
- withheld
- unavailable

⚠️ **`skipped` is NOT a forbidden synonym — it is a DISTINCT sibling term.** see the boundary
table below. to collapse the two would erase the one axis that separates them.

## .what

**work the command COULD NOT do.** the key exists in the ask, and the command could not deliver it
— because it is absent, lost, remote, or because the namespace cannot carry it beside its peer.

an omitted item is always reported, never silent. that is the whole reason the word sits on a
published contract rather than in a comment.

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

## .why not `dropped` / `excluded` / `ignored`

each implies a **choice the command made**, and that is the wrong agency:

- `dropped` — suggests carelessness; an omission is deliberate and reported
- `excluded` — suggests a filter the caller asked for; an omission is the opposite of asked-for
- `ignored` — suggests the ask was disregarded; it was honored and could not be met

`omitted` is neutral about blame and precise about outcome: it was left out, and here is why.

## .refs
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`  # the `{ unlocked, omitted }` contract
- `src/domain.operations/keyrack/cli/asKeyrackReachOmittedNotice.ts`  # the render
- `src/domain.operations/keyrack/cli/emitKeyrackReachOmittedIfAny.ts`  # the shared emit
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`  # `status: 'set' | 'skipped'` — the sibling

## .reason
see the ref-level cluster beside this choice:
- `term=omitted._.choice.reason.md` — etymology, the deferral that was wrong, evidence
