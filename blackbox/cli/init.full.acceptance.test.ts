import { given, then, useBeforeAll, when } from 'test-fns';

import { genHomeWithGroveState } from '@/blackbox/.test/infra/genHomeWithGroveState';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet init (full output)', () => {
  given('[case1] repo with multiple roles, inits, and hooks', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-full' }),
    );

    when('[t0] init --roles tester reviewer --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester', 'reviewer', '--hooks'],
          cwd: repo.path,
          // a fresh HOME with no grove, as a fact of the case: the brain dir holds no grove
          //   arrows, so the `replaced` row reads "this box has no ~/.claude/settings.json" on
          //   every box. the fixture's test brain writes `<repo>/.claude/settings.json` in place,
          //   and with a grove that name is an arrow to `~/.claude/settings.json`, so the write
          //   would land in the home settings. the grove-present row is snapped in
          //   `upgrade.acceptance` [case12.1] and `init.hooks.boot-guard`
          env: genHomeWithGroveState({ slug: 'init-full-home', grove: 'absent' }),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains link blocks for both roles', () => {
        expect(result.stdout).toContain('repo=test/role=tester');
        expect(result.stdout).toContain('repo=test/role=reviewer');
      });

      then('stdout contains init block for tester', () => {
        expect(result.stdout).toContain('init role repo=test/role=tester');
      });

      then('stdout shows roles linked and initialized', () => {
        expect(result.stdout).toContain('2 role(s) linked');
      });

      then('stdout shows hooks applied', () => {
        expect(result.stdout).toContain('hooks');
        expect(result.stdout).toContain('created');
      });

      then('full stdout matches snapshot', () => {
        // masked: the temp repo path and any per-run stamp
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
