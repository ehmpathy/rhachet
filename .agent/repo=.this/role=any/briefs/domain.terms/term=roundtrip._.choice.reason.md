# domain.term.choice.reason: roundtrip

## .etymology

a journey out and back to where you started. the word carries **two** claims that the rejected
synonyms each drop one of:

- you **went somewhere** — three stores, three writes, a real trip
- you **came back to the same place** — the address you set is the address you read

`readback` and `echo` keep the return and lose the journey: both suggest one store answered its own
write, which is precisely the failure a roundtrip would miss. `verification` and `confirm` are
generic english, true of every assertion in the repo, and so name none of them.

## .the deferral this closes

⚠️ flagged at i067 as *"the first candidate for next round"*, and deferred honestly:

> *"one read left me unsure whether it names the set→unlock→get cycle specifically or any
> there-and-back verification"* — progress.md, 2026-08-09

**settled: the specific cycle.** the evidence was in the guard's own message the whole time —

```
`roundtrip verification failed: key ${keyName} was set and unlocked but get returned status=...`
```

it names **set**, **unlock**, and **get** by name. a word that could have meant "any there-and-back"
would not have been able to write that sentence. the deferral was honest and the answer was one
close read away.

## .evidence

**a declared guard.** `assertKeyrackFillRoundtrip` is a domain operation this repo declares, which
is the trigger `rule.require.domain-term-itemization` names. it composes two extant terms —
`assert` (throw-or-pass, no return) and `fill` — plus this one.

**scenario timeline — the shape the word protects**

```
given  a human runs `keyrack fill` for a key at one reach
when   set writes the vault + host manifest at address `slug@label`
and    unlock hands the daemon a grant at that same address
and    get asks the read side for that same address
then   granted → the three stores agree, and fill carries on
and    every other status → they disagree, which is OUR defect: MalfunctionError, exit 1
```

**the class is the contract, and a test holds it.** `assertKeyrackFillRoundtrip.test.ts [case2]`
asserts the thrown class, not the message text — so a later traveler who softens it to a
`BadRequestError` goes red. the guard exists as a **named operation** rather than an inline throw
for exactly that reason.

**why its metadata grew (i068).** a fill loop is `keys × owners × reaches`, so a halt on the
last target used to discard the report for every target before it. the guard now carries `reach`
(a slug alone no longer names one key), `resultsSoFar`, and `resultsSoFarCount` beside it. the
count rides beside the array because error metadata is often read as one rendered line, where a
40-element array truncates and its length is lost.

## .invariants

checkable rules a reviewer can hold the term to:

1. **a failed roundtrip throws `MalfunctionError` (exit 1)** — never `BadRequestError` (exit 2).
   the two are opposite instructions to the human who reads them
   (`rule.require.exit-code-semantics`)
2. **all three steps are named in the failure** — set, unlock, get. a message that names fewer
   describes a different check and must not borrow this word
3. **the roundtrip is addressed** — it verifies ONE `(slug, reach)`, and its report names the
   reach. a report that names only the slug is true of every reach of that key, and so
   names none of them
4. **`roundtrip` is a runtime guard, never a test technique** — a test that writes and reads is a
   test; this word is reserved for the guard a human's own `fill` runs

## .see also

- `term=fill._.choice._.md` — the operation this guard defends
- `term=assert._.choice._.md` — the verb: throw-or-pass, no return
- `term=unlock._.choice._.md` — the middle step, and the term whose overload made this cycle
  hard to read until it was itemized
- `term=reach._.choice._.md` — the axis the report must name, so a failure points at one key
