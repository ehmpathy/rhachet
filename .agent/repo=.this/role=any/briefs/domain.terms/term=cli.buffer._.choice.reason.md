# domain.term.choice.reason: cli.buffer

## .etymology

why `buffer`: a buffer is the canonical computing name for an area that holds data before it is
committed onward — a write buffer, an editor buffer, a keyboard buffer. the brain-cli's input strip
is exactly that: bytes sit in it, unconsumed, until a submit hands them to the repl.

coined by the wisher, 2026-09-21, as a value of `rhx clone get --what buffer|queue|story`. so its
etymology is a contract, which is the strongest evidence a term choice can carry
(`rule.require.persist-domain-term-evidence`).

chosen over the rejected peers:

- `box`    — the word the prose and test names already used. it is a SHAPE metaphor, not a function
             one, and it says naught about why the text sits there. it also reads as a ui widget.
- `band`   — the word `getInputBand` used. it names a horizontal SLICE of a screen, which is a
             reader's implementation detail rather than the domain's noun. a band is how you locate
             the buffer, never what the buffer is.
- `region` — the word `countInInput`'s docblock used. generic past use: every screen area is a
             region, so it discriminates no case.
- `textarea` / `composer` — each names a gui widget. the brain-cli renders rows in a terminal; a
             widget word imports a dom model the domain does not have.

## .disputes

none. the word was coined in a contract and collides with no extant declared term — `buffered`
(adj, a state) is its own derivation and is declared separately.

## .evidence

### the inconsistency it settles

walked 2026-09-22 against `src/domain.operations/clone/screen/`: one concept, three words, no
canonical term declared.

| the word | where it sat |
|---|---|
| `band` | `computeCloneInputState.ts:255` — the `getInputBand` operation name and its local `band` |
| `box` | `computeCloneInputState.test.ts:269` — *"a wrapped message in the INPUT BOX"*, and throughout the prose |
| `region` | `computeCloneInputState.ts:212` — *"the input region"*, and `countInInput`'s own name |

⇒ `rule.forbid.domain-term-inconsistency` grades that a blocker and names the repair: coin the
canonical term, conform the rest, and leave the extant uses until disturbed. this cluster is the
coinage; the conform is fix-forward.

### the region boundary is STRUCTURAL

the buffer is not located by a marker whitelist. `getInputBand`
(`computeCloneInputState.ts:255`) slices the rows between two rule rows (`isRuleRow`, same file
line 75), and `computeCloneInputContent` reuses that same signal to bound its read
(*"a rule is the same region boundary `getInputBand` itself rests on"*).

⇒ that matters to the term: a buffer is defined by its **bounds on the screen**, not by the text it
happens to hold. so a buffer with zero rows of content is still a buffer, and a screen with no
locatable bounds has **no** buffer — which is why a content read over a modal screen must report
`unreadable` rather than `clear` (the false-clear class, cure 34).

### the triple

`buffer` and `queue` are the two screen surfaces of the input triple
(`define.brain-cli-input-states`):

```
buffered  →  enqueued  →  released
  buffer      queue       transcript
```

⇒ one surface per state, which is what makes `--what buffer|queue|story` a single axis rather than
a mixed set. the `story` value's collision with `transcript` is the one asymmetry, recorded as a
dated dispute in `term=transcript._.choice.reason.md` and itemized as fulcrum `F39`.
