# F73 — must a `roles cost --when` flag refusal wear the `🧢` treestruct of the over-budget halt?

- **raised** = 2026-10-06, at `5.3.verification`, `review.peer i002` — `ergo-snapshot-visual-blemishes` blocker.3
- **rework** = dirty
- **status** = OPEN — **no**; a flag refusal wears the one cli error frame, like every peer flag refusal
- **confidence** = **85%**

## .the fork, stated fairly

`init.hooks.boot-guard` `[case3]` pins the `--when hook.bogus` refusal as a bare
`✋ ConstraintError: …` frame. the same file's `[case1][t2]` and `[case2][t1]` pin the over-budget
halt under a `🧢 roles cost --all --when hook.onStop` treestruct.

| | **flag refusals keep the cli error frame** (taken) | **wrap them in the `🧢` treestruct** |
|---|---|---|
| owner | `asCliErrorFrame`, the one owner of cli error output for every rhx command | a second, per-command frame for flag refusals |
| peers that match | every `roles cost` flag refusal: `--top`, `--what`, `--role`, `--all` conflicts, `--subject` (`roles.cost.acceptance.test.ts.snap:126-468`, 10 sites) | none — it would diverge from all ten |
| what moves | naught | the cli error frame, or a fork of it, and every refusal snapshot it renders |

## .the call, and why

the two renders are two different kinds of output, not one kind in two shapes:

- the `🧢` treestruct is a **measured-state readout**: it lists specs, budgets, and token counts the
  command measured before it halted. the tree carries data.
- a flag refusal measured naught. it is a parse failure, and it renders through the same
  `asCliErrorFrame` every rhx command uses — glyph, class, message, json envelope, `[args]` trailer.

to wrap `[case3]` alone in a `🧢` banner makes it diverge from the ten `roles cost` flag refusals
it is a peer of, which is the consistency defect the rule forbids, moved one row over.

## .why the confidence is 85%

the reviewer's read is fair from inside one snapshot file. the open question is which peer set a
flag refusal belongs to — the halts it shares a file with, or the flag refusals it shares a frame with.

## .rework

dirty — a frame change for flag refusals ripples through `asCliErrorFrame` or forks it, and touches
every refusal snapshot across the cli.
