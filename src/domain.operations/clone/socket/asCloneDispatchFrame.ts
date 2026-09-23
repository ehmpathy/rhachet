import { CLONE_PASTE_CLOSE, CLONE_PASTE_OPEN } from './constants';

/**
 * .what = the content a clone's dispatch writes into the brain-cli pty — the message
 *   verbatim, WITHOUT the submit `\r`; a MULTI-LINE message wrapped in the bracketed-paste
 *   markers so its newlines land in the input box instead of submitting line one
 * .why =
 *   - the write path (genCloneSocketServer) BULK-writes this content in ONE pty write,
 *     then submits with a separate `\r`. a booted brain-cli TUI (claude-code v2.1.87)
 *     ACCEPTS a bulk content write (proven real-haiku 2026-08-13,
 *     lesson.clone-say-bulk-write-works); the old char-at-a-time cadence was unnecessary
 *   - MULTI-LINE: a raw `\n` submits at the first newline, so a verbatim multi-line write
 *     would send only line one. BRACKETED PASTE (`\x1b[200~` … `\x1b[201~`) is the terminal
 *     protocol for "these bytes are pasted text — insert them, interpret no key", so every
 *     interior `\n` inserts a line and no byte submits; the separate `\r` then commits the
 *     whole block as ONE turn. measured real-opus v2.1.87 2026-09-17: the three lines land
 *     in the box VERBATIM, across three rendered rows, with no marker text and no escape
 *     residue (see `.the measured alternatives` below)
 *   - a single-line message carries no interior `\n`, so it is returned UNWRAPPED and stays
 *     byte-identical to the proven bulk-write hot path (zero risk to the common case)
 *   - a lone TRAILING `\n` is dropped: it directly precedes the submit `\r`, so it would
 *     otherwise insert a blank final line before the commit
 *   - the submit `\r` is DELIBERATELY excluded: it is written separately, once the daemon
 *     OBSERVES the content committed into the input box (awaitCloneSubmitReady), else the
 *     Enter lands in the same pty read as the content and submits an empty line
 *
 * .the measured alternatives = three mechanisms exist for a multi-line insert; only one
 *   delivers the message verbatim. measured live against claude-code v2.1.87, 2026-09-17:
 *   - `\x1b\r` (ESC+CR, the injectable Option/Shift-Enter) — NOT honored. the ESC is eaten
 *     as an escape and every line but the LAST is discarded, so a three-line say arrives as
 *     its final line alone, silently. this was the prior mechanism and the defect behind
 *     `.dream/2026_09_15.soft-newline-multiline-dispatch-unhonored-by-claude-v2.1.87`
 *   - `\` + CR (backslash-enter, claude's documented portable multi-line key) — honored,
 *     all lines land as one turn, but each non-final line KEEPS its literal trailing `\`,
 *     so the brain records a message the caller never sent. a corruption, so refused
 *   - bracketed paste — honored, verbatim, no residue. adopted
 *
 * .note = pure: this only shapes the content bytes; the socket server writes them and
 *   submits. the message content is gated separately (isSafeCloneDispatchInput), which
 *   allows a plain `\n` and rejects a caller-injected ESC — so the paste markers are only
 *   ever code-introduced here, past the gate, never caller input
 */
export const asCloneDispatchFrame = (input: { message: string }): string => {
  // a lone trailing newline precedes the submit, so it would insert a blank final line
  const body = input.message.replace(/\n$/, '');

  // the hot path: no interior newline, so no wrapper — byte-identical to the proven write
  if (!body.includes('\n')) return body;

  return `${CLONE_PASTE_OPEN}${body}${CLONE_PASTE_CLOSE}`;
};
