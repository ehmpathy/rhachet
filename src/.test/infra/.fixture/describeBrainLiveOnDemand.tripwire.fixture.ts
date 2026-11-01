import { spawnSync } from 'node:child_process';

import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';

/**
 * .what = a gated suite whose body reaches a brain at collection, in shapes the text scan cannot
 *   see: a command held in a variable, and a vendor url built from the env
 * .why = the tripwire in describeBrainLiveOnDemand.realjest.integration.test.ts must go red on it,
 *   which proves the tripwire observes a reach whatever its syntax. it runs only under the
 *   tripwire's decoy `claude` and its local listener, so it reaches no real brain
 */
describeBrainLiveOnDemand('tripwire fixture suite', () => {
  // a command in a variable: no marker names it
  const bin = ['cla', 'ude'].join('');
  spawnSync(bin, ['hi']);

  // a vendor url from the env: no marker names it; the result is never awaited
  void fetch(`${process.env.ANTHROPIC_BASE_URL}/v1/messages`, { method: 'POST' }).catch(() => null);

  test('the gated body ran', () => {
    expect(true).toEqual(true);
  });
});
