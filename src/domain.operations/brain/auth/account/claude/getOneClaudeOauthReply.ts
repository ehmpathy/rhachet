import {
  asClaudeReplyStatus,
  type ClaudeReplyStatus,
} from './asClaudeReplyStatus';
import { CLAUDE_OAUTH } from './claudeOauth';

/**
 * .what = one http call to a claude oauth endpoint, classified
 * .why = the mint, the profile and the usage reads share headers, a timeout, a no-redirect rule
 *   and a status table; one transport holds them
 * .note = a token rides only in the header or the body, never the url; no error here carries it
 * .note = a network fault (timeout, dns, reset) or a body that is not json is `unreadable`; only
 *   those fault kinds are caught, every other error propagates
 */
export const getOneClaudeOauthReply = async (input: {
  call: 'mint' | 'read';
  url: string;
  accessToken: string | null;
  body: Record<string, unknown> | null;
}): Promise<{
  status: ClaudeReplyStatus;
  httpStatus: number | null;
  json: unknown;
}> => {
  // compose the headers the endpoint expects
  const headers: Record<string, string> = {
    'anthropic-beta': CLAUDE_OAUTH.betaHeader,
    'User-Agent': CLAUDE_OAUTH.userAgent,
  };
  if (input.body) headers['Content-Type'] = 'application/json';
  if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`;

  // send the call; a network fault reads as unreadable
  const response = await fetch(input.url, {
    method: input.body ? 'POST' : 'GET',
    headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(CLAUDE_OAUTH.timeoutMs),
  }).catch((error: unknown) => {
    if (isFetchFault(error)) return null;
    throw error;
  });
  if (!response) return { status: 'unreadable', httpStatus: null, json: null };

  // classify the status; read the body only on success
  const status = asClaudeReplyStatus({
    call: input.call,
    httpStatus: response.status,
  });
  if (status !== 'ok')
    return { status, httpStatus: response.status, json: null };
  const json: unknown = await response.json().catch((error: unknown) => {
    if (isReplyBodyFault(error)) return undefined;
    throw error;
  });
  if (json === undefined)
    return { status: 'unreadable', httpStatus: response.status, json: null };
  return { status, httpStatus: response.status, json };
};

/**
 * .what = is this error a fault of the reply body: not json, or a body cut off mid-read
 * .why = allowlist the body catch the same way as the fetch catch; any other error is ours, and propagates
 */
const isReplyBodyFault = (error: unknown): boolean =>
  error instanceof SyntaxError || isFetchFault(error);

/**
 * .what = is this error a fault fetch raises for the network, not a defect of ours
 * .why = allowlist the catch, so a real bug is never read as an unreadable reply
 */
const isFetchFault = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'TimeoutError' ||
    error.name === 'AbortError' ||
    (error.name === 'TypeError' && error.message === 'fetch failed'));
