# fulcrum F21 — close the banner at its cause, or state the recipe?

- raised  = `5.1.execution` `review.peer r009` (ergo-friction-hazards, blocker.1)
- rework  = 🔴 **dirty**
- status  = ANSWERED
- confidence = 🔴 **90%**

## .the fork, stated fairly

`calc.tokens --format json` advertises *"json for a pipe"*, and a bare pipe fails — `rhx`
prints two lines of chrome to **stdout** before any skill runs.

| option | what it costs |
|---|---|
| **A — move the banner to stderr** | 🔴 it breaks a **prior behavior's declared contract**; 4 acceptance suites + 4 integration spies re-blessed |
| **B — state the true contract in the help, and name the recipe** | the cause stays; the caller succeeds first try |
| C — drop `--format json` | removes a capability the wisher's entoolment instruction implies |

## .taken, and why at the time

**B**, plus a caught dream + this row.

🔴 **A is the CORRECT repair and it is out of scope, on cited evidence rather than on a hunch.**
`src/contract/cli/invokeRun.ts` already emits the identical banner to **stderr** on the failure
path (`:202-211`, *"print header + status to stderr (so it shows when stdout hidden)"*) and to
**stdout** on the success path (`:71-75`). so the repo has settled once that the banner is chrome,
and the success path never took that settlement.

⚠️ but the success stream is **pinned by a named assertion of another behavior**:

```ts
// blackbox/cli/run.graceful-errors.acceptance.test.ts:27-28
then('stdout contains skill identifier', () => {
  expect(result.stdout).toContain('🪨 run solid skill');
});
```

`v2026_02_22.graceful-skill-errors` set that clamp deliberately, and
`rule.require.review-test-changes` forbids a change that degrades a prior behavior's clamp with
no owner to re-decide it. ⇒ **the scouts-honor CLEAN question answers itself: no.**

## .rework, and why

🔴 **dirty.** to take A later is to re-decide the output contract of the generic skill runner,
which ripples into `run.skill`, `rhx.pnpm-hoisted`, `run.graceful-errors`, and `calc.tokens`
acceptance snapshots plus four `logSpy` assertions. that is a wish of its own, and it owes the
graceful-errors behavior's owner a say.

## .confidence, and why it is not higher

**90%.** the deferral rests on a rule and a citation, both checkable. the 10% is whether B truly
removes the friction or merely documents it — I judge it removes it, because the reviewer's
hazard was *"promises a pipe, breaks a pipe"* and the help now names the pipe that works, so a
caller never meets the parse error. a reader who holds that a documented recipe is still friction
has a fair case, and the dream is what keeps that case alive.

## .where

- `.agent/repo=.this/role=any/skills/calc.tokens.sh` — the header, and `show_help`
- `.dream/2026_09_18.rhx-success-banner-on-stdout-breaks-every-machine-readable-skill.dream.md`
- `src/contract/cli/invokeRun.ts:71-75` — the line option A would move

## .the verdict, once ruled

— (open to the wisher's overrule; taken as B for this stone)
