import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack set', () => {
  /**
   * [uc3] set --key --mech --vault
   * creates host entry, persists to config
   */
  given('[case1] repo without host manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack set --key NEW_KEY --mech REPLICA --vault os.direct --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_KEY',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('NEW_KEY');
        expect(parsed.mech).toEqual('REPLICA');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // normalize timestamps for stable snapshots
        const normalized = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(normalized).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list after set', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ANOTHER_KEY',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows configured key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed.ANOTHER_KEY).toBeDefined();
        expect(parsed.ANOTHER_KEY.mech).toEqual('REPLICA');
      });
    });
  });
});
