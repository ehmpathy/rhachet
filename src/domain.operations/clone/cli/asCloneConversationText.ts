import { asIsoTimeStamp, getDuration, toMilliseconds } from 'iso-time';

import type { CloneMessage } from '../socket/asCloneMessage';

/**
 * .what = the tree-render format for `rhx clone get`
 * .why = a human wants the two-sided conversation (blocks); a comms relay wants the
 *   verbatim reply stream to forward (raw). one union names the choice
 */
export type CloneConversationFormat = 'blocks' | 'raw';

/**
 * .what = a message's time as a relative offset from T0 — `T0+HHhMM` (e.g. `T0+01H05M`)
 * .why =
 *   - an absolute ISO stamp per turn is noise; what a reader wants is the SHAPE of the
 *     conversation over time — how long after the first turn each one landed. T0 is the
 *     first turn, and every offset reads against it, like a stopwatch
 *   - the elapsed comes off iso-time's getDuration → toMilliseconds (the sanctioned
 *     boundary to hand a duration to a raw consumer); the H/M split is pure display
 * .note = returns null when either stamp is absent — a brain that omits timestamps
 *   still renders, just without an offset
 */
const asElapsedLabel = (input: {
  since: string;
  at: string | null;
}): string | null => {
  if (input.at === null) return null;
  const ms = toMilliseconds(
    getDuration({
      of: {
        range: {
          since: asIsoTimeStamp(input.since),
          until: asIsoTimeStamp(input.at),
        },
      },
    }),
  );
  // display-only: split the sanctioned-boundary ms into whole hours + minutes
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `T0+${pad(hours)}H${pad(minutes)}M`;
};

/**
 * .what = render a clone's directioned messages into the `get` tree text
 * .why =
 *   - `blocks` (default) is the human-legible treebucket: a `😶🎧 talk of <addr>` root
 *     that names WHOSE talk this is + the `tail` cap (so a short conversation explains
 *     itself — a smaller count reads as "that is all within the last N", never "some
 *     turns were dropped"), then one `├─`/`└─` branch per turn — `🎙️` (inbound say) /
 *     `🎧` (outbound reply) with its `T0+<elapsed>` offset — over a `├─`…`└─` sub.bucket
 *     that holds the turn's body (the treestruct idiom for multiline content,
 *     rule.require.treestruct-output). a trunk `│` bridges every turn — the header
 *     down into the first branch, and each later turn's close down into the next —
 *     so the treestruct reads connected end to end, never a floating blank gap.
 *     `😶` is the neutral clone face, `🎧` the get artifact — never a role-mascot,
 *     rhachet is voiceless (rule.prefer.emoji-language)
 *   - `raw` is the pipe-clean relay path: the OUTbound replies only, as bare text —
 *     the verbatim-forwardable stream a comms relay reads (the extant `get` contract)
 *
 * .note = pure: the invoker gathers the messages + the tail + picks the format; this
 *   only maps them to text. json output never comes through here (it carries the
 *   structured `messages` array directly), so a machine reads `direction`/`at` as fields
 */
export const asCloneConversationText = (
  input: { messages: CloneMessage[]; tail: number | 'all'; address: string },
  options: { format: CloneConversationFormat },
): string => {
  // the relay path: outbound replies only, bare text, no glyphs to strip. an
  // empty conversation stays a bare empty string — a comms relay reads a
  // pipe-clean machine stream, so a human-read label would corrupt it
  if (options.format === 'raw')
    return input.messages
      .filter((message) => message.direction === 'out')
      .map((message) => message.text)
      .join('\n');

  // the tail label makes the view explain itself: it names the cap that bounds how
  // many turns show, so a human understands WHY a short conversation is short
  const tailLabel = input.tail === 'all' ? 'tail all' : `tail ${input.tail}`;
  // the clone talk header (rule.prefer.emoji-language): `😶` the clone face, `🎧` the
  // get artifact — you LISTEN to the clone (the output counterpart to say's `🎙️` mic).
  // it names WHOSE talk this is + the tail cap, so a short conversation explains itself
  const header = `😶🎧 talk of ${input.address}  ·  ${tailLabel}`;

  // the human path, empty: an explicit legible empty-state leaf, never blank stdout —
  // every empty state in this surface names itself (rule.require.status-feedback).
  // the trunk `│` bridges the header down into the leaf, same as every turn below
  if (input.messages.length === 0)
    return `${header}\n   │\n   └─ (no messages yet)`;

  // T0 = the first shown turn that carries a stamp; every offset reads against it
  const t0 = input.messages.find((message) => message.at !== null)?.at ?? null;

  // .note = deliberate mutation — a local treebucket accumulator, joined then returned
  const lines: string[] = [header];
  input.messages.forEach((message, index) => {
    const last = index === input.messages.length - 1;
    // turns are the root's direct children, so each branch sits at a 3-space indent;
    // a non-last turn's body hangs off a `│` continuation, the last turn's off blanks
    const branch = last ? '   └─' : '   ├─';
    const cont = last ? '      ' : '   │  ';
    // the direction glyph carries the whole turn: `🎙️` = spoken IN (a say / inbound),
    // `🎧` = listened to (a reply / outbound) — the mic/headphones pair from the header
    const directionGlyph = message.direction === 'in' ? '🎙️' : '🎧';
    const elapsed =
      t0 !== null ? asElapsedLabel({ since: t0, at: message.at }) : null;

    // a connector line above every turn, including the first — the trunk `│`
    // bridges the header down into the first branch, and every later turn's
    // `│` continues the trunk from the prior turn's close. a bare blank line
    // here would break the treestruct's visual connection
    // (rule.require.treestruct-output)
    lines.push('   │');

    // the turn's branch: just the direction glyph + the relative offset, no words, no dot
    lines.push(
      `${branch} ${directionGlyph}${elapsed !== null ? ` ${elapsed}` : ''}`,
    );

    // the body is a sub.bucket: open `├─`, a blank `│`, each body line as `│  `, a
    // blank `│`, close `└─` — the treestruct idiom for multiline content, with the
    // required whitespace above the content and below it (rule.require.treestruct-output)
    lines.push(`${cont}├─`);
    lines.push(`${cont}│`);
    for (const bodyLine of message.text.split('\n'))
      lines.push(`${cont}│  ${bodyLine}`);
    lines.push(`${cont}│`);
    lines.push(`${cont}└─`);
  });
  return lines.join('\n');
};
