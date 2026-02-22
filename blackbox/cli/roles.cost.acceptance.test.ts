import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

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

  given('[case2] repo with compressed briefs (.md.min)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-min-briefs' }),
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

      then('outputs cost tree with token counts', () => {
        expect(result.stdout).toContain('tokens');
      });

      then('brief count is 1 (not 2)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });
    });
  });

  given('[case3] repo with orphan .md.min', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-orphan-min' }),
    );

    when('[t0] roles cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr names the orphan file', () => {
        expect(result.stderr).toContain('orphan.md.min');
      });
    });
  });

  given('[case4] repo with mixed compression', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-mixed-min' }),
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

      then('brief count is 2 (one compressed, one plain)', () => {
        expect(result.stdout).toContain('briefs = 2');
      });
    });
  });
});
