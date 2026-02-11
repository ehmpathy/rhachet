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
            '--env',
            'test',
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
        expect(parsed[0].slug).toEqual('testorg.test.NEW_KEY');
        expect(parsed[0].mech).toEqual('REPLICA');
        expect(parsed[0].vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = parsed.map((entry: Record<string, unknown>) => ({
          ...entry,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        }));
        expect(snapped).toMatchSnapshot();
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
            '--env',
            'test',
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
        expect(parsed['testorg.test.ANOTHER_KEY']).toBeDefined();
        expect(parsed['testorg.test.ANOTHER_KEY'].mech).toEqual('REPLICA');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(listResult.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });
});
