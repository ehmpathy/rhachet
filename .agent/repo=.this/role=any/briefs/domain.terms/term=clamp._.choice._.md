# domain.term: clamp

term.chosen   = clamp
term.kind     = noun
term.synonyms.forbidden:
- guard
- check
- assertion
- coverage
- safety net

## .what

**a test written to hold ONE named defect shut, and proven to go red when that defect returns.**

a clamp is not a synonym for a test. every clamp is a test; a test earns the name `clamp` only
when both halves hold:

1. it names the **defect** it holds shut — a specific way the code can go wrong
2. it has **teeth** — it has been seen to go RED with the defect present, and green without

a test that has never been observed to fail is not a clamp. it is a hope.

## .the invariant a reviewer can check

**a clamp's teeth are demonstrated, never assumed.** the demonstration is a three-step dogfood:

1. land the fix; the clamp is green
2. revert ONLY the fix; the clamp MUST go red
3. restore the fix; the clamp MUST go green

if step 2 stays green, the test does not exercise the defect, and the name `clamp` is a false
claim about it — the worst kind, since it reads as protection while it guards none.

## .why it is not `guard`

`guard` is already taken, and by a **runtime** concept: a branch in production code that refuses
an input (the `--org` guard, the strict-gitroot guard). a guard runs for every human, forever; a
clamp runs in ci and never ships. to overload one word across a runtime refusal and a test would
put the two most load-bearing words in a refusal's story onto one term.

## .why it is not `coverage`

coverage counts LINES a test executes. a clamp names a DEFECT a test refuses. a suite can carry
100% coverage and no clamps at all — every line executed, no failure mode held shut. the two
answer different questions, and only one of them survives a refactor.

## .the shape a clamp takes

a clamp is usually the reproduction you already built to convince yourself the fix worked. that is
the point: you pay the cost of the repro regardless, so to discard it is to pay in full and keep
none of the protection.

## .the INVERTED clamp — the failure mode worse than absence

an **inverted** clamp pins the *negation* of the property the code owes. it goes GREEN on the
defect and RED on the repair.

it is strictly worse than an absent clamp. absent, a defect merely goes uncaught. inverted, the
suite **actively defends the defect** — and the engineer who repairs the code is told by a red bar
that they broke the tree, so the correct change looks like the regression.

**the tell:** an assertion that contradicts its neighbor in the same `then`. one clamps the render
as correct; the next bans a token the correct render must carry.

**the cause, every time observed:** a ban on a **token** where the real axis is a **column**.

```ts
// 👎 inverted — the class is REQUIRED at the tree node, so this reds on the repair
expect(output).not.toContain('ConstraintError');

// 👍 anchored to position — bans the flush-left raw DUMP, permits the tree node
expect(output).not.toMatch(/^✋ ConstraintError:/m);
expect(output).not.toContain('[args]');
```

⇒ **a ban on a token is almost always a ban on the wrong axis.** a token appears in a good render
and a bad one alike; what separates them is WHERE. anchor to position, never to presence.

⚠️ the three-step dogfood above catches this for free, and is the only check that does: an inverted
clamp passes step 1 and fails step 2 in the direction opposite the one you expect. six inverted
clamps shipped on this branch and were found exactly this way — the repair went red, and that red
was the discovery.

## .refs

the rule that mandates it:
- `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/diagnose/rule.require.clamp-edge-cases.md`

representative clamps in this repo:
- `src/domain.operations/keyrack/getKeyrackBlockedReport.test.ts` — `[case9][t2]`/`[t3]`, the two
  SIDES of one branch; drop the error name always and [t3] reds, spell it always and [t2] reds
- `src/domain.operations/keyrack/cli/getAllKeyrackStatusKeysForFilter.test.ts` — `rowMachineWideWithLostOrg`,
  a row whose stored org DISAGREES with its slug, which is the only shape that can read which
  field the filter consults

## .reason
see the ref-level cluster beside this choice:
- `term=clamp._.choice.reason.md` — etymology, disputes, evidence

## .see also
- `term=grade._.choice._.md` — what a review assigns; a clamp is what a review asks for
- `term=report._.choice._.md` — a render a clamp often pins
