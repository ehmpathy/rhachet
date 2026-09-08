# define.invariant.empty-render-names-its-cause

## .what

an empty result must name **which of its two causes** produced it. a render that says "there is
none" when the truth is "your filter matched none" is a silent wrong answer at exit 0.

## .the invariant

for any verb that renders a **narrowed** collection:

```
render says "the collection is empty"   ⟺   countBefore === 0
render names the filter at fault        ⟺   a filter was spelled AND countBefore > 0
```

a biconditional in both directions, and **both halves carry weight**:

| direction | the defect it forbids |
|---|---|
| → | a filter ate the rows, but the render blames the collection ⇒ a human chases a rack that was there all along |
| ← | the collection is genuinely empty, but the render blames the filter ⇒ a human checks a flag that was never the cause |

`countBefore` is the count **before any narrow**. it is the whole guard, and a render that does
not receive it cannot satisfy this invariant — it holds only the filtered set, which cannot
distinguish the two causes.

## .why

**this is `rule.forbid.failhide` in its quietest form.** the render does not throw, does not warn,
and exits 0. the honest empty answer and the lying empty answer are the **same bytes** — which is
why a walk that finds a rack empty proves none of it until you make the rack non-empty and walk
again.

a mistyped filter is the cheapest way to see it. `@al` is one character short of `@all`, and a
verb whose empty branch does not know about `--org` answers it like this:

```
$ rhx keyrack list --owner ehmpath --org @al
🔐 keyrack list
   └─ (no keys configured on host)               # the host holds 57

$ rhx keyrack status --owner ehmpath --org @al
   └─ (no keys unlocked)                         # six ARE unlocked
```

each render sends a human to a repair — `keyrack init`, a re-`unlock` — for a state that is not
broken. the typo costs one keystroke to correct; the sentence that misnames it costs far more,
because it points the human away from the filter that caused it.

## .the corollary: a new filter owns its own empty answer

the shape both renders above share: an empty branch enumerates the filters it knows (`--env`) and
lets one it does not (`--org`) fall through to the unfiltered sentence. so:

> **when you add a filter to a verb, you have changed its empty render — whether or not you edited
> it.** a filter that is not named in the empty branch is a filter that can lie.

## .the second corollary: the decision belongs in a named operation

a cause-naming decision left **inline** in an orchestrator has no test of its own — a wrong answer
there moves no snapshot and turns no test red. an inline decision is
not merely harder to read (`rule.forbid.inline-decode-friction`); it is **unclampable**, and the
unclamped branch is reliably the one that breaks.

## .evidence

| verb | the operation that now owns the decision | the clamp |
|---|---|---|
| `list` | `asKeyrackListTreestruct` (`narrow` input) | `asKeyrackListTreestruct.test.ts` `[case3]` |
| `status` | `asKeyrackStatusEmptyNotice` | `asKeyrackStatusEmptyNotice.test.ts` `[case1]`, `[case4]` |

each clamp carries **both** directions: a row that pins the filter is named when it is at fault,
and a **guard row** that pins no filter is blamed when `countBefore === 0`. a fix written to only
one direction passes half the rows and reintroduces the mirror defect.

each was dogfooded red-then-green: the org axis was reverted to its pre-fix shape, the
new-behavior rows went red, the extant-behavior rows stayed green, and the fix was restored
(`rule.require.clamp-edge-cases`).

## .enforcement

- a narrowed collection whose empty render cannot distinguish the two causes = **blocker**
- a filter added to a verb whose empty branch does not name it = **blocker**
- an empty-cause decision spelled inline in an orchestrator, with no unit clamp = **blocker**
- a fix that names a filter when `countBefore === 0` = **blocker** (the mirror defect)

## .see also

- `rule.forbid.failhide` — the parent rule; this is its silent, exit-0 form
- `rule.require.errors-name-the-fix` — an empty answer owes a next move, the same as an error does
- `term=peer._.choice._.md` — the concept that supplies that next move
- `term=filter._.choice._.md` — why an absent filter must mean the verb's extant scope
