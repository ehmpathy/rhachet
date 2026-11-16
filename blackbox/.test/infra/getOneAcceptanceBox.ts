/**
 * .what = the kind of box the acceptance suite runs on, and the width and priority it takes there
 * .why = a laptop or a grove is shared with claude seats, a desktop, and peer crews; ci is not.
 *   the suite takes a bounded share and yields its cores on a shared box, and its full width on ci
 *
 * .note = keyed on `GITHUB_ACTIONS`, never `CI`: `test.acceptance.credfree` sets `CI=true` on
 *   laptops, so a `CI` key would widen the main local path. every workflow runs on a
 *   github-hosted runner, which sets `GITHUB_ACTIONS`. any other host reads as shared — the safe box
 * .note = a quarter of the cores is a start point; its measured peer slowdown is recorded in the
 *   route's F2 fulcrum
 */
export const getOneAcceptanceBox = (input: {
  env: Record<string, string | undefined>;
  cores: number;
}): {
  box: 'ci' | 'shared';
  maxWorkersDefault: string | number;
  niceTarget: number | null;
} => {
  // ci: today's width, normal priority
  if (input.env.GITHUB_ACTIONS === 'true')
    return { box: 'ci', maxWorkersDefault: '50%', niceTarget: null };

  // shared: a quarter of the cores, at least one, at nice 10
  return {
    box: 'shared',
    maxWorkersDefault: Math.max(1, Math.floor(input.cores / 4)),
    niceTarget: 10,
  };
};
