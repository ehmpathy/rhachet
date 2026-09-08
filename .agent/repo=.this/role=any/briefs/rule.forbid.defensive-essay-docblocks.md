# rule.forbid.defensive-essay-docblocks

> **a comment states what IS. it does not argue with a reviewer who is not there.**

a defensive essay is a docblock that rebuts an imagined objection, or justifies its own
subject's right to exist. it reads as a persuasive case rather than a fact, and it is
forbidden.

## .why

- **the objection is forgotten; the rebuttal remains.** the reviewer moves on, the review
  file is archived, and a future reader inherits an argument with no opponent. that is
  `rule.forbid.chronological-accretion` in source form — a round's history, embedded.
- **it buries the one line that carries weight.** a fact a future edit would otherwise undo
  is the whole point of a comment, and it sits invisible beneath four paragraphs that answer
  a question nobody asked.
- **length signals doubt, not rigor.** a 42-line docblock over a 4-line function reads as
  an author who expects to be challenged, never as one who is sure.

## .the smells

| smell | example |
|---|---|
| self-justification | `.why it is worth a name, given it saves no lines = …` |
| a hypothetical failure story | *"a `.some` mistyped as `.every` would silently invert…"* |
| the rejected alternative, weighed | *"a reset would also work and would be strictly worse…"* |
| placement rationale | *"it lives in `utils/` rather than under either domain because…"* |
| a rule restated rather than cited | three lines that paraphrase a rule, then its name |

## .the test

> **would a reader who never saw the review need this line?**

no → cut it. the review is where an argument belongs; the file is where a fact does.

## .what to keep

the fact a future edit would otherwise undo, in the fewest words:

```ts
// ⚠️ `String.search`, never `RegExp.test` — `test` advances a `/g` marker's `lastIndex`,
//   and the markers are module-level constants, so state would leak across classifiers.
```

without that line the next author reverts to `.test` and the defect returns. the three
paragraphs that surrounded it did no such work.

⚠️ **a rejected alternative earns a line ONLY where a future edit would plausibly reach for
it**, and then one line, never a weighed comparison.

## .the sizes

a small transformer wants ~2–6 lines of docblock. a genuinely subtle operation may want
more — but the extra lines must be FACTS about the subject, never defenses of it.

## .enforcement

blocker: a docblock that justifies its subject's existence · a hypothetical failure story ·
a weighed alternative a future edit would not reach for · placement rationale derivable
from the tree.
nitpick: a rule paraphrased where its name would serve.

⇒ the same habit shows up in yields and visions, and the cure is identical:
`rule.always.yield-the-output-not-the-archaeology` (bhrain/driver) and
`rule.forbid.revision-accretion-in-deliverables`.
