import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet roles boot', () => {
  given('[case1] repo with briefs', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-briefs' }),
    );

    when('[t0] roles boot --repo this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs stats', () => {
        expect(result.stdout).toContain('<stats>');
      });

      then('outputs brief content', () => {
        expect(result.stdout).toContain('sample brief');
      });

      then('outputs readme', () => {
        expect(result.stdout).toContain('<readme');
      });
    });

    when('[t1] roles boot --repo this --role missing', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'this', '--role', 'missing'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });
    });

    when('[t2] roles boot --repo this --role missing --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--repo',
            'this',
            '--role',
            'missing',
            '--if-present',
          ],
          cwd: repo.path,
        }),
      );

      then('exits with status 0 (silent success)', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs nothing', () => {
        expect(result.stdout.trim()).toEqual('');
      });
    });
  });

  given('[case2] repo with registry', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs both briefs and skills stats', () => {
        expect(result.stdout).toContain('briefs');
        expect(result.stdout).toContain('skills');
      });
    });
  });

  given('[case3] minimal repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] roles boot --repo this --role any --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--repo',
            'this',
            '--role',
            'any',
            '--if-present',
          ],
          cwd: repo.path,
        }),
      );

      then('exits with status 0 (silent success)', () => {
        expect(result.status).toEqual(0);
      });
    });
  });
});
