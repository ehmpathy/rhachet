import { MalfunctionError } from 'helpful-errors';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { getCloneDir } from '../getCloneDir';
import { asBootCacheLeadDecision } from './asBootCacheLeadDecision';
import { delBootCacheLeadsStale } from './delBootCacheLeadsStale';
import { getBootCacheLeadPath } from './getBootCacheLeadPath';
import { getCloneTranscriptProgress } from './getCloneTranscriptProgress';
import { getOneBootCacheLead } from './getOneBootCacheLead';
import { getOneBootHashOfActor } from './getOneBootHashOfActor';
import { getOneLeadProbe } from './getOneLeadProbe';
import { getOneLeadProgressToJudge } from './getOneLeadProgressToJudge';
import { setBootCacheLead } from './setBootCacheLead';
import { waitForBootCacheLead } from './waitForBootCacheLead';

/**
 * .what = hold a clone's FIRST say while another clone of the same boot has a first request in
 *   flight and no answer, so the boot is written into the api cache once and read by the rest
 * .why = the api makes a cache entry readable only once the first response starts. a fleet of N
 *   clones of one role set that each send a first request at once writes the boot N times; one
 *   lead goes, the rest wait on its first answer and then read the boot from cache
 *
 * .note = the gate sits at the first say, never at spawn: a clone sends no request until its first
 *   input, so a hold at spawn delays naught (measured 2026-11-02, `rhx boot.compact.probe`)
 * .note = bounded: a lead unanswered past `BOOT_CACHE_LEAD_UNANSWERED_MS` releases its followers,
 *   and a dead lead is no lead
 * .note = the mutex covers only a disk read, the decision, and the claim. the lead's socket is
 *   probed before the lock, so a slow socket never holds the lock against a peer's first say
 * .note = keyed by the boot's content hash, so two role sets never wait on each other
 */
export const holdFirstSayForBootCache = async (
  input: { repoPath: string; clone: CloneOndisk },
  context: {
    pollMs: number;
    onHoldBegin: (input: {
      leadSerial: string;
      leadStarted: boolean;
      boundMs: number;
    }) => void;
  } = { pollMs: 250, onHoldBegin: () => undefined },
): Promise<{
  outcome: 'later-say' | 'no-boot' | 'lead' | 'warm' | 'released' | 'bound';
  heldMs: number;
  leadSerial: string | null;
}> => {
  const actorDir = getActorOndiskDir({
    repoPath: input.clone.actor.repoPath,
    exid: input.clone.actor.exid,
  });
  const cloneDir = getCloneDir({ actorDir, serial: input.clone.serial });

  // only a first request writes the boot; a clone that has sent one goes at once
  if (getCloneTranscriptProgress({ cloneDir }).started)
    return { outcome: 'later-say', heldMs: 0, leadSerial: null };

  // the key: the content of the boot this clone spawned with
  const bootHash = getOneBootHashOfActor({ actorDir });
  if (bootHash === null)
    return { outcome: 'no-boot', heldMs: 0, leadSerial: null };
  const leadPath = getBootCacheLeadPath({ repoPath: input.repoPath, bootHash });

  // probe a peer lead BEFORE the lock, so a slow socket never holds it
  const probe = await getOneLeadProbe({
    repoPath: input.repoPath,
    leadPath,
    selfSerial: input.clone.serial,
  });

  // read, decide, and claim under the mutex, so two first says never both claim
  const { decision, lead, judged } = await withRepoMutex(
    { repoPath: input.repoPath, path: leadPath, waitMs: 10_000 },
    async () => {
      const leadFound = getOneBootCacheLead({ path: leadPath });
      const progress = getOneLeadProgressToJudge({
        repoPath: input.repoPath,
        selfSerial: input.clone.serial,
        leadFound,
        probe,
      });
      const decided = asBootCacheLeadDecision({
        lead: leadFound,
        leadStarted: progress.started,
        leadAnswered: progress.answered,
        leadLive: progress.live,
        selfSerial: input.clone.serial,
        nowMs: Date.now(),
      });
      if (decided.kind === 'claim')
        setBootCacheLead({
          path: leadPath,
          lead: { serial: input.clone.serial, claimedAtMs: Date.now() },
        });
      return { decision: decided, lead: leadFound, judged: progress };
    },
  );
  // a claim also prunes the records of boots long gone, outside the lock
  if (decision.kind === 'claim') {
    delBootCacheLeadsStale({ repoPath: input.repoPath, nowMs: Date.now() });
    return { outcome: 'lead', heldMs: 0, leadSerial: input.clone.serial };
  }
  if (decision.kind === 'warm')
    return { outcome: 'warm', heldMs: 0, leadSerial: lead?.serial ?? null };

  // a wait names a lead by construction; a wait with none is a defect here
  if (lead === null)
    throw new MalfunctionError('a boot cache wait named no lead', { decision });

  // announce the hold as it begins, with its true bound and the lead's true state; then wait
  //   .note = the bound may grow once the lead sends (`waitForBootCacheLead` re-derives it)
  context.onHoldBegin({
    leadSerial: lead.serial,
    leadStarted: judged.started,
    boundMs: Math.max(0, decision.untilMs - Date.now()),
  });
  const waited = await waitForBootCacheLead(
    { repoPath: input.repoPath, lead, untilMs: decision.untilMs },
    { pollMs: context.pollMs },
  );
  return { ...waited, leadSerial: lead.serial };
};
