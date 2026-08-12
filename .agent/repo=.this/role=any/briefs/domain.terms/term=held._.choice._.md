# domain.term: held

term.chosen   = held
term.kind     = adj
term.synonyms.forbidden:
- active
- cached
- loaded
- present
- live
- available

## .what

**the daemon has this credential in memory, right now.** an observation, never the outcome of a
request.

`held` answers *"what does this machine carry?"*. it does NOT answer *"what did i get back?"* —
that is a grant status, and the difference is the whole of this term.

## ⚠️ .held is NOT a grant status

`KeyrackGrantAttempt.status` is a closed set — `granted` · `locked` · `absent` · `blocked`. every
one of them reports the result of an **ask**. `held` is not among them, and must never be added to
them:

| word | the question it answers | who produced it |
|------|-------------------------|-----------------|
| `granted` | did my ask succeed? | `getKeyrackKeyGrant`, after a fetch |
| `locked` | is it configured but shut? | the same, after a fetch |
| `absent` | was it ever cut? | the same, after a fetch |
| **`held`** | does this host carry it at all? | `daemonAccessStatus`, with **no fetch** |

so a row rendered `(held)` makes exactly one claim: the daemon listed it. to render `(granted)`
there would claim a fetch that never happened — a lie about provenance, on a security surface.

## .where it renders

`asKeyrackReachOmittedNotice` prints a status beside every omitted reach. a **declared** row
carries its real attempt status; an **adhoc** row carries `held`, because it was enumerated from
the daemon rather than asked for.

```
🔐 keyrack source
   └─ ⚠️ 2 reaches not sourced
      ├─ API_KEY @ beav@ehmpathy.com (locked)   ← declared: a real attempt status
      └─ API_KEY @ vlad@ehmpathy.com (held)     ← adhoc: observed, never asked
```

> ⚠️ the head line above spelled that count with the word `territor`+`ies` until 2026-08-10
> (written split so a sweep of this dir cannot silently rewrite the very sentence that records
> the sweep). that word is now
> a forbidden synonym of `reach` **everywhere**, prose included — see
> `term=reach._.choice._.md`. the render itself always said `reaches`; only this illustration
> had drifted.

## .refs
- `src/domain.operations/keyrack/cli/asKeyrackReachOmittedNotice.ts`  # where the word renders
- `src/domain.operations/keyrack/reach/getAllKeyrackReachesHeldAdhoc.ts`  # the operation that observes
- `src/domain.operations/keyrack/daemon/sdk/.../daemonAccessStatus.ts`  # the source of truth

## .reason
see the ref-level cluster beside this choice:
- `term=held._.choice.reason.md` — etymology, the rejected synonyms, evidence, invariants
