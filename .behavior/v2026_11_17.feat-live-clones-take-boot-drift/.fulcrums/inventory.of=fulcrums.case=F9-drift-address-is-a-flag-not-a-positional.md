# F9 · `clone boot drift` names its clone by `--of @:<x>`, not a positional address

## .the fork

- **a.** `rhx clone boot drift [--of @:<x>]` — a named flag, absent = this clone (by its env serial).
  the shape the approved vision drew
- **b.** `rhx clone boot drift [@:<x>]` — an optional positional, as `clone get <address>` and
  `clone prune [actor]` take theirs

## .taken = a

the address is optional here, and its absence means "this clone", which neither sibling has: `get`
requires its address, `prune` scopes by an actor. a named flag reads plainly at the call site of a
hook (`--when hook.onStop`, no address) and at a human's (`--of @:surfer`), and
`rule.forbid.positional-args` prefers the named form. the cost: a human who knows `clone get @:x`
may type `clone boot drift @:x` and meet a refusal, not a guess.

## .rework = clean

one commander option in `invokeCloneBoot`, its help line, and two snapshot cases
(`invokeClone.integration.test.ts` [case12]); no caller outside the pr.

## .confidence = 75%, why

the vision chose (a) and was approved, but the review that approved it did not weigh it against the
two siblings; the sibling convention is real, so the commander may prefer (b).

## .where

`src/contract/cli/invokeCloneBoot.ts`; surfaced at the self review `has-consistent-conventions`.

## .verdict

owed — flagged in the pr body for the commander.
