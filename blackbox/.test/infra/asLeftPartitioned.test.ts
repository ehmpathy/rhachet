import { given, then, when } from 'test-fns';

import { asLeftPartitioned } from './asLeftPartitioned';

describe('asLeftPartitioned', () => {
  given('[case1] a run that left a keyrack daemon and a brain stub', () => {
    when('[t0] the survivors are partitioned', () => {
      then('the daemon is reclaimed and the stub leaked', () => {
        const daemon = { pid: 1, command: 'node -e startKeyrackDaemon' };
        const stub = { pid: 2, command: 'node /repo/src/.test/assets/stubBrainCli.cjs' };
        expect(asLeftPartitioned({ left: [daemon, stub] })).toEqual({
          reclaimed: [daemon],
          leaked: [stub],
        });
      });
    });
  });
});
