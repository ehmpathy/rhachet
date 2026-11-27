# fulcrum F2: a real file at `keybindings.json` is replaced

## .the fork
a source exists, and `<brainDir>/keybindings.json` is a real file or a foreign arrow (a hand linked
it elsewhere). the same fork holds for both. claude's `/keybindings` command
writes its template with `precondition:{type:"ifAbsent"}` (2.1.332 bundle), so it never replaces an
arrow already in place. the real file arises when a clone ran `/keybindings` on a box with no source,
and the human later created `~/.claude/keybindings.json`.
- **A** replace it with the arrow — the human's home file is the one answer
- **B** keep it — the clone's edit stands, and the actor stops to follow the human's file

## .taken
A. it matches the settings precedent: a real file where an arrow belongs is replaced, never kept
aside (`define.brain-dir-layout-is-one-for-every-actor`, the 2026-10-07 settlement). B forks the
actor from the human's bindings forever, which is the defect this wish cures.

## .rework
clean — one branch in the findsert.

## .confidence
70%. A drops a clone-made edit. the settings precedent accepted that drop for `/model`; a keybind
edit is rarer and more deliberate. the `ifAbsent` read narrows the case to a box that gained a
source after a clone made its own file, which makes the loss rarer still.

## .where
`setBrainDirSettingsLayout.ts`, the keybindings `setArrow` call.

## .verdict
A, confirmed by the director, 2026-11-27, at the 1.vision approval
