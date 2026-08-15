/**
 * .what = the server-side content gate for a `say` message — ALLOW plain text +
 *   SGR color, REJECT any terminal-control escape (cursor/screen CSI, OSC, or a
 *   bracketed-paste marker)
 * .why =
 *   - the whole safety premise over kitty/tmux full-terminal control is that a
 *     `say` touches ONLY the brain's message-input, never the wider terminal. a
 *     message that carries a cursor-move, a screen-clear, an OSC (title/clipboard),
 *     or — worst — a bracketed-paste TERMINATOR could break out of the paste frame
 *     and inject raw control. this gate is that boundary, enforced server-side
 *   - SGR color IS allowed, because the comms-relay usecase legitimately forwards
 *     colored output; color cannot escape the input channel, cursor control can
 *
 * .note = pure: it scans the message for ESC (0x1b) sequences and classifies each.
 *   the ONLY escape allowed is an SGR CSI (ends in `m`); every other ESC — a
 *   non-`m` CSI, an OSC (`ESC ]`), a bare ESC, a paste marker — fails the gate
 */
export const isSafeCloneDispatchInput = (input: {
  message: string;
}): boolean => {
  const { message } = input;

  for (let i = 0; i < message.length; i += 1) {
    // only ESC (0x1b) starts a control sequence — plain text flows through
    if (message.charCodeAt(i) !== 0x1b) continue;

    // a CSI sequence is `ESC [` … final-byte; all else is rejected outright
    if (message[i + 1] !== '[') return false;

    // read the params up to the final byte (0x40–0x7e ends the CSI)
    // .note = deliberate mutation — a local scan cursor over the CSI params;
    //   advances within this iteration only, never escapes the loop
    let j = i + 2;
    while (j < message.length) {
      const code = message.charCodeAt(j);
      if (code >= 0x40 && code <= 0x7e) break;
      j += 1;
    }

    // SGR (color/style) ends in `m` — the ONLY CSI a message may carry
    if (message[j] !== 'm') return false;

    // skip past this allowed SGR and continue the scan
    i = j;
  }

  return true;
};
