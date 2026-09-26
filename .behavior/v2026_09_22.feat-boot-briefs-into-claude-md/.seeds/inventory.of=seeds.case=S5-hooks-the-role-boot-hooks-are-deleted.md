# S5 — hooks: the role boot hooks are deleted

## .holds

- `rhx init` and `rhx upgrade` remove the role boot hooks from the repo's `.claude/settings.json`.
- the delete is scoped to our author tag and the `roles boot` command. a human's hooks and the adhoc hook stay.
- `assertRegistryBootHooksDeclared` flips: it no longer demands an `onBoot` hook.
- role packages drop their `onBoot` declarations later — a dream, harmless meanwhile.
- the repo's brain dir now carries the boot those hooks used to deliver (S3).

## .said

> yes, delete the hooks; on `rhx init` and `rhx upgrade`
