/**
 * .what = checks whether a hook command boots a linked role — `roles boot --role X`
 * .why = a role boot hook is superseded by the brain dir boot.md, so hook discovery drops it
 *
 * .note = the boot must be the command itself — `rhachet roles boot`, its `rhachet boot` and
 *   `rhx boot` aliases, bare, via `npx`, or by path. a command that merely mentions the phrase
 *   is kept (`echo "roles boot"`), and `rhx roles boot` is a skill lookup, never the `roles`
 *   command. a false positive deletes a human's hook, so the anchor errs toward the keep
 *
 * 🔴 .note = only a boot qualified by `--role` is superseded, because boot.md renders linked
 *   roles alone. a `--manifest` boot carries a payload boot.md never holds, so its hook is the
 *   one path into context — drop it and the payload, and its budget gate, vanish in silence
 */
export const isRolesBootCommand = (input: { command: string }): boolean =>
  /^\s*(?:npx\s+)?(?:\S*\/)?(?:rhachet\s+(?:roles\s+)?boot|rhx\s+boot)\b/.test(
    input.command,
  ) && /\s--role(?:[\s=]|$)/.test(input.command);
