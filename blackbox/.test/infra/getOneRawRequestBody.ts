import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a read fault the poll may retry: the opener is not on disk whole yet
 * .note = a MalfunctionError, so were it ever to escape the poll it still names its owner
 */
class OpenerNotYetError extends MalfunctionError {}

/**
 * .what = whether a thrown value is a fault a later attempt may cure — an absent file, a
 *         partial json, or the opener not yet listed. all else is rethrown at once
 * .note = read by shape, never by `instanceof Error`: under jest, fs and JSON errors come
 *         from another realm and fail that check
 */
const isReadFaultRetryable = (error: unknown): error is { message: string } => {
  if (error instanceof OpenerNotYetError) return true;
  if (typeof error !== 'object' || error === null) return false;
  if ((error as { code?: unknown }).code === 'ENOENT') return true;
  return (error as { name?: unknown }).name === 'SyntaxError';
};

/**
 * .what = read the opener's body once: the index's first row, then the file it names
 * .why = one attempt of the poll below; any fault (absent file, partial json, absent field)
 *        throws, so the poll can retry it until the bound
 * .note = `as` casts at an external boundary: these are claude-code's own log files, with
 *         no published types. only the fields read below are named; a shape change surfaces
 *         as a named malfunction here, or a clamp failure on the strings compared
 */
const readOpenerOnce = (input: {
  dir: string;
}): { system?: unknown; tools?: unknown; messages?: unknown[] } => {
  const lines = readFileSync(join(input.dir, 'index.jsonl'), 'utf-8')
    .split('\n')
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0)
    throw new OpenerNotYetError('the index lists no request yet');

  const entry = JSON.parse(lines[0]!) as { request_file?: unknown };
  if (typeof entry.request_file !== 'string')
    throw new OpenerNotYetError('the first index row names no request_file');

  return JSON.parse(
    readFileSync(join(input.dir, entry.request_file), 'utf-8'),
  ) as { system?: unknown; tools?: unknown; messages?: unknown[] };
};

/**
 * .what = the first api request body a brain-cli logged under
 *         `OTEL_LOG_RAW_API_BODIES=file:<dir>`, as its `system`, `tools`, and first-message json
 * .why = the assembly clamp compares what claude actually sent, so a vendor change
 *        that puts a cwd or a date ahead of the boot is seen at the request, not the bill
 * .note = the dir's `index.jsonl` lists each request in send order; the first is the
 *         session's opener
 * .note = polled up to a bound: the brain-cli may still flush a body as its process exits,
 *         so a read at once could meet an absent or partial file. the poll retries until both
 *         files parse, then fails loud with the last cause
 */
export const getOneRawRequestBody = async (input: {
  dir: string;
  timeoutMs?: number;
}): Promise<{ system: string; tools: string; messageFirst: string }> => {
  const timeoutMs = input.timeoutMs ?? 10_000;
  const deadline = Date.now() + timeoutMs;

  // retry each read fault until the bound; the last one is named in the error
  let faultLast = 'no attempt ran'; // .note = deliberate mutation, scoped to the poll
  while (Date.now() <= deadline) {
    try {
      const body = readOpenerOnce({ dir: input.dir });

      // expose the two blocks the cache shares across sessions, and the first message
      //   (where a CLAUDE.md memory would land, were that door open)
      return {
        system: JSON.stringify(body.system ?? null),
        tools: JSON.stringify(body.tools ?? null),
        messageFirst: JSON.stringify(body.messages?.[0] ?? null),
      };
    } catch (error) {
      if (!isReadFaultRetryable(error)) throw error;
      faultLast = error.message;
    }
    await new Promise((done) => setTimeout(done, 100));
  }

  throw new MalfunctionError('no raw request body was logged', {
    dir: input.dir,
    timeoutMs,
    faultLast,
    hint: 'the brain-cli writes bodies only when OTEL_LOG_RAW_API_BODIES=file:<dir> reaches its env',
  });
};
