import type { CloneInputContent } from '../screen/computeCloneInputContent';
import {
  type CloneInputState,
  isCloneFocus,
  isCloneInputRegion,
} from '../screen/computeCloneInputState';
import type { CloneScreenLive } from '../screen/genCloneScreenFeed';
import { CloneWireCorruptionError } from './CloneWireCorruptionError';

/**
 * .what = why a `get` read is probe-blind — no live input state to classify
 * .why = three distinct causes, and they name DIFFERENT fixes:
 *   - `feed-not-live` — a same-version daemon whose screen feed has not attached yet (a
 *     brand-new clone pre-first-chunk); the remedy is to WAIT and retry
 *   - `feed-faulted` — a same-version daemon whose emulator write/resize threw, so the
 *     grid's parse integrity is in doubt; a wait never clears it — only a RE-ENROLL does
 *   - `peer-probe-blind` — an OLDER daemon that predates the read channel entirely, so it
 *     cannot answer a probe at all; the remedy is to re-enroll to a version that answers
 *   all three drive `unreadable`, but the remedy copy differs (wait vs re-enroll)
 */
const CLONE_PROBE_BLIND_REASONS = [
  'feed-not-live',
  'feed-faulted',
  'peer-probe-blind',
] as const;

/**
 * .what = the closed set of probe-blind reasons, as a value that is the single source of
 *   truth — the one owner both the wire parse (asCloneGetReply) and the degrade copy
 *   (computeCloneSayReport) narrow against
 * .why = two sites map an arbitrary wire reason onto this set. a cascade of `=== 'x' ? …`
 *   per site drifts the moment a fourth reason lands — one site learns it, the other keeps
 *   its old default to `feed-not-live` and lies about the fix. one guard, narrowed in both
 *   places, gives the set a single owner (r4). the type DERIVES from the tuple, so a new
 *   reason is compiler-forced into the guard — no hand-maintained shadow array (r11-i018-n1)
 */
export type CloneProbeBlindReason = (typeof CLONE_PROBE_BLIND_REASONS)[number];

/**
 * .what = narrow an arbitrary wire value to a known probe-blind reason
 * .why = the wire may carry a reason this client does not know (a newer peer, a corrupt
 *   frame); a caller reads the copy off a closed set, so an unknown value cannot index the
 *   copy map. the caller of this guard decides the fail-safe fallback — see asCloneGetReply,
 *   where a PRESENT unknown reason falls to the re-enroll remedy and an OMITTED one to the
 *   milder wait remedy (r7-n1)
 */
export const isCloneProbeBlindReason = (
  value: unknown,
): value is CloneProbeBlindReason =>
  typeof value === 'string' &&
  (CLONE_PROBE_BLIND_REASONS as readonly string[]).includes(value);

/**
 * .what = map an arbitrary wire `reason` value to a known probe-blind reason, fail-safe
 * .why = the wire may carry a reason this client cannot classify (a newer peer's slug, a
 *   corrupt producer), and the three probe-blind causes name different remedies (wait vs
 *   re-enroll), so the fallback direction is a safety choice, not a default. one named owner
 *   of that choice, so the parse reads a call rather than a nested three-way ternary (r3/r4-n):
 *   - a KNOWN reason → itself
 *   - PRESENT but unknown → `peer-probe-blind` (remedy: RE-ENROLL). the fail-safe direction: for
 *     a cause we cannot classify, "wait, the feed attaches" is hazardous (a caller waits forever
 *     on a read that never clears), where an unnecessary re-enroll costs at worst one re-enroll
 *     (rule.forbid.failhide, r7-n1)
 *   - OMITTED (undefined) → the milder `feed-not-live` wait default (an under-specified reply)
 */
const asCloneProbeBlindReasonFromWire = (input: {
  reason: unknown;
}): CloneProbeBlindReason =>
  isCloneProbeBlindReason(input.reason)
    ? input.reason
    : input.reason === undefined
      ? 'feed-not-live'
      : 'peer-probe-blind';

/**
 * .what = the reply a clone's socket server sends back for a `get` read
 * .why = a `get` reads the clone's input surface off the rendered screen. two outcomes:
 *   the feed is live and the read carries a classified input state (`probe: 'capable'`),
 *   or no live read is available (`probe: 'unsupported'`) — the honest degrade that drives
 *   the `unreadable` verdict rather than a false `absent` (V7). `probe` states the strength
 *   of the read, always present (the vision's `probe` field)
 */
export type CloneGetReply =
  | {
      probe: 'capable';
      state: CloneInputState;
      grid?: CloneScreenLive;
      content?: CloneInputContent;
    }
  | { probe: 'unsupported'; reason: CloneProbeBlindReason };

