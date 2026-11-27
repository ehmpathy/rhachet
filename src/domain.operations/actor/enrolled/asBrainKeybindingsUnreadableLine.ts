/**
 * .what = the one line enroll prints when the box holds a keybindings file it cannot read
 * .why = an unreadable file is no failure — the clone runs on claude's default keys — but it
 *        is never silent: the clone shows the default submit hint, and the line names the path,
 *        the two causes the probe reads as unreadable, and the fix, so the human sees why their
 *        keys did not reach the clone
 * .note = an absent file stays silent: no keybindings file is the common case, not a fault
 */
export const asBrainKeybindingsUnreadableLine = (input: {
  keybindingsSource: string;
}): string =>
  `ℹ keybindings at ${input.keybindingsSource} could not be read (a link loop, or no read permission) — the clone keeps claude's default keys; fix the file, then enroll again`;
