# F18 — two reviewers ask opposite shapes of one test, twice

- **fork**: two pairs of review lanes ask for opposite edits to the same lines:
  - `.trim()` on the slowbox stderr snapshots. `5.3 i001 r6` (snapshot-visual-blemishes) asked to
    drop the blank lines before and after the frame; `5.3 i004 r11`
    (enroll-verif-snapshot-blemishes) asks to keep them, as the `clone.say.delivered` peer does
  - the `when('[t0] the report is computed')` wrapper in `computeCloneSayReport.test.ts`.
    `5.3 i003 r7` (mech-given-when-then) asked for it; `5.3 i004 r12` (enroll-verif-test-intent)
    asks to revert it, since it renames every snapshot key
- **taken**: keep the edit the first lane asked for, in both pairs. each was conceded, applied, and
  verified on an independent run before the second lane read it; a revert would re-open the first
  lane's point and leave the pair to trade the same lines each round
  - the trim: the test comment states its reason (the frame's spacer lines are terminal layout, and
    the snapshot opens on the `💥` line). the frame itself is not this PR's change
  - the wrapper: `rule.require.given-when-then` names the `when` as the act step. the key rename is
    a one-time cost; a word diff showed only key lines moved, 19 entries, bodies byte for byte
- **rework**: clean. each is a one-line revert plus one resnap
- **confidence**: 75%. both reviewers cite a real rule; neither pair can be satisfied at once
- **where**: `blackbox/cli/clone.say.slowbox.integration.test.ts`,
  `blackbox/cli/clone.say.slowbox.realbrain.acceptance.test.ts`,
  `src/domain.operations/clone/socket/computeCloneSayReport.test.ts`
- **verdict**: open. disputed against `5.3 i004 r11 nitpick.1` and `5.3 i004 r12 nitpick.1`. a third
  opinion, or the wisher, settles which shape stands
