import { getAllClonesForActor } from './getAllClonesForActor';
import { getCloneReachState } from './getCloneReachState';

/**
 * .what = count how many of an actor's clones are LIVE right now
 * .why =
 *   - a bare enroll is create-always, so a cron that retries accrues billed brains.
 *     the soft accrual WARN needs the live-clone count to decide whether to nag
 *     (computeCloneAccrualWarn) — this is the impure leaf that gathers it
 *   - extracted from the accrual step so the invoker reads as narrative, and the
 *     probe (socket connects) stays out of the pure classifier
 *
 * .note = LIVE means the socket answers a connect (isCloneLive via getCloneReachState);
 *   a DEAD or DEAF clone does not count toward accrual
 */
export const getOneCloneLiveCountForActor = async (input: {
  actorDir: string;
  actorsRoot: string;
  repoPath: string;
  actorHash: string;
}): Promise<number> => {
  const clones = getAllClonesForActor({
    actorDir: input.actorDir,
    actorsRoot: input.actorsRoot,
    repoPath: input.repoPath,
    actorHash: input.actorHash,
  });

  const states = await Promise.all(
    clones.map((clone) => getCloneReachState({ clone })),
  );

  return states.filter((state) => state === 'LIVE').length;
};
