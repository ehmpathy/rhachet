import { MalfunctionError } from 'helpful-errors';

/**
 * .what = one directioned turn in a clone's conversation — an inbound `say` (a
 *   human/dispatch turn) or an outbound reply (the clone's own words)
 * .why = `get` observes a two-sided conversation; a bare assistant-only string
 *   drops the inbound half and cannot tell a caller which direction a turn went.
 *   `direction` is a FIELD a machine reads, never a glyph it must scrape
 * .note = named `direction`, not `dir` — `dir` already names "directory" throughout
 *   this domain (`cloneDir`, `actorDir`, `tempDir`); the shorter form would overload
 *   one word onto two unrelated senses (rule.forbid.ambiguous-labels)
 * .note = `at` is the transcript record's ISO timestamp (null when a brain omits it);
 *   the `get` tree renders it as a relative `T0+<elapsed>` offset, and a machine reads
 *   the absolute stamp as a field
 */
export interface CloneMessage {
  direction: 'in' | 'out';
  text: string;
  at: string | null;
}

/**
 * .what = extract the plain text of a transcript record's `content`, whether it
 *   arrived as a bare string (a user turn) or an array of blocks (an assistant
 *   turn, or a user turn carrying tool-results)
 * .why = claude-cli records a user turn's content as EITHER a string or a block
 *   array, and an assistant turn's as a block array; one extractor covers both so
 *   the caller need not branch on the wire shape
 */
const asContentText = (content: unknown): string => {
  // a bare-string content IS the text (a plain user turn)
  if (typeof content === 'string') return content;

  // a block array — join every text block; tool_use / tool_result blocks add no text
  if (Array.isArray(content))
    return content
      .filter(
        (block): block is { type: 'text'; text: string } =>
          typeof block === 'object' &&
          block !== null &&
          (block as { type?: unknown }).type === 'text' &&
          typeof (block as { text?: unknown }).text === 'string',
      )
      .map((block) => block.text)
      .join('');

  // any other shape carries no text
  return '';
};

/**
 * .what = distill one brain-cli transcript line into its directioned CloneMessage —
 *   the per-brain observe adapter for `get`
 * .why =
 *   - a brain-cli writes its session as a jsonl transcript, one structured record
 *     per line: assistant messages, user turns, tool calls, tool results. `get`
 *     shows a human the CONVERSATION — both the dispatched `say`s (user turns, the
 *     inbound half) and the clone's replies (assistant turns, the outbound half)
 *   - one owner of the transcript shape means a second brain's format is a second
 *     adapter here, not a scatter of ad-hoc json reads across the observe path
 *
 * .note = pure: a textless record (a tool-use-only assistant turn, a tool-result
 *   user turn) → null (computeCloneMessages filters the nulls). a record that
 *   cannot be parsed is a CORRUPT complete line → fail loud (getCloneOutput only
 *   hands complete lines here; a torn last line it holds back)
 */
export const asCloneMessage = (input: {
  line: string;
}): CloneMessage | null => {
  // .note = deliberate mutation — assigned once inside the try (a JSON.parse that
  //   may throw on corrupt bytes); bounded to this scope, never escapes this function
  let record: {
    type?: unknown;
    timestamp?: unknown;
    message?: { content?: unknown };
  };
  try {
    record = JSON.parse(input.line);
  } catch (error) {
    return MalfunctionError.throw(
      'clone transcript line is corrupt (bad json)',
      {
        line: input.line.slice(0, 200),
        cause: error instanceof Error ? error : undefined,
      },
    );
  }

  // the record's own ISO timestamp, when the brain wrote one — else null
  const at = typeof record.timestamp === 'string' ? record.timestamp : null;

  // an assistant record is the clone's OUTbound reply
  if (record.type === 'assistant') {
    const text = asContentText(record.message?.content);
    return text.length > 0 ? { direction: 'out', text, at } : null;
  }

  // a user record is an INbound turn — a dispatched `say` or a human turn
  if (record.type === 'user') {
    const text = asContentText(record.message?.content);
    return text.length > 0 ? { direction: 'in', text, at } : null;
  }

  // any other record type (a bare tool result, a system event) carries no turn
  return null;
};
