import { isSafeCloneDispatchInput } from './isSafeCloneDispatchInput';

/**
 * .what = the accept-time decision for one parsed wire frame — which of three routes it takes,
 *   plus the payload that route needs. a pure classification: parse, kind, content-safety, and
 *   the `force` flag, decided with NO socket, NO screen read, NO liveness check
 * .why = the socket server's accept loop used to parse-then-decide-then-execute inline, so the
 *   route decision was provable only at the integration grain (r011-i007-n3).
 *   `computeCloneDispatchPrecheck` already split the dequeue gate's decision from its effect;
 *   this is the same split for the accept gate. the executor stays thin: it reads THIS route and
 *   performs the one effect each needs — a screen read for `probe`, a liveness gate + enqueue for
 *   `say`, an ack for `reject`
 *
 * .note = the two effects the classifier CANNOT own stay in the executor by design:
 *   - a `probe` reads the live rendered screen (an effect), so the classifier only carries its
 *     needle and lets the executor read + reply
 *   - a `say` must clear the brain-cli-liveness gate (`isBrainCliAlive`, an effect + an
 *     invariant), so the classifier decides it is a well-formed say and the executor checks
 *     liveness at accept time (define.invariant.clone-socket-brain-cli-only)
 *
 * .note = the reject-reason ORDER matches the old inline order exactly: not-valid-json, then
 *   not-a-say, then disallowed-control. the content gate precedes the executor's liveness gate,
 *   as before, so a disallowed say with a dead brain still rejects `disallowed-control`
 */
export type CloneAcceptRoute =
  | { route: 'probe'; needle: string; debug: boolean; content: boolean }
  | { route: 'say'; message: string; force: boolean }
  | {
      route: 'reject';
      reason: 'not-valid-json' | 'not-a-say' | 'disallowed-control';
    };

/**
 * .what = classify one wire frame into its accept route — pure, total over the three routes
 * .why = the accept loop reads THIS to decide, then executes the one effect the route needs.
 *   a `switch`-free decision keeps every branch a returned value, so the route decision is
 *   unit-tested apart from the socket, the screen, and the liveness gate
 */
export const computeCloneAcceptRoute = (input: {
  frame: string;
}): CloneAcceptRoute => {
  // parse the request; a malformed one is a reject, never a crash
  // .note = deliberate local — assigned once inside the try (a JSON.parse that may throw)
  let request: {
    kind?: unknown;
    message?: unknown;
    needle?: unknown;
    debug?: unknown;
    content?: unknown;
    force?: unknown;
  };
  try {
    request = JSON.parse(input.frame);
  } catch {
    return { route: 'reject', reason: 'not-valid-json' };
  }

  // a `probe` is a READ — it never touches the child's pty, so it bypasses the content gate,
  // the liveness gate, and the write queue. it carries only its needle; the executor reads the
  // rendered screen and replies. `probe` is a NOUN, so it adds no new WRITE verb (F08)
  // `debug` and `content` are the two explicit OPT-INs to screen text beside the
  // classification, and BOTH default OFF — the F02/F03 invariant holds for every routine read,
  // so only a caller that asks gets any screen text back. `=== true` so a truthy non-boolean
  // cannot opt in. they are separate flags because they grant different widths: `debug` the
  // whole viewport (every turn the brain rendered), `content` the two input surfaces only
  if (request.kind === 'probe')
    return {
      route: 'probe',
      needle: typeof request.needle === 'string' ? request.needle : '',
      debug: request.debug === true,
      content: request.content === true,
    };

  // not a say at all — an unknown kind or a non-string message
  if (request.kind !== 'say' || typeof request.message !== 'string')
    return { route: 'reject', reason: 'not-a-say' };

  // the content gate — only plain text + SGR color may reach the child
  if (!isSafeCloneDispatchInput({ message: request.message }))
    return { route: 'reject', reason: 'disallowed-control' };

  // a well-formed say. `--force` rides the frame as a boolean; the dequeue pre-check reads it to
  // override a dirty input region (never a modal or an unrecognized screen)
  return {
    route: 'say',
    message: request.message,
    force: request.force === true,
  };
};
