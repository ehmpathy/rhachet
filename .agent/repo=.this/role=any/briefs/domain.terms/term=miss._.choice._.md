# domain.term: miss

term.chosen   = miss
term.kind     = noun
term.synonyms.forbidden:
- absent
- notfound
- empty
- failure
- error

## .what

the answer a [`probe`](./term=probe._.choice._.md) gets when the value is **not there** — and
which the caller acts on rather than reports.

a miss is **data, never a fault**. that is the whole distinction it carries:

```
miss    : the value is absent   → carry on, this is the normal path
defect  : the read broke        → rethrow, a human must see it
```

the two arrive at the same `catch` block and look alike there. a `miss` is what lets code tell
them apart in one word, and to tell them apart is a security-weighted decision — to swallow a
defect as a miss hides a real bug behind a normal path (`rule.forbid.failhide`).

## .refs
- `src/domain.operations/keyrack/fill/isKeyrackFillProbeMiss.ts`  # the declared dop
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`         # the catch it governs

## .why not `absent`

`absent` is the repo's plain-english word for a value that is not there, and it stays that. a
miss is narrower: it is **an absence that was asked for**. every miss is an absence; not every
absence is a miss. to collapse them would take the expectation out of the word, which is the
only part that earns it a place in the glossary.

## .why not `failure` or `error`

both are true of the *mechanism* and false of the *sense*. the probe did throw — but a throw
that the design expects, plans for, and routes around is not a failure of anything at all. to
name it one invites the next reader to add a log line, a retry, or a warn on the normal path.

## .reason
see the ref-level cluster beside this choice:
- `term=miss._.choice.reason.md` — etymology, the deferral it retires, evidence
