# F12 — a box with no grove drops the tracked grove arrows

## .the fork
- A: drop `settings.json`, `settings.of.grove.json` and the `.home` leaf on a box with no
  `~/.claude/settings.json` — a ci box or a teammate with no grove sees tracked deletions
- B: keep the two tracked arrows on every box, and make the untracked `.home` leaf a real `{}` file
  where no grove exists
- C: keep the tracked arrows and leave the `.home` leaf pointed at an absent file — a claude write
  would create the human's home settings

## .taken = A, and why — it is a stated requirement, not a deferral
A is not work left undone. it is the behavior a wisher-approved vision requires:
`.behavior/v2026_09_26.fix-config-blend/1.vision.experience.case=4.*.md`, timeline [t0]:

> given a box where ~/.claude/settings.json does not exist … then … the actor's
> settings.grove.json and settings.json do not exist

and that case states the gap on purpose ("the rule allows this one layout gap: every actor lacks the
two grove names … together, on this box"). B makes both names exist on that box, so B narrows a
stated requirement. `rule.forbid.dropped-behavioral-requirements` reserves that change to the wisher.
this wish (the local arrow) never asked for it.

proof that A holds: `setBrainDirSettingsLayout` [case4], [case4b]; `enroll.acceptance` [case2c][t1]
("neither grove arrow is written — not even a broken one").

C is the harm A exists to prevent.

## .rework = clean, if the wisher amends case=4
the grove-less branch of `setBrainDirSettingsLayoutWithinLock` writes a `{}` leaf in place of three
removals; [case4], [case4b], [case2c][t1] and case=4 [t0] update with it.

## .confidence = 70%, low because
the reviewer (r010 i004 n7) is right that the `.home` mirror removed A's first reason: with an
untracked leaf at the chain's end, B keeps the safety A was for and drops the churn. the case for B
is real; the authority to take it is the wisher's.

## .where
`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` (the `!isGrovePresent` branch)

## .verdict
owed — for the wisher at the close: amend fix-config-blend case=4 [t0] to B, or keep A.
