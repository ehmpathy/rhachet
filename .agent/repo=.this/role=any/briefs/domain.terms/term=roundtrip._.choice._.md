# domain.term: roundtrip

term.chosen   = roundtrip
term.kind     = noun
term.synonyms.forbidden:
- readback
- echo
- verification
- confirm
- selftest

## .what

the **set → unlock → get** cycle, run on one key at one address, to prove keyrack's own three
stores agree on where that key lives.

it is a **named, three-step cycle**, not a generic there-and-back check. that specificity is the
term's whole value: the guard's message names all three steps, and each one is a different store.

```
set     → the vault holds the secret, and the host manifest holds its address
unlock  → the daemon holds the grant, at that same address
get     → the read side finds it, at that same address
```

a roundtrip fails when those three disagree. it is **never** a statement about the caller's world.

## ⚠️ .a failed roundtrip is a MALFUNCTION, never a bad request

this is the invariant the term exists to protect, and it decides an exit code a human acts on:

| exit | class | what it tells the human |
|------|-------|-------------------------|
| **1** | `MalfunctionError` | *"keyrack is broken; you cannot fix this here"* ← **a failed roundtrip** |
| 2 | `BadRequestError` | *"close a setup gap and retry"* |

an unregistered app or an absent pem is the **caller's** world, and exits 2. a key that was set and
unlocked yet cannot be read back is **ours**, and exits 1. to exit 2 there would send a human to
fix a gap that does not exist.

## .refs
- `src/domain.operations/keyrack/fill/assertKeyrackFillRoundtrip.ts`  # the declared guard
- `src/domain.operations/keyrack/fill/assertKeyrackFillRoundtrip.test.ts`  # `[case2]` holds the class
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`  # `:372-403` — the cycle itself

## .the scope it does NOT cover

`roundtrip` names this one cycle. it does **not** name:

- a test that writes and reads a file
- an acceptance test that invokes a cli and asserts stdout
- any other there-and-back check in the repo

those are tests. a roundtrip is a **runtime** guard, on a real human's real fill.

## .reason
see the ref-level cluster beside this choice:
- `term=roundtrip._.choice.reason.md` — etymology, the deferral it closes, evidence, invariants
