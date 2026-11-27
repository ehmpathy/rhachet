# fulcrum F12: the arrows are asserted by value, not snapped

## .the fork

peers (5.3 i002, r10 and r11) asked for more snapshots on the acceptance journey: a `name -> target`
table of the brain dir for [t0], [t1], [t3] and [t4], and an `rhx init` keybindings case in
`blackbox/`.

- **A** keep the arrows asserted by value (`readlinkSync`, `lstatSync`, the home bytes read through
  the chain), snap only what enroll prints, and prove `init` at the integration grain
- **B** add a brain-dir table snapshot per journey, and an `init` acceptance case

## .taken: A

- a snapshot pins what a human reads. enroll prints naught about the arrows on success, absence,
  removal, or late creation, so [t0] and [t1] snap the same quiet tree on purpose: it proves no
  keybindings line leaks into either. the brain dir is not output
- the arrow shape is two exact strings, and each is asserted exactly: the top arrow equals
  `.home/.claude/keybindings.json`, the home arrow equals `<home>/.claude/keybindings.json`, and the
  bytes read through equal the home file. a table snap would hold the same two strings behind a
  path mask, and would add a resnap to every brain-dir change of any kind
- `rhx init` reaches the arrows through the same findsert enroll calls (`setBrainDirSettingsLayout`).
  the repo actor ([case1b]), the gitignore ([case1]), and the derived-actor sync are each proven at
  integration. the wish names enroll

## .rework: clean

one snapshot `then` per journey, or one `init` case in `blackbox/cli/`.

## .confidence: 80%

a reviewer of the pr diff sees the arrows only as asserts, not as a block to vibecheck.

## .where

`blackbox/cli/enroll.acceptance.test.ts` [case2g];
`src/domain.operations/init/boots/setRepoActorBrainDirLayout.integration.test.ts` [case1b].

## .verdict

open — for the commander, with the pr.
