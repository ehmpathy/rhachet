# F17 — the unreadable `clone get` tree takes subbranches on the lines this PR touches

- **fork**: the new `probe-unanswered` reason needs a `clone get` unreadable render. the extant
  unreadable branches of `asCloneInputSurfaceText` wrote `├─ cause: …` / `└─ fix: …`. render the new
  reason in that colon form, or move every unreadable branch to one helper that writes the cause
  and the fix on subbranches
- **taken**: one helper, `asUnreadableSurfaceText`, with subbranches. `rule.forbid.colons-in-stdout`
  makes a new or edited stdout line that uses `:` as a separator a blocker. the new reason's lines
  are new, and the helper is the one place every unreadable branch renders, so the edit reaches all
  of them. a colon form beside a subbranch form for one tree would be two shapes for one render
  (`rule.forbid.ambiguous-labels`). the text of every extant cause and fix is unchanged; only its
  line placement moved. every render the helper emits is snapped, so the shape is reviewable
- **rework**: clean. one helper, one render shape. a revert puts the colon back on each branch
- **confidence**: 85%. the shape change reaches extant branches the wish did not name; the colon rule
  is what makes the reach owed rather than optional
- **where**: `src/domain.operations/clone/cli/asCloneInputSurfaceText.ts` (`asUnreadableSurfaceText`);
  `blackbox/cli/__snapshots__/clone.say.withheld.acceptance.test.ts.snap` `[case10]`
- **verdict**: open, escalated to the wisher. disputed against `5.3 i004 r12 blocker.3` and again
  against `5.3 i005 r12 blocker.3`. the reviewer holds that the reformat is out of scope; only the
  wisher can settle that
