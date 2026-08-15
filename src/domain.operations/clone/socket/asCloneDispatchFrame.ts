import { CLONE_SOFT_NEWLINE } from './constants';

/**
 * .what = the content a clone's dispatch writes into the brain-cli pty — the message
 *   with each INTERIOR newline mapped to the soft-newline escape, WITHOUT the submit
 *   `\r` and WITHOUT any bracketed-paste wrapper
 * .why =
 *   - the write path (genCloneSocketServer) BULK-writes this content in ONE pty write,
 *     then submits with a separate `\r`. a booted brain-cli TUI (claude-code v2.1.87)
 *     ACCEPTS a bulk content write (proven real-haiku 2026-08-13,
 *     lesson.clone-say-bulk-write-works); the old char-at-a-time cadence was unnecessary
 *   - MULTI-LINE support: a raw `\n` submits the message at the first newline, so a
 *     verbatim multi-line write would send only line one. each interior `\n` is mapped
 *     to CLONE_SOFT_NEWLINE (`\x1b\r`, the injectable Shift/Option-Enter), which inserts
 *     a newline with NO submit — so the whole block lands as one input, then the separate
 *     `\r` commits it as ONE turn. a single-line message has no interior `\n`, so it is
 *     byte-identical to the proven bulk-write path (zero risk to the hot path)
 *   - a lone TRAILING `\n` is dropped: it directly precedes the submit `\r`, so it would
 *     otherwise insert a blank final line before the commit
 *   - NO bracketed-paste markers: claude's input reader renders `\x1b[200~`/`\x1b[201~`
 *     as LITERAL `200~`/`201~` text in the box, a corruption of the message — it does
 *     not honor the paste wrapper on injected input (dogfood 2026-08-13)
 *   - the submit `\r` is DELIBERATELY excluded: it is written separately, after a
 *     length-scaled submit delay (computeCloneSubmitDelay), so the Enter lands in its own
 *     pty read AFTER claude commits the paste, else the Enter submits an empty line and
 *     the message is left unsent (the larger the paste, the longer the commit takes)
 *
 * .note = pure: this only shapes the content bytes; the socket server writes them and
 *   submits. the message content is gated separately (isSafeCloneDispatchInput), which
 *   allows a plain `\n` and rejects a caller-injected ESC — so the soft-newline escape
 *   is only ever the code-controlled translation of a safe `\n`, never caller input
 */
export const asCloneDispatchFrame = (input: { message: string }): string =>
  input.message.replace(/\n$/, '').split('\n').join(CLONE_SOFT_NEWLINE);
