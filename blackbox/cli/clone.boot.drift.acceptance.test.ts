import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance for `rhx clone boot drift` through the built binary, cred-free
 * .why = the drift readout and the onStop hook arm are a contract a human and a role hook
 *        call by name; the wire-up from argv to exit code is proven here, at the level they
 *        invoke it. a drifted clone's readout needs a live spawn, so it rides the boot journey
 *        (`brain-dir-boot.journey`) and the in-process drive (`invokeClone.integration`)
 */
describe('rhx clone boot drift (acceptance)', () => {
  given('[case1] a repo with no clone enrolled', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-multi-skills' }),
    );

    when('[t0] the readout runs outside a clone, with no --of', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the flag and the list command', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no clone named');
        expect(result.stderr).toContain('--of @:<slug|serial>');
        expect(result.stderr).toContain('rhx clone list');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the readout names a clone that does not exist', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--of', '@:ghost'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the address it could not find', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no clone answers to that address');
        expect(result.stderr).toContain('@:ghost');
      });

      then('the error matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] the onStop hook runs in a process that is no clone', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          cwd: repo.path,
        }),
      );

      then('it exits 0, silent: a stop is never blocked by a non-clone', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });

    when('[t3] the onStop hook runs with a serial no clone on disk holds', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['clone', 'boot', 'drift', '--when', 'hook.onStop'],
          cwd: repo.path,
          env: { RHACHET_CLONE_SERIAL: '00000000-0000-0000-0000-000000000000' },
          logOnError: false,
        }),
      );

      then('it exits 1, a malfunction, which never blocks a stop', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stderr).toContain('names no on-disk clone');
      });
    });

    when('[t4] the hook moment rides --of', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'boot',
            'drift',
            '--when',
            'hook.onStop',
            '--of',
            '@:ghost',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses the pair with exit 2, never drops --of', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--of cannot ride --when hook.onStop');
      });
    });
  });
});
