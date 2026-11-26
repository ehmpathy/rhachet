import { isPresent } from 'type-fns';

import type { BootDriftFault, BootDriftSweep } from './BrainDirBootRender';

/**
 * .what = the summary of a drift sweep: every clone it held, the ones re-written, and the faults met
 * .why = the sweep reports by clone serial, so the readout counts the clones each render reached
 */
export const asBootDriftSweepSummary = (input: {
  clones: string[];
  results: {
    serial: string;
    outcome: 'rewritten' | 'unchanged' | 'fault';
    fault: BootDriftFault | null;
  }[];
}): BootDriftSweep => {
  // the serials whose drift changed on this sweep
  const rewritten = input.results
    .filter((result) => result.outcome === 'rewritten')
    .map((result) => result.serial);

  // the faults met, one per clone whose drift could not be written
  const faults = input.results.map((result) => result.fault).filter(isPresent);

  return { clones: input.clones, rewritten, faults };
};
