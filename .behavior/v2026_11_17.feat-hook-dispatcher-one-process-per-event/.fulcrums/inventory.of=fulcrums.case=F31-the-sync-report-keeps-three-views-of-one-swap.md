# F31 — the sync report keeps three views of one swap

## .the fork

peer review 5.3 i003 r011 nitpick.3: on a first sync, `init.hooks` case8 shows one change three
ways: `+1, -1` on the role row, `1 role hook moved from the settings into the manifest` under
`🪝 hook dispatchers set`, and `1 created / 1 deleted` under `✨ hooks`. a move reads as a delete.

- **(a)** fold the three into one line
- **(b)** keep the three blocks, each with its one job

## .taken

(b). each block answers its own question, and each is extant output a human already reads:

- the role row (`+1, -1`) says which role changed, on which brain, and predates the dispatcher
- `🪝 hook dispatchers set` is the one block that shows the new shape: rules per event, dispatchers,
  and that role hooks left the settings for the manifest
- `✨ hooks` is the run's total across every role and brain, also extant

a fold would drop the per-role view or the per-run total, and either one is the read a human
scrolls back to after a run of many roles. the `moved` line in the dispatch block says that the
`-1` is a move, not a loss.

## .rework

clean. the three render sites are in `syncHooksForLinkedRoles.ts`; a fold is a change to one of
them and a resnap.

## .confidence

80%. on a one-role first sync, three blocks are more than the change needs. on the many-role runs
that make up most real syncs, each block carries information the others do not.

## .where

`src/domain.operations/init/hooks/syncHooksForLinkedRoles.ts`;
`blackbox/cli/init.hooks.acceptance.test.ts` [case8]

## .verdict

open, best-guessed.
