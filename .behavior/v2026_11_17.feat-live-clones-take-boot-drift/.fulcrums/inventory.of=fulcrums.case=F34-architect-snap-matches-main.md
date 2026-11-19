# F34 · the `rhx init +architect` snapshot holds as it is on main

## .the fork

- **a.** keep the snapshot that reads `🫧 no roles with hooks found`
- **b.** move the case to a role that declares hooks, per r8.blocker.2 (5.3, i001)

## .taken = a

- `git diff origin/main -- blackbox/cli/__snapshots__/rhx.acceptance.test.ts.snap` is empty: this pr
  leaves the snapshot exactly as main holds it, so it masks no regression this pr made
- `package.json` pins the same `rhachet-roles-ehmpathy` as main (1.43.0), and in that version
  `getArchitectRole.js` names hooks only in its `.why` comment and declares none; the snapshot states
  that fact
- hook discovery and apply stay covered by the mechanic, driver, and behaver roles, whose hooks
  `init --hooks` applies in `syncHooksForLinkedRoles.integration` and `enroll.acceptance`

## .rework = clean

re-point the case at a role with hooks and resnap; no contract moves.

## .confidence = 90%, why

the evidence is two diffs and one file read; the only doubt is whether the reviewer read a stale base.

## .where

`blackbox/cli/rhx.acceptance.test.ts`. answers r8.blocker.2 (5.3, i001).

## .verdict

owed — a council rules at the close.
