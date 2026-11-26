import type { BootDriftFault, BrainDirBootRender } from './BrainDirBootRender';

/**
 * .what = every drift fault one brain dir sync met: the clone drifts not written
 * .why = the readout rows and the exit code both read this list; one owner keeps them in step
 */
export const asBootDriftFaultsOfSync = (input: {
  render: BrainDirBootRender;
}): BootDriftFault[] => input.render.drift?.faults ?? [];
