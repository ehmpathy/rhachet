import type { CloneGetReply } from '../socket/asCloneGetReply';
import type { CloneGetWhat } from './asCloneGetWhat';

/**
 * .what = the render of a live input-surface read — the tree a human reads off
 *   `rhx clone get @:x --what buffer|queue`
 * .why = the classification alone (`dirty`, `queued`) tells a human THAT their box is occupied
 *   and never BY WHAT. this shows the rows, so a caller refused by `input-region-dirty` can see
 *   what refused them without a second say that may clobber it (F15)
 *
 * .note = it renders the SURFACE the caller asked for, never both. a `--what buffer` that also
 *   printed the queue would widen the read past what was asked, and the two surfaces answer
 *   different questions ("is my text still uncommitted?" vs "is it waiting for the brain?")
 *
 * .note = a probe-blind reply renders its own cause + remedy rather than an empty surface — an
 *   empty render would read as "the box is clear", the exact false-clear `rule.forbid.failhide`
 *   and V7 forbid. the three causes name different fixes (wait vs re-enroll), so each is stated
 *
 * .note = 🔴 a NON-`input` focus is the same false-clear, one layer in: the probe answered, so
 *   `probe: 'capable'` holds — and a modal or unrecognized screen has no locatable input band, so
 *   the content read honestly returns zero rows. those zero rows must NOT render as "clear". so
 *   the focus check precedes the empty check; invert the two and the residual swallows it
 */
export const asCloneInputSurfaceText = (input: {
  reply: CloneGetReply;
  what: CloneGetWhat;
  address: string;
}): string => {
  const { reply, what, address } = input;

  if (reply.probe === 'unsupported') {
    const remedy =
      reply.reason === 'feed-not-live'
        ? 'the screen feed has not attached yet — retry in a moment'
        : reply.reason === 'feed-faulted'
          ? 'the emulator faulted, so the grid is in doubt — a wait never clears it; re-enroll the clone'
          : 'this daemon predates the read channel — re-enroll the clone to a version that answers a probe';
    return [
      `😶 ${address} — the ${what} could not be read`,
      `   ├─ cause: ${reply.reason}`,
      `   └─ fix: ${remedy}`,
    ].join('\n');
  }

  // an OLDER daemon answers the probe and predates the content field. it must not render as an
  // empty box: that reads as "clear" about a surface never read (rule.forbid.failhide)
  if (reply.content === undefined)
    return [
      `😶 ${address} — the ${what} could not be read`,
      '   ├─ cause: this daemon answers a probe but predates the content read',
      '   └─ fix: re-enroll the clone to pick up the current daemon',
    ].join('\n');

  // 🔴 the probe answered and the SCREEN is still unreadable. a modal or an unrecognized screen
  // has no locatable input band, so the content read returns zero rows — and zero rows would
  // otherwise render as "the input box is clear", a false clear about a box never located
  // (rule.forbid.failhide). the focus check must precede the empty check, or the residual eats it
  if (reply.state.focus !== 'input')
    return [
      `😶 ${address} — the ${what} could not be read`,
      `   ├─ cause: the screen is on ${reply.state.focus}, so the input band is not locatable`,
      reply.state.focus === 'modal'
        ? "   └─ fix: read what the modal asks with --debug; it must be cleared at the clone's own tty"
        : '   └─ fix: read the screen with --debug; the measured causes are permanent, so re-enroll the clone',
    ].join('\n');

  const rows = what === 'queue' ? reply.content.queue : reply.content.buffer;

  // an empty surface is a REAL answer here — the probe read it, the screen is on `input`, and it
  // holds no rows — so it renders as such, and states what that means per surface. the queue's
  // empty case is the subtler one: `queued` false means the brain holds no message, so no
  // candidate row set exists
  if (rows.length === 0)
    return what === 'queue'
      ? [
          `😶 ${address} — the queue is empty`,
          '   └─ the brain holds no submitted-but-unreleased message',
        ].join('\n')
      : [
          `😶 ${address} — the input box is clear`,
          '   └─ no uncommitted text, so a say would land rather than clobber',
        ].join('\n');

  const header =
    what === 'queue'
      ? `😶 ${address} — the queue holds ${rows.length} row(s)`
      : `😶 ${address} — the input box holds ${rows.length} row(s)`;

  // one row per line, indexed, so a human maps a render row to the screen row it came from and
  // a multi-row entry (an interior newline, or a soft-wrap) reads as the one entry it is
  const body = rows.map((row, index) => `   │  ${index} │ ${row}`);

  // 🟡 the queue render states its own bound. the rows above the band hold a queued message and
  // a released turn alike (measured 2026-09-18 — neither position nor intensity parts them), so
  // this is a CANDIDATE set the non-empty queue vouches for, never a proof of membership per row
  const footer =
    what === 'queue'
      ? [
          '   │',
          '   └─ 🟡 a candidate set: the queue is non-empty, so these rows are what it holds —',
          '      a released turn renders in the same region, so read the count, not a given row',
        ]
      : [
          '   │',
          '   └─ read it twice a second apart: rows that GREW are a human mid-type; rows that',
          '      held still are either a human who paused or stale output awaiting a redraw',
        ];

  return [header, '   │', ...body, ...footer].join('\n');
};
