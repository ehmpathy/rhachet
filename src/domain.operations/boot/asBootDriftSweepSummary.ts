import { isPresent } from 'type-fns';

import type { BootDriftFault, BootDriftSweep } from './BrainDirBootRender';

/**
 * .what = the summary of a drift sweep: every revision, the ones re-written, and the faults met
 * .why = the sweep reports by hash, so the init layer can join each revision to its clones
 */
export const asBootDriftSweepSummary = (input: {
  revisions: string[];
  results: {
    hash: string;
    outcome: 'rewritten' | 'unchanged' | 'fault';
    fault: BootDriftFault | null;
  }[];
}): BootDriftSweep => {
  // the hashes whose drift changed on this sweep
  const rewritten = input.results
    .filter((result) => result.outcome === 'rewritten')
    .map((result) => result.hash);

  // the faults met, one per revision that could not be written
  const faults = input.results.map((result) => result.fault).filter(isPresent);

  return { revisions: input.revisions, rewritten, faults };
};
