import { getAllCloneEpisodes } from '../getAllCloneEpisodes';

/**
 * .what = whether a clone has sent a request yet, and whether one has been answered
 * .why = the boot cache gate acts only on a clone's FIRST request, and releases its followers on
 *   the lead's first answer; both read off the transcripts linked in the clone's `history/`
 *
 * .note = `started` is a row of `type: "user"` that is not `isMeta`: the first prompt the clone
 *   sent. claude writes mode, permission, and SessionStart hook rows before any request (seen in a
 *   v2.1.280 clone transcript), so "any row" would read every fresh clone as started
 * .note = `answered` is a row of `type: "assistant"`. claude writes that row once a content block
 *   of the first response is done, so the cache entry the api makes at response start is readable
 *   by then
 * .note = a partial last line (the brain-cli mid-write) is skipped, never a fault: the next poll
 *   reads it whole
 */
export const getCloneTranscriptProgress = (input: {
  cloneDir: string;
}): { started: boolean; answered: boolean } => {
  // each answer parses lines only until the first row that settles it
  const lines = getAllCloneEpisodes({ cloneDir: input.cloneDir })
    .episodes.flatMap((episode) => episode.content.split('\n'))
    .filter((line) => line.trim().length > 0);
  const started = lines.some((line) => {
    const row = asTranscriptRowHead({ line });
    return row?.type === 'user' && !row.isMeta;
  });
  const answered = lines.some(
    (line) => asTranscriptRowHead({ line })?.type === 'assistant',
  );
  return { started, answered };
};

/**
 * .what = the `type` and `isMeta` of one transcript row, or null when the line is no whole
 *   json object
 */
const asTranscriptRowHead = (input: {
  line: string;
}): { type: string | null; isMeta: boolean } | null => {
  try {
    const row: unknown = JSON.parse(input.line);
    if (typeof row !== 'object' || row === null) return null;
    // .note = a json boundary: the parse yields `unknown`; the cast names only the two keys read,
    //   each typed `unknown` and checked below, so no shape is assumed
    const { type, isMeta } = row as { type?: unknown; isMeta?: unknown };
    return {
      type: typeof type === 'string' ? type : null,
      isMeta: isMeta === true,
    };
  } catch (error) {
    // a partial line is the one fault expected here; JSON.parse throws no other kind
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};
