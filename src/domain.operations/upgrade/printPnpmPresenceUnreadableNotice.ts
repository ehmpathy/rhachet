/**
 * .what = tells a human their pnpm-presence probe never answered, and that npm ran instead
 *
 * .why  = 🚨 an UNREADABLE probe must be surfaced, never swallowed into the fallback. the
 *   upgrade still proceeds on npm — a wedged PATH lookup is no reason to refuse an upgrade
 *   npm can perform — but the two ways to reach npm are not the same event. *"you have no
 *   pnpm"* is ordinary; *"your PATH never answered"* is a host fault that will bite them
 *   again elsewhere.
 *
 *   to print naught is the failhide: they watch npm start, and if npm then fails they debug
 *   npm — with no trace of the hung probe that redirected them (`rule.forbid.failhide`).
 *
 * .why its OWN operation = the text carries three earned constraints (below), so it wants
 *   one owner a review can read and a clamp can pin.
 *
 * .note = the probe is named by its PURPOSE, never by its command — a human needs to know
 *   WHICH probe hung, not which binary we reached for, and a purpose-name travels to every
 *   platform where a binary-name is wrong on at least one.
 *
 * .note = the last line names a concrete NEXT MOVE, never the datum alone. a wedged mount
 *   is transient and the probe re-runs on every upgrade, so a re-run IS the cure — and a
 *   disclosure with no move is a blocked state a human cannot act on
 *   (`rule.require.errors-name-the-fix`).
 *
 * .note = 🚨 NO SHELL COMMAND IS NAMED. this notice reaches darwin, linux AND win32, and
 *   `echo $PATH` is POSIX-only — cmd.exe wants `%PATH%`, powershell `$env:PATH`. so it
 *   names the DATUM rather than a way to print it, and `PATH` is the variable's name on
 *   all three (`rule.forbid.host-specific-cures-in-hints`, guarded by
 *   `HOST_SPECIFIC_SHELL_TOKENS`).
 *
 * .note = `⚠️` rather than a role mascot — `rhx upgrade` is rhachet's OWN cli, so its
 *   output takes a neutral callout glyph (`rule.prefer.emoji-language`).
 */
export const printPnpmPresenceUnreadableNotice = (input: {
  /**
   * .what = the probe's time bound, already rendered for a human (e.g. `10s`)
   * .why  = an INPUT rather than a read, so the constant that owns the number stays its
   *   one owner. a figure retyped here would be a second owner no test can redden
   */
  timeoutWords: string;
}): void => {
  console.log('');
  console.log('⚠️ heads up — could not tell whether pnpm is installed');
  console.log(
    `   ├── the pnpm-presence probe did not answer within ${input.timeoutWords}`,
  );
  console.log(
    '   ├── so this upgrade proceeds with npm, which may not be your usual',
  );
  console.log(
    '   ├── likely an unresponsive mount named in your PATH environment variable',
  );
  console.log(
    '   └── once that mount answers again, re-run this upgrade — it re-probes each time',
  );
  console.log('');
};
