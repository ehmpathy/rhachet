import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet with published packages', () => {
  given('[case1] repo with published rhachet + rhachet-roles-ehmpathy via pnpm', () => {
    const repo = useBeforeAll(async () => {
      // create temp repo with package.json that depends on published packages
      // pnpm install runs to fetch the real published packages
      const r = genTestTempRepo({ fixture: 'with-published-roles', install: true });
      return r;
    });

    when('[t0] roles link --repo ehmpathy --role mechanic', () => {
      const result = useBeforeAll(async () => {
        return invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'ehmpathy', '--role', 'mechanic'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] roles boot --repo ehmpathy --role mechanic', () => {
      const result = useBeforeAll(async () => {
        // first link
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'ehmpathy', '--role', 'mechanic'],
          cwd: repo.path,
          logOnError: false,
        });

        // then boot
        return invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'ehmpathy', '--role', 'mechanic'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs role context from published ehmpathy package', () => {
        expect(result.stdout).toContain('mechanic');
      });
    });
  });
});