/**
 * .what = is a parsed `content` payload a well-formed pair of input-surface row sets
 * .why = the NARROW half of an opt-in read: two input surfaces, never the turn output above
 *   them and never the whole grid (`grid` is the wide half, and a caller pays for it
 *   separately). validated rather than cast for the same reason `grid` is — a corrupt producer
 *   must not flow a non-array into a renderer the compiler believes is safe
 * .note = an OLDER daemon that predates this field answers without it. that is version skew,
 *   never corruption, so the caller reports the read unavailable for THAT surface rather than
 *   throws — the same direction `isCloneInputStateOfSkewedPeer` takes for `queued`
 */
const isCloneInputContent = (value: unknown): value is CloneInputContent => {
  if (typeof value !== 'object' || value === null) return false;
  const content = value as Record<string, unknown>;
  return (
    Array.isArray(content.buffer) &&
    content.buffer.every((line) => typeof line === 'string') &&
    Array.isArray(content.queue) &&
    content.queue.every((line) => typeof line === 'string')
  );
};

/**
 * .what = is a parsed `grid` payload a well-formed rendered screen
 * .why = the grid is the DIAGNOSTIC half of a capable reply — the exact rows the
 *   classification above was computed from, carried only when a caller asked for it
 *   (`debug`). it is validated rather than cast so a corrupt producer cannot flow a
 *   non-array into the debug renderer, and it is validated SEPARATELY from `state` so a
 *   malformed grid never kills a say whose message already landed (see asCloneGetReply)
 *
 * .note = `linesBright` is validated too, and its LENGTH is checked against `lines`. the
 *   guard's whole job is to earn the `CloneScreenLive` cast, and that type declares
 *   `linesBright: string[]` — so a peer that omits it (or clamps one grid and not the other)
 *   would pass an older guard and hand the debug renderer an `undefined` typed as an array,
 *   a crash the compiler cannot see. the equal-length clause is not cosmetic either: the
 *   classifier's dim read slices BOTH grids with one row window and relies on an exact
 *   index alignment (getInputBand), so a mismatched pair would read one screen's rules
 *   against another screen's intensities
 */
const isCloneScreenLive = (value: unknown): value is CloneScreenLive => {
  if (typeof value !== 'object' || value === null) return false;
  const grid = value as Record<string, unknown>;
  return (
    grid.live === true &&
    Array.isArray(grid.lines) &&
    grid.lines.every((line) => typeof line === 'string') &&
    Array.isArray(grid.linesBright) &&
    grid.linesBright.every((line) => typeof line === 'string') &&
    grid.linesBright.length === grid.lines.length &&
    typeof grid.cursorX === 'number' &&
    typeof grid.cursorY === 'number' &&
    typeof grid.cols === 'number' &&
    typeof grid.rows === 'number'
  );
};

/**
 * .what = is a parsed `capable` payload a well-formed CloneInputState
 * .why = the wire is our own protocol, so a corrupt `state` from a buggy peer producer is a
 *   defect to fail LOUD on here, never to cast blind. an unvalidated `as CloneInputState`
 *   would flow an unknown `focus` into the dispatch pre-check — where no branch matches, so
 *   it falls through to PROCEED — and into the verdict compute, both silently wrong (r6.b2).
 *   the focus/region narrows live beside their type in the producer (isCloneFocus,
 *   isCloneInputRegion), so a new focus/region value cannot drift from this guard (r11-i018-n2)
 */
const isCloneInputStateSansQueued = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    isCloneFocus(state.focus) &&
    isCloneInputRegion(state.input) &&
    typeof state.countInInput === 'number' &&
    typeof state.countOnScreen === 'number'
  );
};

const isCloneInputState = (value: unknown): value is CloneInputState =>
  isCloneInputStateSansQueued(value) &&
  // `queued` is REQUIRED, never defaulted: it is the one field that parts `enqueued` from
  // `released`, so a peer that omits it cannot answer the question a `get` was asked. to
  // default it to `false` would read every busy peer as released — the exact mislabel the
  // field exists to close, laundered through a fallback (rule.forbid.failhide)
  typeof (value as Record<string, unknown>).queued === 'boolean';

/**
 * .what = is a parsed `capable` payload an INTERMEDIATE daemon's state — every field
 *   well-formed except `queued`, which is absent
 * .why = version skew comes in two flavors, and only one of them was handled. the older one
 *   predates the read channel entirely and replies with a dispatch ack (`phase`); this one
 *   answers the probe with `probe: 'capable'` and a state well-formed on every field that
 *   existed when it spawned. to read that as corruption throws, and a throw here means `say`
 *   REFUSES TO DISPATCH AT ALL against a clone that is otherwise healthy — the exact
 *   false-failure-on-a-live-clone class this wish exists to kill (measured 2026-09-20 against
 *   a 2026-09-16 daemon). so it degrades to probe-blind, in the RE-ENROLL direction: a wait
 *   never grows the peer a field it does not ship, where an unnecessary re-enroll costs at
 *   worst one re-enroll — the same fail-safe choice asCloneProbeBlindReasonFromWire states
 */
