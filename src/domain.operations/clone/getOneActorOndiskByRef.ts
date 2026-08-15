import { ConstraintError } from 'helpful-errors';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';

import { getAllActorsOndisk } from '../actor/enrolled/getAllActorsOndisk';
import type { ActorRef } from './asActorRef';

const CANDIDATE_CAP = 8;

/**
 * .what = look up the ONE enrolled actor an actor ref (`@<hash-prefix>`) names —
 *   git-style, a unique prefix wins
 * .why =
 *   - a full 8-char enrollment hash is a mouthful at a keyboard, so a human
 *     reaches an actor by a short prefix — exactly as `git` names a commit by a
 *     short prefix. this is the lookup behind `rhx clone list @<actor>`
 *   - an AMBIGUOUS prefix must never silently pick one actor: it fails loud,
 *     names the candidate actors, and asks for a longer prefix. a NO-match fails
 *     loud with a dual-path fix (list the actors, or enroll one)
 *
 * .note = the candidate list is capped so a wildly short prefix does not dump
 *   every actor; the count still names how many matched
 */
export const getOneActorOndiskByRef = (input: {
  repoPath: string;
  ref: ActorRef;
}): ActorOndisk => {
  const actors = getAllActorsOndisk({ repoPath: input.repoPath });
  const matches = actors.filter((actor) =>
    actor.hash.startsWith(input.ref.hashPrefix),
  );

  // exactly one — the unique-prefix win
  if (matches.length === 1) return matches[0]!;

  // none — fail loud with a dual-path fix
  if (matches.length === 0)
    return ConstraintError.throw(
      `no enrolled actor matches '@${input.ref.hashPrefix}'`,
      {
        hashPrefix: input.ref.hashPrefix,
        hint: 'list actors with `rhx actor list`, or enroll one with `rhx enroll <brain>`',
      },
    );

  // ambiguous — name the candidates, ask for a longer prefix
  const candidates = matches.slice(0, CANDIDATE_CAP).map((a) => `@${a.hash}`);
  return ConstraintError.throw(
    `'@${input.ref.hashPrefix}' is ambiguous — it matches ${matches.length} actors`,
    {
      hashPrefix: input.ref.hashPrefix,
      candidates,
      hint: 'use a longer prefix to name exactly one actor',
    },
  );
};
