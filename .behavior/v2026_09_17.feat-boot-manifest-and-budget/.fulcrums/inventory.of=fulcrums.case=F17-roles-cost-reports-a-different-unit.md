# F17 — `roles cost` reports a different unit than the gate that refused you

- **rework** — clean
- **status** — ANSWERED
- **confidence** — 80%
- **raised at** — `5.1.execution`, task #6 (the `<stats>` budget line)
- **where** — `src/domain.operations/role/getRoleFileCosts.ts:81`

---

## .the fork

requirement 7 made `roles boot` count real tokens over the full emitted payload. `roles cost` was
not in that requirement's reach, and it still computes:

```ts
const tokens = Math.ceil(chars / 4);   // getRoleFileCosts.ts:81
```

so once the gate ships, one payload carries two token numbers:

| the author runs | they are told |
|---|---|
| `roles boot` on a budgeted spec | the **measured** count, over the full body |
| `roles cost`, to find what is heavy | `chars / 4`, per file, over say-content alone |

🔴 **and `roles cost` is the diagnostic path the halt leaves them**, because `F13` removed the
per-resource breakdown from the halt — deliberately, since the gate can see a resource's cost and
not its value. ⇒ the author's only tool for *which* doc to trim reports in a different unit than the
gate that refused them.

## .the options weighed

| # | option | what it costs |
|---|---|---|
| **A** | leave `roles cost` alone; the two units diverge | the seam stands, and it lands on the one author who is mid-trim |
| **B** | give `roles cost` the real tokenizer too | ⚠️ **out of this wish's reach** — a third surface, and it puts ~2MB of rank tables on a second binary's critical path |
| **C** | mark the units so the two do not read as a contradiction | cheap, honest, and it does not close the gap |

## .taken — A, with C's disclosure, and B named as the forward fix

**`roles cost` is untouched this behavior.** two reasons, and the first decides it:

1. 🔴 **it is a third surface, and the wish bounds this behavior to two.** the wish names
   `roles boot` and `boot.yml`, and forbids the two consumer halves by name. `roles cost` is not
   one of the forbidden pair, and it is not one of the named pair either — to take it in is to
   widen scope on my own warrant, which is the failure `F13` already cost this route once.
2. the perf argument is real but secondary: `roles cost` runs from a bun binary that does **not**
   carry js-tiktoken in its eval graph (which is how task #2 knew the tokenizer was absent there).

**what IS done here is C, and it is what makes A tolerable:** `roles boot` never prints two token
numbers at once. where a budget is declared, the `chars / 4` estimate is **dropped** and the block
reports the measured count and the cap. where none is, the block is byte-identical to today.

⇒ so the contradiction cannot arise **within one render**. it arises only across two commands, and
only for a budgeted spec — which is the narrowest form the seam can take without a scope widen.

## .what would overturn it

- a measurement that shows `roles cost`'s estimate misleads an author onto the wrong doc. 🟡 note
  the estimate errs **low** per-file and its per-file error is unbounded (measured −26% on the worst
  brief), so a rank ORDER derived from it can be wrong, not merely the magnitude
- a second behavior that takes `roles cost` in scope — which is where option B belongs

## .the residual doubt — 80%

I am confident the scope call is right and less confident the disclosure is sufficient. a reader who
runs both commands still meets two numbers, and naught in either output says why they differ. ⇒ a
one-line unit marker on `roles cost`'s output would close that, and it is a `roles cost` edit, which
is the very act this fulcrum declines to make.

🟡 **so the honest statement is that C is applied where I am permitted and absent where I am not.**

## .the verdict — superseded by later work: option B landed

the `roles cost` surface was later rebuilt on the gate's own counter. `getRoleFileCosts.ts` is gone;
`roles cost` now counts through `calcBootPayloadTokens` with `getOneBrainTokenCounter`, the same
call `assertBootWithinBudget` makes, and its readout says so: `tokens = N (full emitted payload,
o200k_base)`. so the two commands name one number, and the seam this fulcrum disclosed is closed.

the cross-command test that pins it: `roles.cost.acceptance.test.ts` `[case9][t4]` runs
`roles cost --all` and `roles boot` on the over-budget spec, and asserts the cost row's count equals
the halt's `payload` count.

## .see also

- `F12` — what counts as payload; the measurement this seam descends from
- `F13` — why the halt names no resource, which is what makes `roles cost` the diagnostic path
- `F15` — the stats block exclusion, decided in the same edit
