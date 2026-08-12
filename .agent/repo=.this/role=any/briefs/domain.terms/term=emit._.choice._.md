# domain.term: emit

term.chosen   = emit
term.kind     = verb
term.status   = DECLARED
term.synonyms.forbidden:
- render
- print
- show
- display
- log
- write (to a stream)
- output

## .what

to **put a rendered artifact onto a caller-faced stream** — stdout or stderr — as a side effect.
an `emit*` operation takes the domain values it narrates, renders them, and writes. it returns
`void`, and the write itself is the whole point.

```
emitKeyrackKeyBranch({ grant, prefix })          → void; writes the key's treestruct to stdout
emitKeyrackBlockedReport({ error, command })     → void; writes the blocked tree to stderr, exit 2
```

## .what it is NOT — the seam it names

| verb | returns | writes to a stream? | example |
|------|---------|---------------------|---------|
| `as*` | a string | ❌ no | `asKeyrackListTreestruct({ hosts })` |
| `get*` | a string | ❌ no | `getKeyrackBlockedReport({ error, command })` |
| **`emit*`** | **`void`** | ✅ **yes** | `emitKeyrackBlockedReport({ error, command })` |

⚠️ **the pair is deliberate, and it is the reason the word earns a place.** `getKeyrackBlockedReport`
**builds** the tree and hands it back, pure. `emitKeyrackBlockedReport` **writes** it, and pairs
the write with the exit code that must always accompany it. one word marks which side of the
purity line an operation sits on, so a reader knows at the call site whether a side effect fires.

## .refs

- `src/domain.operations/keyrack/cli/emitKeyrackKeyBranch.ts`
- `src/domain.operations/keyrack/cli/emitKeyrackBlockedReport.ts`

**2 prod declarations, both under `keyrack/cli/`** — the word predates this round
(`emitKeyrackKeyBranch`); this round declared the second and itemized it.

## .why not one of `get` / `set` / `gen` / `del`

`rule.require.get-set-gen-verbs` exempts *"contract/cli entry points"* and *"imperative action
commands"*. an `emit*` is both: it lives at the cli edge and names an act. it reads no resource,
mutates no state a later `get` could observe, and returns no value to name — so each of the four
core verbs would lie about what it does. **settled 2026-08-03** — see `.reason`.

## .reason

see the ref-level cluster beside this choice:
- `term=emit._.choice.reason.md` — etymology, disputes, evidence
