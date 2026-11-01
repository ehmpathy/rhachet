# F16 — the role-pin bump rides in this PR

## .the fork
- (a) the bump of `rhachet-roles-ehmpathy` 1.39.3→1.40.0, `rhachet-roles-bhrain` 0.39.3→0.42.4,
  `rhachet-roles-bhuild` 0.23.1→0.23.4 and `rhachet-brains-openrouter` 0.1.3→0.1.4 stays here,
  with the test and snapshot moves it causes
- (b) the bump splits into its own PR; this branch reverts it and the moves it caused

## .taken
(a). the bumped roles are the roles that boot this route: `rhachet-roles-bhrain` 0.42.4 holds the
driver machinery the route runs on (the review lanes, the absorb gate, the level-3 lanes), and
`rhachet-roles-ehmpathy` 1.40.0 writes its hooks and permissions into `settings.of.repo.json`, the
split layout that `inventory.of=requirements.case=8` requires a role init to meet. the test moves
follow from that layout, not from a criterion this wish changes:
- `invokeInit` [case2] now finds `"permissions"`, because a role init writes it into
  `settings.of.repo.json`
- the `init.incremental` and `rhx.acceptance` snapshots now name `settings.of.repo.json`, and count
  the briefs and skills the new versions ship
- `defaultPeerReviewerBrain` follows the path bhrain renamed

## .what (a) gives up
one PR carries two concerns, so a reviewer of the wish reads churn the wish did not ask for. the
architect role's hooks line (`🫧 no roles with hooks found`) follows the upstream package and is
not graded against its own intent here.

## .rework
dirty: a revert strips the route machinery that drives this stone, and the case-8 layout proof
would then run against roles that predate it. a split must land the bump first, then rebase this
branch onto it. whether to split is a scope call for the wisher.

## .confidence = 80%
the bump serves the route and the layout, not the wish's outcome; a wisher who wants a pure diff
would choose (b).

## .where
`package.json`, `pnpm-lock.yaml`, `src/contract/cli/invokeInit.integration.test.ts` [case2],
`blackbox/cli/__snapshots__/init.incremental*.snap`, `blackbox/cli/__snapshots__/rhx*.snap`;
`.reviews/peer/5.3.verification._.review.i005.*.r012.*` blocker.3.
