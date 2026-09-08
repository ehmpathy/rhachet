# rule.forbid.narration-in-artifacts

## .what

an artifact states **what is true**, never the story of how it was written. strip every trace of
its own authorship.

## .why

narration is noise that reads as signal. a reader hunts the current answer and finds a debate
about a prior one. and it grows without bound — each pass adds a layer about the last, so the
artifact swells while its substance stays flat.

## .the forbidden moves

| move | example |
|---|---|
| retraction prose | *"an earlier draft claimed X — retracted"* |
| credit / blame | *"the wisher caught what four self-reviews did not"* |
| pass counts | *"the fourth near-drift this round"* |
| self-praise | *"🎯 the decisive catch"*, *"the strongest possible answer"* |
| meta about the doc | *"this section is kept rather than deleted, because…"* |
| deliberation left in | *"i want to be honest that it is the more elegant idea"* |

## .the test

> would this line still make sense to a reader who has never seen a prior version?

- yes → keep
- no → cut

## .the exception

a **correction that changes what a reader would otherwise do** may stay — as one line, in the
present tense, with no story:

```md
👎 ⚠️ an earlier draft called this "three spellings, and a latent trap", and counted the keyless
   unlock as the third. retracted — that is a union ask. the wisher caught it; four self-reviews
   did not. see "the retraction" above.

👍 ⚠️ a bare `unlock --env camp` is a union ask, not a machine-wide one — it yields `false`.
```

## .where the story goes

process lessons are real and belong in a **durable brief** or the learner's `progress.md`, never
in the deliverable. one home each:

| content | home |
|---|---|
| what is true | the artifact |
| what we learned about how we work | a brief |
| what this round distilled | `progress.md` |

## .enforcement

- narration of a prior draft, review pass, or author in a deliverable = **blocker**
- self-congratulation (*"the decisive catch"*, *"🎯"* on one's own work) = **blocker**
- a correction kept as a story rather than a present-tense statement = **nitpick**

## .see also

- `rule.require.timeless-comments` (mechanic) — the same law, at comment grain
- `rule.forbid.buzzwords` — the adjacent noise rule
