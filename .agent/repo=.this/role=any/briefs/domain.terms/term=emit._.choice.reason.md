# domain.term.choice.reason: emit

## .etymology

latin *emittere* — "to send out." the word carries a **one-way** sense: a thing leaves and does
not come back. that is exactly the shape of a write to stdout/stderr, and exactly what separates
it from every operation that hands a value back to its caller.

the repo already spent its build-a-string vocabulary on two prefixes, and both were taken:

| prefix | what it does | why it could not serve |
|--------|--------------|------------------------|
| `as*` | pure cast — one shape to another (`asKeyrackListTreestruct`) | a pure cast that also wrote a stream would break `rule.forbid.hidden-side-effects` |
| `get*` | retrieve/derive (`getKeyrackBlockedReport`) | `get` **guarantees no side effects** — it is the one pure axis of the get/set/gen/del quad |

so a third word was owed for the impure sibling, and `emit` is it.

### the rejected synonyms, each with its own reason

| word | why not |
|------|---------|
| `render` | names the **string build**, which is what `as*`/`get*` already do. `renderKeyrackBlockedReport` would read as the pure one and be the impure one — the exact inversion |
| `print` | a printer word; carries paper connotations and says stdout, so it cannot name a stderr write without a lie |
| `show` | reads as a ui reveal, and implies a prior concealment. no keyrack render conceals anything |
| `display` | same as `show`, plus it is a gui word this cli domain never uses |
| `log` | **already spent.** `context.log` is the observability channel throughout this repo (`LogMethods`, `withLogTrail`). to overload `log` onto a caller-faced write would put one word on two audiences — the operator who reads a log, and the human who reads a terminal. `rule.forbid.ambiguous-labels` |
| `write` | too broad — the repo writes files, vaults, and manifests. `writeKeyrackBlockedReport` reads as a file write |
| `output` | a noun forced into verb duty; and a word that names the artifact should not also name the act |

## .disputes

### dispute: render — raised 2026-08-03 — status: RESOLVED (keep `emit`)

- raised.by  = driver (self, at the extraction of `emitKeyrackBlockedReport`)
- claim      = `render` is the more common word in cli codebases for "turn a value into terminal
               output", and a reader would recognize it instantly
- counter    = `render` names the **build**, not the **write** — and this repo already has the
               build under two other prefixes (`asKeyrackListTreestruct` returns a string;
               `getKeyrackBlockedReport` returns a string). the whole value of a third word is
               that it marks the purity boundary: `get*` builds, `emit*` writes. if `render`
               took the impure slot, a reader would meet `getKeyrackBlockedReport` (pure) beside
               `renderKeyrackBlockedReport` (impure) with no signal in the verbs to tell them
               apart — two words for one act, distinguished by no cue a reader can see
- resolution = keep `emit`; record `render` as a forbidden synonym. the *emittere* "sends out and
               does not return" sense is precisely the `void`-returning, stream-writing shape.
               dispute closed

## .evidence

### precedent — the word predates this round

`emitKeyrackKeyBranch` was extant before this drive, at `keyrack/cli/emitKeyrackKeyBranch.ts`,
and it has the same shape: takes a grant, renders its treestruct, writes to stdout, returns
`void`. so `emit` was **discovered in the domain, not invented at the keyboard** — this round
reused it for a second declaration and then itemized it, per
`rule.require.domain-term-itemization`.

### the pair that motivated the itemization

this round extracted `emitKeyrackBlockedReport` from four sites in `invokeKeyrack.ts` that each
repeated the same two lines:

```ts
console.error(getKeyrackBlockedReport({ error, command }));
process.exitCode = 2;
```

the extraction created an operation that is **the impure twin of an extant pure one**, sharing
its whole name but for the verb. that adjacency is what makes the verb load-bearing rather than
decorative:

```
getKeyrackBlockedReport({ error, command })   → string   (pure; testable with no spy)
emitKeyrackBlockedReport({ error, command })  → void     (writes stderr + sets exit code)
```

a reader who knows the two verbs knows, at the call site and with no jump to the definition,
which one fires a side effect. that is the whole job the term does.

### the invariant it now carries

the extraction bound the render and the exit code together, which was the defect that motivated
it: a guard had previously landed with the render and no `exitCode = 2`. `emit*`'s "sends out"
sense covers both — the write and the process signal are one act of sending a verdict outward,
so a pair of them under one verb is honest rather than a convenience.

## .invariants

- an `emit*` operation returns `void`, always — a value to return means it was a `get*` or `as*`
- an `emit*` operation writes to a caller-faced stream (stdout/stderr), never to a file or a log
  channel
- an `emit*` operation has a pure counterpart where one is useful — the build stays testable
  without a stream spy
