import type {
  BootDriftReach,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';

/**
 * .what = each brain dir render, joined to the clones its drift reaches
 * .why = the readout says how many live clones take the drift; a render that wrote no drift
 *        has no clone to reach, so its reach is null
 * .note = the join reads the clone layer, so it loads only once a render wrote a drift: every
 *         `rhx init` loads this file, and most calls (`--help`, a repo with no clone) never reach
 *         a clone (`rule.require.thinnest-import-path`)
 */
export const getAllBrainDirSyncReports = async (input: {
  renders: BrainDirBootRender[];
}): Promise<
  {
    render: BrainDirBootRender;
    driftReach: BootDriftReach | null;
  }[]
> =>
  Promise.all(
    input.renders.map(async (render) => ({
      render,
      driftReach: await getOneDriftReachOfRender({ render }),
    })),
  );

/**
 * .what = the drift reach of one render, or null where it wrote no drift
 */
const getOneDriftReachOfRender = async (input: {
  render: BrainDirBootRender;
}): Promise<BootDriftReach | null> => {
  // a render with no drift reaches no clone
  if (input.render.drift === null) return null;

  // the clones that refer to its revisions; the clone layer loads here, on demand
  const { getOneActorBootDriftReach } = await import(
    './getOneActorBootDriftReach'
  );
  return getOneActorBootDriftReach({
    actorDir: input.render.drift.actorDir,
    rewritten: input.render.drift.rewritten,
  });
};
