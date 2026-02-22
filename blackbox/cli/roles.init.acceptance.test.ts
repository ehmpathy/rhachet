import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet roles init', () => {
  given('[case1] repo with role that has no exec commands', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-inits' });

      // link role to create .agent/ directory (like a real project would)
      const linkResult = invokeRhachetCliBinary({
        args: ['roles', 'link', '--repo', 'test-repo', '--role', 'tester'],
        cwd: tempRepo.path,
      });

      if (linkResult.status !== 0) {
        throw new Error(
          `roles link failed: ${linkResult.stderr}\n${linkResult.stdout}`,
        );
      }

      return tempRepo;
    });

    when('[t0] roles init --role tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--role', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains warning about no init commands', () => {
        expect(result.stdout).toContain('no initialization commands');
      });
    });
  });

  given('[case2] minimal repo without inits', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] roles init --role nonexistent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--role', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about no registries', () => {
        expect(result.stderr).toContain('No registries found');
      });
    });

    when('[t1] roles init without --role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about --role required', () => {
        expect(result.stderr).toContain('--role');
      });
    });
  });

  given('[case3] repo without rhachet.use.ts but with rhachet-roles packages', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = await genTestTempRepo({ fixture: 'with-roles-packages' });

      // link role first to create .agent/ directory
      const linkResult = invokeRhachetCliBinary({
        args: ['roles', 'link', '--role', 'tester'],
        cwd: tempRepo.path,
      });

      if (linkResult.status !== 0) {
        throw new Error(
          `roles link failed: ${linkResult.stderr}\n${linkResult.stdout}`,
        );
      }

      return tempRepo;
    });

    when('[t0] roles init --role tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--role', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains discovery message', () => {
        expect(result.stdout).toContain('discover roles from packages');
      });

      then('stdout contains no init commands message', () => {
        // the test role has inits dirs but no exec commands
        expect(result.stdout).toContain('no initialization commands');
      });
    });
  });
});
