import type { BootDriftFault, BrainDirBootRender } from './BrainDirBootRender';

/**
 * .what = every drift fault one brain dir sync met: the drifts not written, then the clone refs
 *         the drift could not reach
 * .why = the readout rows and the exit code both read this list; one owner keeps them in step
 */
export const asBootDriftFaultsOfSync = (input: {
  render: BrainDirBootRender;
  driftReach: { faults: BootDriftFault[] } | null;
}): BootDriftFault[] => [
  ...(input.render.drift?.faults ?? []),
  ...(input.driftReach?.faults ?? []),
];
