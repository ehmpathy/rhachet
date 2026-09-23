import { MalfunctionError } from 'helpful-errors';

/**
 * .what = read a clone's address out of the single-line json handoff an enroll emits
 * .why =
 *   - a detached enroll's caller never spawns the clone itself, so the ONLY account
 *     it has of what was stood up is the host's handoff line. a human-faced render
 *     needs the slug/serial/reach out of it
 *   - the parse is a named transformer rather than an inline `JSON.parse(...)` in the
 *     invoker: the failure mode (a host that printed a line other than a handoff)
 *     needs a stated cause, and an orchestrator is no place to decode one
 *     (`rule.forbid.decode-friction-in-orchestrators`)
 *
 * .note = it reads the address trio plus the OUTCOME. the handoff may carry more (an
 *   accrual warn), and a field this does not name is deliberately left to its own reader
 *
 * 🔴 .why the outcome = the caller's human render must state what the host actually
 *   DID, never what the caller assumed. the detach branch fires BEFORE the live-slug
 *   reuse check, so a second `--as <slug>` enroll with no tty reaches the host, reuses
 *   the clone, and spawns no brain — a caller that rendered "enrolled" regardless would
 *   tell the human a billed brain was stood up when none was
 */
export const asCloneAddressFromHandoff = (input: {
  handoff: string;
}): {
  serial: string;
  slug: string | null;
  socketEligible: boolean;
  outcome: 'reused' | 'baked' | 'rebound' | null;
} => {
  const parsed = ((): unknown => {
    try {
      return JSON.parse(input.handoff);
    } catch {
      return MalfunctionError.throw(
        'the detached enroll host printed a line that is not a json handoff',
        { handoff: input.handoff.slice(0, 500) },
      );
    }
  })();

  if (typeof parsed !== 'object' || parsed === null)
    return MalfunctionError.throw(
      'the detached enroll handoff is not a json object',
      { handoff: input.handoff.slice(0, 500) },
    );

  const record = parsed as Record<string, unknown>;
  const serial = record.serial;
  if (typeof serial !== 'string')
    return MalfunctionError.throw(
      'the detached enroll handoff carries no serial',
      { handoff: input.handoff.slice(0, 500) },
    );

  return {
    serial,
    slug: typeof record.slug === 'string' ? record.slug : null,
    // an absent flag reads as NOT reachable — a breadcrumb that promises reach on a
    // field the host never sent would be the one lie this render must never tell
    socketEligible: record.socketEligible === true,
    // an UNRECOGNIZED outcome reads as null, never as a guess. a caller branches the
    // human render on it, and the honest default is the generic one — an older host
    // that names an outcome this build does not know must not be rendered as a reuse
    outcome:
      record.outcome === 'reused' ||
      record.outcome === 'baked' ||
      record.outcome === 'rebound'
        ? record.outcome
        : null,
  };
};
