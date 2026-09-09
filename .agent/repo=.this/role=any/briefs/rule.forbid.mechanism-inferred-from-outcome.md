# rule.forbid.mechanism-inferred-from-outcome

## .what

do not state **how a mechanism works** on the evidence of **what it produced**. an outcome proves
a mechanism ran; it never reports how it ran.

the forbidden move is a sentence about internals — *"it charges on X"*, *"the surface emits Y"*,
*"it must read Z"* — whose only support is a result you observed. read the operation, or observe
the mechanism directly, before you write one.

## .why

an outcome is consistent with **many** mechanisms, so the inference is unsound even when the
observation is perfect. that is what makes it dangerous rather than merely sloppy: you are not
careless about the evidence, you are certain of it — and still wrong.

it is also the cheapest error to prevent. the outcome is on screen; the mechanism is one file or
one run away. every incident below cost a round and was one observation from disproof.

⚠️ the failure mode is not doubt, it is **confidence**. you saw the result yourself, so the claim
feels first-hand. it is not — the result is first-hand; the mechanism behind it is a guess.

## .the tell

a sentence about internals whose warrant is a result:

- *"it must not have charged — the lane never graded"*
- *"the surface emits it twice — I see it twice"*
- *"it caches — the second call was fast"*
- *"it validates first — the error came before the write"*

reach for the check whenever *because I saw* is doing the work that *because I read it* should.

## .the counter-move: NARROW, do not widen

this is the mirror of `rule.require.search-before-you-claim-absence`, and its cure is the
opposite one — so the two must not be merged into one reflex:

| shape | the claim | the counter-move |
|---|---|---|
| absence | *"no X does Y"* | **widen** — search the repo before the claim |
| **mechanism** | *"it works by Y"* | **narrow** — read the one operation that decides it, or observe it once |

to widen a mechanism claim is wasted effort; to narrow an absence claim proves not one thing. name
the shape, then take its own move.

## .the two observations that settle it

1. **read the deciding operation.** find where the behavior is chosen, not where it surfaces. one
   `head` of the file that prints the bytes; one read of the function that debits the counter
2. **run the mechanism once and watch a value that only it can move.** a counter before and
   after, a field that changes only on the path in question

either is minutes. a wrong mechanism claim costs a round, and — worse — becomes the premise of the
next decision.

## .the incidents this rule is drawn from

| the claim | what was true | what it cost |
|---|---|---|
| *"a consumer that catches and logs the error sees the prefix twice"* | only if they log the whole object; node's uncaught printer prepends `err.name`, so a caller who reads `err.message` sees it once | a valid reviewer blocker declined, then overturned by a peer |
| *"budget is inert — a lane dies before it spends a unit"* | the guard debits on **arrival**, never on **verdict**; one arrival read `4/11 → 3/11` | a claim made to a supervisor, then retracted; a lever misjudged for a whole round |

both reasoned backward from a visible result. both were one observation from disproof.

## .enforcement

- a statement about a mechanism's internals, in a comment, yield, review, or escalation, whose
  only support is an observed outcome = **blocker**
- a decision (a lever spent or declined, a refute filed) that rests on such a statement =
  **blocker** — the claim must be checked before it is acted on
- a mechanism claim and an absence claim merged into one lesson = **nitpick** — their
  counter-moves are opposite, so the merge teaches the wrong reflex

## .see also

- `rule.require.trust-but-verify` — the parent discipline; this is its mechanism case
- `rule.require.search-before-you-claim-absence` — the peer; the absence case, and the opposite move
- `rule.require.check-the-precondition-before-you-escalate` — the sibling that guards escalations
- `rule.require.solve-at-cause` — read the operation that decides, never the one that surfaces
