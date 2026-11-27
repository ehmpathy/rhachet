# fulcrum F4: the credfree skill and its refusal test ride #846 byte for byte

## .the fork
- **A** carry `test.acceptance.credfree.sh` exactly as `ehmpathy/rhachet#846` has it, plus the help
  snapshot its header change forces; leave every new test to #846
- **B** carry #846's case4 (the `--what` refusal snapshot) byte for byte too; leave its case5 (the
  integration-path run) to #846
- **C** write our own `--what` tests, or change the skill here

## .taken
B. the director set the shape: match #846 so the two prs agree. a peer (5.3, r4) held that a new
refusal branch with no snapshot leaves a caller path unproven on main if #846 stalls.

- case4 and its snapshot entry are identical in both prs, at the same spot. git merges an identical
  change on both sides cleanly, so the second pr to merge meets no conflict there
- case5 scopes to a probe suite only #846 adds, so it cannot ride here whole. a rewrite against
  another suite would conflict on the same hunk. the integration path is proven here by use: every
  integration suite of this change ran through `--what integration` (129 passed)
- the value-less `--what` abort is shared with the extant `--scope`. it belongs in the skill's own pr

## .rework
clean — drop case4 and its snap entry, or add case5 once #846 merges.

## .confidence
85%. the residue: until #846 merges, the integration-mode run of the skill has no test of its own.

## .where
`.agent/repo=.this/role=any/skills/test.acceptance.credfree.sh`, its `.integration.test.ts` and
snap; `ehmpathy/rhachet#846`.

## .verdict
open — for the commander at the pr.
