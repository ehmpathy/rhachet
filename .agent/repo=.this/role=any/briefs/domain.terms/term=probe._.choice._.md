# domain.term: probe

term.chosen   = probe
term.kind     = noun
term.synonyms.forbidden:
- check
- peek
- lookup
- test
- attempt

## .what

a **read whose absent answer is expected** — asked before a write, to learn whether the write is
owed at all.

`fill` probes each key before it sets it: is this key already vaulted? a `yes` means skip; a
`no` means provision. the property that defines it is that **the negative answer is the normal
one**, so a probe's failure is data rather than a fault.

that is what earns it a word. an ordinary `get` treats an absent value as a problem to report;
a probe treats it as an answer to act on. the two read identically in code and are opposite in
intent, so the intent needs a name.

```
get   : "give me the value"      — absent is a problem
probe : "is there a value?"      — absent is an answer
```

## .refs
- `src/domain.operations/keyrack/fill/isKeyrackFillProbeMiss.ts`  # the declared dop
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`         # the vault probe it guards

## .why it is a noun, not a verb

the act is spelled by the operation that performs it (`fill` probes), so `probe` never leads a
dop name. it appears as a **noun in the middle** — `isKeyrackFill**Probe**Miss` — which names
*which* read a miss belongs to. absent that segment the name would read as "any keyrack fill
miss", and the round that coined it was a round where a message-text allowlist had already
drifted for exactly that kind of vagueness.

## .the pair

`probe` is one half of a pair; its other half is [`miss`](./term=miss._.choice._.md), the
answer a probe gets when the value is absent. neither word carries the design alone: `probe`
says which read, `miss` says which outcome.

## .reason
see the ref-level cluster beside this choice:
- `term=probe._.choice.reason.md` — etymology, the rejected synonyms, evidence
