/**
 * .what = a pty screen buffer with its terminal mechanics stripped, so a failure dump reads
 *   as the text a human saw rather than as the escape stream that painted it
 * .why = 🔴 the clone harness spawns a REAL brain-cli inside a pty, so its mirror is a full
 *   tui paint stream. attached raw to a `MalfunctionError`, a reader gets bytes like
 *   `\x1B[33B\x1B[31m*\x1B[39m\x1B[40;1H` where the one sentence of plain text they need to
 *   diagnose the failure is buried among them
 * .why = and the harm compounds at the slice. both dump sites keep the LAST 4000 chars; on a
 *   raw buffer that budget is spent almost entirely on escapes, so a dump shows a few
 *   hundred chars of real text. stripped first, the same 4000 chars carry 4000 chars of
 *   what the brain actually said
 *
 * .note = 🔴 this is NOT `asSnapshotSafe` / `asPtySnapshotSafe`, and must not become them.
 *   those exist to make a render DETERMINISTIC for a snapshot, so they also mask paths,
 *   serials, and stamps. a failure dump wants the opposite — every volatile value is the
 *   evidence a diagnostician reads, and a masked temp path is a lead destroyed. so this
 *   strips terminal MECHANICS only and masks no value at all
 *
 * .note = a colorless brain-cli would not solve this. most of the noise is CURSOR MOTION
 *   (`\x1B[33B`, `\x1B[40;1H`), not color, and `NO_COLOR` silences only the latter. the two
 *   share one CSI shape, so one strip covers both — which is why the cure belongs here
 *   rather than in an env flag on the spawn
 *
 * .note = `\r` becomes a newline rather than a dropped byte. a pty writes `\r` to return the
 *   cursor so the next paint OVERWRITES the line, so to drop it would concatenate every
 *   frame of a spinner onto one unreadable line. as a newline each frame is its own line,
 *   and the dedupe below then collapses the repeats a spinner produces
 */
export const asLegibleScreen = (screen: string): string => {
  const plain = screen
    // csi — the sequence that carries BOTH color (`m`) and cursor motion (`A`/`B`/`H`/`J`/`K`)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: an ansi pattern needs the esc control char
    .replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '')
    // osc — a title or hyperlink sequence, terminated by BEL or by ST
    // biome-ignore lint/suspicious/noControlCharactersInRegex: an osc pattern needs the esc control char
    .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)?/g, '')
    // a two-byte escape, e.g. the keypad-mode pair a tui toggles on entry and exit
    // biome-ignore lint/suspicious/noControlCharactersInRegex: an escape pattern needs the esc control char
    .replace(/\x1B[@-Z\\-_=]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // the pty pads to the terminal width, which varies by host. `[ \t]` and NOT `\s`, since
    // `\s` matches `\n` and would collapse the blank lines a frame deliberately emits
    .replace(/[ \t]+$/gm, '');

  // collapse the repeats a redrawn frame produces — a spinner repaints its whole line on
  // every tick, so a buffer holds hundreds of identical lines. a run of blanks collapses
  // for the same reason
  const lines = plain.split('\n');
  return lines
    .filter((line, index) => index === 0 || line !== lines[index - 1])
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
