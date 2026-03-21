# self-review: has-pruned-backcompat (round 4)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## backwards compatibility review — with citations

I re-read the wish document (0.wish.md) line by line. here's what I found:

---

### concern 1: `TContext = Empty` default

**blueprint states**: `BrainAtom<TContext = Empty>` and `BrainRepl<TContext = Empty>`

**explicit in wish?** yes. wish lines 40-48 show the exact "needed signature":
```ts
interface BrainAtom<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => Promise<BrainOutput<...>>
}

interface BrainRepl<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => Promise<BrainOutput<...>>
  act: <TOutput, TPlugs>(input, context?: TContext) => Promise<BrainOutput<...>>
}
```

the `= Empty` default is in the wisher's exact specification. not inferred.

**why it holds**: the wisher wrote this signature. the default is prescribed, not assumed.

---

### concern 2: `context?: Empty` accepts `{}` or undefined

**blueprint states**: "context?: Empty accepts {} or undefined — no break for extant callers"

**explicit in wish?** not stated, but derived from type semantics.

**analysis**: the wish shows current signature as `context?: Empty`. the needed signature changes to `context?: TContext`. when TContext defaults to Empty, behavior is identical.

this is a statement about type semantics, not extra backcompat work. Empty is `{}` from type-fns. `{}` is satisfied by:
- `{}` (empty object)
- `undefined` (optional param)

**why it holds**: this documents how TypeScript works, not extra effort.

---

### concern 3: genContextBrain continues to pass `{}`

**blueprint states**: "genContextBrain continues to pass {} — backwards compat preserved"

**explicit in wish?** no. the wish does not mention genContextBrain.

**however**: filediff tree marks genContextBrain as `[○] retain (backwards compat)`. what does this mean?

let me think about what genContextBrain does:
- it creates a ContextBrain wrapper
- it calls `brain.ask(input, {})` internally

if brain.ask now expects `context?: TContext` with `TContext = Empty`, then `{}` still satisfies it. no change to genContextBrain needed.

**question for wisher**: should genContextBrain be explicitly excluded from scope?

**verdict**: this is not extra backcompat work — it documents non-impact. but the line could be removed from blueprint since it's implicit. however, non-impact documentation helps future readers understand the change boundary.

**why it holds**: documents what won't break, not extra work.

---

### concern 4: actor TContext generic

**blueprint updated per user feedback**: actor now uses `TContext = Empty` generic.

**backcompat analysis**: if actor previously had no context param, now it has `context?: TContext = Empty`. callers who don't pass context still work.

**explicit in wish?** the wish mentions "context flows through actor" but doesn't specify actor signature.

**why it holds**: new optional param with default doesn't break callers.

---

## open questions for wisher

1. **genContextBrain documentation**: should the line "genContextBrain continues to pass {}" remain? it documents non-impact but could be seen as "assumed backcompat".

---

## conclusion

| backcompat concern | source | verdict |
|-------------------|--------|---------|
| TContext = Empty default | wish lines 40-48 | explicit |
| Empty accepts {} | type semantics | inherent |
| genContextBrain unchanged | non-impact | documents boundary |
| actor TContext = Empty | optional param | no break |

all backcompat is either explicitly requested, type semantics, or boundary documentation. no unasked-for extra work.

