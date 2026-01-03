import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet act', () => {
  given('[case1] repo with registry but no brains', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] act --role any --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'say-hello'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about no brains', () => {
        expect(result.stderr).toContain('no brains available');
      });
    });

    when('[t1] act --role any --skill say-hello --attempts 3 (missing --output)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'say-hello', '--attempts', '3'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about --output required', () => {
        expect(result.stderr).toContain('--attempts requires --output');
      });
    });
  });

  given('[case2] repo with skills (no registry)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] act without --role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--skill', 'say-hello'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about missing role', () => {
        expect(result.stderr).toContain('--role');
      });
    });

    when('[t1] act without --skill', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about missing skill', () => {
        expect(result.stderr).toContain('--skill');
      });
    });

    when('[t2] act --role any --skill nonexistent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });
    });

    when('[t3] act --role any --skill say-hello --attempts 3 (missing --output)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'say-hello', '--attempts', '3'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about --output required', () => {
        expect(result.stderr).toContain('--attempts requires --output');
      });
    });
  });
});
