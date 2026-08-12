import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack list', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc6] list with env awareness
   */
  given('[case9] list with multi-env repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] keyrack list', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains both prod and prep keys', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
        expect(result.stdout).toContain('SHARED_API_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('json contains prod and prep hosts', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.prod.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prep.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prod.SHARED_API_KEY']).toBeDefined();
        expect(parsed['testorg.prep.SHARED_API_KEY']).toBeDefined();
      });
    });
  });

  /**
   * .what = `list` is the POSSESSION audit — "which reaches does this machine hold keys
   *         for?" — and this is that question asked through the real cli
   * .why = `status` and `list` answer two different questions off two different stores:
   *        `status` reads the DAEMON (what is unlocked right now), `list` reads the HOST
   *        MANIFEST (what is configured, locked or not). only `list` can answer the reach
   *        audit for a machine whose keys are all locked, which is the ordinary case
   *
   * .note = the render was proven at `asKeyrackListTreestruct.test.ts`, in isolation, against
   *         a hand-built hosts record. what that unit cannot see is the manifest READ — a
   *         `reach` dropped by the zod schema, the decrypt, or the address key would leave it
   *         green while the cli rendered a rack with one branch where two belong
   * .note = no unlock runs here, deliberately. `list` must answer from the manifest alone
   */
  given('[case-reach] a host that holds one slug at two reaches', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] keyrack list', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      // .note = TWO branches under one name is the whole aha. a reach-blind render would
      //         collapse them to one entry and read as a rack that holds a single key
      then('the one name renders twice — one branch per reach', () => {
        const branches = result.stdout
          .split('\n')
          .filter((line) => line.includes('testorg.test.API_KEY'));
        expect(branches).toHaveLength(2);
      });

      then('the reached branch names its reach as a leaf', () => {
        expect(result.stdout).toContain('reach: beav@ehmpathy.com');
      });

      // .note = e1 at the render: the branch head is the SLUG on both branches, never the
      //         address. `testorg.test.API_KEY@beav@ehmpathy.com` on a headline would leak an
      //         internal key shape to a human and read as a fifth slug segment
      then('no branch head leaks the composite address', () => {
        expect(result.stdout).not.toContain('API_KEY@beav');
      });

      // BOTH streams, the empty one too. a stdout-only snapshot catches content that MOVES
      // between streams, and is blind to content that APPEARS on the unsnapped one — a
      // deprecation notice, a debug print, a stray prompt echo. the empty stderr snap is what
      // proves the absent stream stays absent
      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });

    when('[t1] keyrack list --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      // the json variant is its own output shape, so it snaps both streams too — a robot
      // caller parses stdout, and a notice that leaks onto stderr is exactly what a human
      // never sees until a pipeline breaks
      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });

      // ⚠️ the robot contract. the payload is keyed by ADDRESS, so the two reaches are
      //    two entries — a machine that reads it can tell them apart without a parse of any
      //    render
      then('the two reaches are two distinct entries', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.API_KEY']).toBeDefined();
        expect(parsed['testorg.test.API_KEY@beav@ehmpathy.com']).toBeDefined();
      });

      then('each entry reports the SLUG it belongs to, not its address', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.API_KEY@beav@ehmpathy.com'].slug).toEqual(
          'testorg.test.API_KEY',
        );
      });

      // .note = `in`, not `toBeUndefined()`. `entry.reach === undefined` is true both for an
      //         absent field AND for an explicit `"reach": null` — so it would pass on the
      //         one shape e16 forbids, since `JSON.stringify` drops only `undefined`
      then('e16: the reachless entry carries no reach field at all', () => {
        const parsed = JSON.parse(result.stdout);
        expect('reach' in parsed['testorg.test.API_KEY']).toEqual(false);
        expect(parsed['testorg.test.API_KEY@beav@ehmpathy.com'].reach).toEqual({
          exid: 'beav@ehmpathy.com',
        });
      });
    });
  });
});
