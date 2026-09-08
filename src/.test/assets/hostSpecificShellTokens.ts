/**
 * .what = the shell tokens that do NOT work the same way across the three platform
 *   families rhachet supports, and so must never appear in a cure a human reads
 *
 * .why  = `rule.forbid.host-specific-cures-in-hints` — a hint that names a command
 *   absent (or spelled differently) on a host its row reaches is a dead end, and a
 *   confident dead end costs more than no hint at all. no compiler and no test reads
 *   a string as a shell, so prose review was the only guard, and prose review missed
 *   it twice.
 *
 * 🚨 ONE owner, imported by EVERY surface that renders a cure. it lives here rather than
 *   beside any single test because the rule is a property of the REPO's output, never of
 *   one operation's — a guard scoped to the instance it was born from passes while the
 *   class recurs beside it.
 *
 * ## .the tokens, and why each is here
 *
 * | token | why it is host-specific |
 * |---|---|
 * | `readlink` | GNU-only `-f`; macos ships BSD readlink, win32 has neither |
 * | `$(` | POSIX command substitution; not cmd.exe or powershell syntax |
 * | `` `which `` | absent from stock cmd.exe (`where` is the win32 form) |
 * | `` `realpath `` | GNU coreutils; absent on stock macos and win32 |
 * | `echo $` | POSIX variable expansion; cmd.exe uses `%VAR%`, powershell `$env:VAR` |
 * | `%PATH%` | a cmd.exe-only form |
 * | `$env:` | a powershell-only form |
 *
 * .note = each token is anchored (a backtick, a `$` suffix, or a bare `$(`) so an
 *   ordinary english "which", or a field name like `rhachetRealpath`, cannot
 *   false-positive.
 *
 * .note = `ldd` is deliberately ABSENT. the only hint that names it is the `unknown`-libc
 *   row, and `getPtyPlatformSupport` returns `unknown` ONLY inside its
 *   `platform === 'linux'` branch — so it is linux-only advice on a linux-only row. that
 *   premise is clamped in `getPtyPlatformSupport.test.ts`, so a drift reddens there.
 */
export const HOST_SPECIFIC_SHELL_TOKENS = [
  'readlink',
  '$(',
  '`which',
  '`realpath',
  'echo $',
  '%PATH%',
  '$env:',
] as const;
