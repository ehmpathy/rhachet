# F5 — mock ergonomics past the nano bound ride a followup

## .the fork

the l3 lanes raised polish on the mocks and the suites, none of which ships a harm:
- wrap a zod parse refusal in a `ConstraintError` with an `output.<verb>` hint
- a shared `asMockedBrainReply` for the repl and atom reply logic; a `genMockedBrainTape()` for the
  seven hand-kept call arrays
- pin the `rhx act` stdout body, `--output`, `--attempts`; a blackbox success path for `rhx act` / `rhx ask`
- move the `.temp/` + `process.chdir` scaffold of the `genActor.brain.*` suites onto `genTempDir`
- snapshot only what rhachet owns, not zod's issue text
- a typed `output` in place of `unknown`

## .taken

none in this pr. each is caught in `.dream/v2026_11_03.followup.mock-brain-ergonomics.md`.

## .why

- the pr is the fix plus its tests, at nano size, per the director's call
- each item reshapes a fixture contract or a suite that this pr only moved off the live gate
  (the `.temp/` scaffold and the cli contract pins predate it)
- the zod snaps were asked for in i002 (ergo-friction-hazards: snap what a caller sees); to drop them
  now would reverse a conceded point
- `output: unknown` is the honest type: the shape is the caller's schema, chosen per call, and the
  parse is the check

## .rework

clean — each lands in its own pr with no change to this one's contract.

## .confidence

88% — the bound is the director's; the residual risk is that a reviewer weighs the zod snaps
differently, which is a taste call.
