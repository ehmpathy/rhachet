import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet roles cost', () => {
  given('[case1] repo with registry', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] roles cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs cost tree', () => {
        expect(result.stdout).toContain('tokens');
      });
    });
  });
});
