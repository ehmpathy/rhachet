# F6 · the command is `rhx clone boot drift --when hook.onStop`

## .the fork

- **a.** `rhx clone boot drift` — under `clone`, since the drift belongs to one clone's spawn
- **b.** `rhx roles boot drift` — beside `roles boot`, since the content is the boot
- **c.** `rhx roles cost --when hook.onStop`, extended

## .taken = a

the drift is a fact about one clone (its spawn revision), resolved from `RHACHET_CLONE_SERIAL`, the
way `clone whoami` resolves itself. `--when hook.onStop` names the caller, per
`rule.require.when-names-the-caller`. bare, it prints the drift tree and exits 0, so a human can run
it against `@:<slug>` too (`--of @:<slug>`).

## .rework = clean

a name, before any caller exists.

## .confidence = 70%

## .verdict

owed, from the wisher at vision review.