const isCloneInputStateOfSkewedPeer = (value: unknown): boolean =>
  isCloneInputStateSansQueued(value) &&
  (value as Record<string, unknown>).queued === undefined;

/**
 * .what = parse one newline-delimited get-reply line back into a typed reply
 * .why = the get client reads the server's reply; this is the ONE parse, paired with
 *   asCloneGetReplyFrame's serialize, so the wire shape has a single owner both ways
 *
 * .note = a bad json line, or a `capable` reply whose `state` is malformed, is a
 *   CloneWireCorruptionError (a MalfunctionError) — the wire is our own protocol, so real
 *   corruption is a defect to fix, not a caller fault (rule.forbid.failhide), and the subclass
 *   lets the `getCloneInputStateOrBlind` degrade tell it apart from a transient transport fault
 *   so it is never masked as a benign probe-blind read. version SKEW is the exception, and it
 *   arrives in two shapes, both degraded to a probe-blind read so `say` dispatches anyway and
 *   verifies by transcript (case=4, V7), never a hard throw that refuses to send at all — the
 *   exact break the vision forbids:
 *   - an OLDER daemon that predates the `probe` request parses our probe as an invalid say and
 *     replies with a dispatch ACK (`phase: 'rejected'`)
 *   - an INTERMEDIATE daemon answers `probe: 'capable'` with a state well-formed on every field
 *     that existed when it spawned, and absent the ones that landed after (`queued`)
 */
export const asCloneGetReply = (input: { line: string }): CloneGetReply => {
  // .note = deliberate mutation — assigned once inside the try (a JSON.parse that may
  //   throw on corrupt bytes); bounded to this scope, never escapes this function
  let parsed: {
    probe?: unknown;
    state?: unknown;
    grid?: unknown;
    content?: unknown;
    reason?: unknown;
    phase?: unknown;
  };
  try {
    parsed = JSON.parse(input.line);
  } catch (error) {
    throw new CloneWireCorruptionError('clone get reply is not valid json', {
      line: input.line,
      cause: error instanceof Error ? error : undefined,
    });
  }

  if (parsed.probe === 'capable') {
    // an INTERMEDIATE daemon answers the probe but predates `queued`. version skew, not
    // corruption — degrade rather than throw, or a healthy clone goes undispatchable
    if (isCloneInputStateOfSkewedPeer(parsed.state))
      return { probe: 'unsupported', reason: 'peer-probe-blind' };
    if (!isCloneInputState(parsed.state))
      throw new CloneWireCorruptionError(
        'clone get reply has a malformed capable state',
        { line: input.line, state: parsed.state },
      );
    // the grid is DIAGNOSTIC-ONLY and OPTIONAL — present only when the caller asked
    // (`debug`), and never a decision input. so a malformed or absent grid is DROPPED
    // here rather than thrown on: a say reaches this parse only after its bytes were
    // delivered, and a throw would kill a landed say over a log field — the exact
    // false-failure-on-a-delivered-message class this wish exists to kill. the drop is
    // not hidden: the debug report names a requested-but-absent grid outright, so the
    // omission is loud on the one surface that reads it (rule.forbid.failhide)
    //
    // `content` rides the same drop-never-throw rule, for the same reason plus one more: an
    // older daemon predates the field entirely, so its absence is routine version skew. the
    // caller reports the surface unavailable rather than a false empty box (rule.forbid.failhide)
    return {
      probe: 'capable',
      state: parsed.state,
      ...(isCloneScreenLive(parsed.grid) ? { grid: parsed.grid } : {}),
      ...(isCloneInputContent(parsed.content)
        ? { content: parsed.content }
        : {}),
    };
  }

  if (parsed.probe === 'unsupported') {
    // accept the wire's OWN declared reason, fail-safe on an unknown one — the named owner of
    // that map states the wait-vs-re-enroll safety choice (asCloneProbeBlindReasonFromWire, r7-n1)
    return {
      probe: 'unsupported',
      reason: asCloneProbeBlindReasonFromWire({ reason: parsed.reason }),
    };
  }

  // an older daemon predates the read channel: it parses our `probe` as an invalid say and
  // replies with a dispatch ack (`phase` present, no `probe`). degrade to probe-blind so the
  // say proceeds and verifies by transcript (case=4), rather than a throw that kills the say
  if (typeof parsed.phase === 'string')
    return { probe: 'unsupported', reason: 'peer-probe-blind' };

  // neither a probe reply nor a recognizable ack — a genuine wire defect, fail loud
  throw new CloneWireCorruptionError('clone get reply has an unknown probe', {
    line: input.line,
    probe: parsed.probe,
  });
};
