import { now } from 'iso-time';

import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { asBoundedEnrollmentLine } from './asBoundedEnrollmentLine';
import {
  ENROLLMENT_LINE_MAX_BYTES,
  ENROLLMENT_LOG_SCHEMA_VERSION,
} from './constants';

/**
 * .what = append ONE line to an actor's append-only enrollment.jsonl roles log
 * .why =
 *   - the wish wants a durable record of "the history of WHY and which roles
 *     were enrolled". this op writes one dated event per enrollment: the
 *     resolved roleset, the role-delta, and the caller's `--reason`
 *   - the append is the ONE sanctioned non-idempotent op in the frame (a
 *     distinct dated event per enrollment), so it is a `set*`, not a findsert
 *
 * .note = deliberate non-idempotent — an audit log is a LEDGER, not a state
 *   cell: each call records a distinct dated event, so a re-run that adds a new
 *   line is the CORRECT behavior, not a duplicate defect. retry safety is not
 *   harmed because the trail's purpose is to answer "how many times, and why"
 *   an actor was enrolled — to fold repeats together would erase exactly that
 *   answer. the only guard against noise lives at the caller: findsertActorOndisk
 *   gates this append behind `logEnrollment`, which a PURE live-slug reuse
 *   passes false, so a cron that re-enrolls onto an already-live clone does NOT
 *   append — only a genuine enrollment event ever reaches here.
 * .note = atomic-append safe: the line is bounded to <= PIPE_BUF bytes (via
 *   asBoundedEnrollmentLine) and written with O_APPEND (node's 'a' flag), so
 *   concurrent appends from many clones of one actor never interleave
 */
export const setActorOndiskRolesLog = (input: {
  actorDir: string;
  roles: RoleSlug[];
  delta: string | null;
  reason: string | null;
}): void => {
  const logDir = join(input.actorDir, 'roles');
  mkdirSync(logDir, { recursive: true });

  const line = asBoundedEnrollmentLine({
    entry: {
      schemaVersion: ENROLLMENT_LOG_SCHEMA_VERSION,
      at: now(),
      roles: input.roles,
      delta: input.delta,
      reason: input.reason,
    },
    maxBytes: ENROLLMENT_LINE_MAX_BYTES,
  });

  // O_APPEND (the 'a' flag) makes a <= PIPE_BUF write atomic across writers
  appendFileSync(join(logDir, 'enrollment.jsonl'), line + '\n', 'utf8');
};
