# fulcrum F6: an unreadable home keybindings file reads as absent

## .the fork

the home `keybindings.json` exists but enroll cannot read it: a symlink cycle (ELOOP), a read
denied on a parent dir (EACCES, EPERM), or a file of mode 000. `statSync(..., { throwIfNoEntry:
false })` does not fold these into absence, and a mode-000 file stats as a file, so the probe adds a
read check (`accessSync(R_OK)`) after `stat`.

- **A. refuse loud** — a `ConstraintError` that names the path and the fix, before any write
- **B. read as absent** — drop the arrows of ours with the reason `keybindings unreadable`; enroll runs on

## .taken: B, with one `ℹ` line on enroll's stderr

- the wish: with no source, enroll skips the arrows and exits as before. a file no process can read
  is, to a clone, no file
- a bare claude on that box logs the fault and runs on defaults; B gives a clone the same keys
- A blocks every `rhx init` and enroll on the box over an optional cosmetic file, and the shield
  calls the layout at span end, so the refusal can land after the work is done
- the grove probe (`existsSync`) already reads the same faults as absent; B matches it
- an unexpected errno still throws: only the three a human causes at the home path degrade

- a silent degrade would show the very symptom the wish fixes (the default submit hint) with no
  cause. so the layout returns `keybindings: { source, state }`, and enroll prints one line under
  the gate the grove line uses (`asBrainKeybindingsUnreadableLine`). an absent file stays silent

## .rework: clean

one leaf, `getOneKeybindingsSourceState`, one line transformer, and their cases (integration case20,
case21; acceptance case2g [t5]). a switch to A swaps the `'unreadable'` return for a throw and
reverts those cases to refusal asserts.

## .confidence: 85%

`rhx init` prints no line for it: only enroll, which spawns the clone that would show the default keys.

## .where

`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`, `getOneKeybindingsSourceState`.

## .verdict

open — for the commander, with the pr.
