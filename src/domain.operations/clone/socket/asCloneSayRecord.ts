import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import type { CloneSayOutcome } from './computeCloneSayVerdict';

/**
 * .what = the machine-channel record a say emits on BOTH channels — the stdout payload and
 *   the thrown error's `metadata`
 * .why = one shape, one owner: additive over the extant `delivered` boolean (V13), plus the
 *   verdict a retry policy reads, its reason slug, the probe strength, and the clone's
 *   identity. named here so the two emit sites (success stdout, failure metadata) never drift
 */
export interface CloneSayRecord {
  delivered: boolean;
  verdict: CloneSayOutcome['verdict'];
  reason: CloneSayOutcome['reason'];
  probe: CloneSayOutcome['probe'];
  serial: string;
  slug: string | null;
}

/**
 * .what = build the machine-channel record from a decided outcome and the addressed clone
 * .why = the orchestrator reads one named cast rather than an inline object that mixes the
 *   machine-channel contract with domain fields — the shape is a contract, so a transformer
 *   owns it (rule.forbid.decode-friction-in-orchestrators)
 */
export const asCloneSayRecord = (input: {
  outcome: CloneSayOutcome;
  clone: CloneOndisk;
}): CloneSayRecord => ({
  delivered: input.outcome.delivered,
  verdict: input.outcome.verdict,
  reason: input.outcome.reason,
  probe: input.outcome.probe,
  serial: input.clone.serial,
  slug: input.clone.slug,
});
