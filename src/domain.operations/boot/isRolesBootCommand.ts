/**
 * .what = checks whether a hook command runs `rhachet roles boot`
 * .why = a role boot hook is superseded by the brain dir boot.md, so hook discovery drops it
 *
 * .note = the `rhachet` executable must be the command itself — bare, via `npx`, or by path.
 *   a command that merely mentions the phrase is kept (`echo "roles boot"`), and `rhx roles boot`
 *   is a skill lookup, never the `roles` command. a false positive deletes a human's hook, so
 *   the anchor errs toward the keep
 */
export const isRolesBootCommand = (input: { command: string }): boolean =>
  /^\s*(?:npx\s+)?(?:\S*\/)?rhachet\s+roles\s+boot\b/.test(input.command);
