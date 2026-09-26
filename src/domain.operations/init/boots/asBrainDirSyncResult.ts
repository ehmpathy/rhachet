import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';

/**
 * .what = per-actor outcomes → the renders and the failures, each in actor order
 * .why = a sync reports both lists; an outcome with neither is an actor skipped as inactive
 */
export const asBrainDirSyncResult = (input: {
  outcomes: {
    render: BrainDirBootRender | null;
    failure: BrainDirBootFailure | null;
  }[];
}): { renders: BrainDirBootRender[]; failures: BrainDirBootFailure[] } => ({
  renders: input.outcomes
    .map((outcome) => outcome.render)
    .filter((render): render is BrainDirBootRender => render !== null),
  failures: input.outcomes
    .map((outcome) => outcome.failure)
    .filter((failure): failure is BrainDirBootFailure => failure !== null),
});
