import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for boot.yml curation feature
 * .why = verifies say vs ref behavior for briefs and skills
 */
describe('rhachet roles boot with boot.yml', () => {
  /**
   * simple mode tests
   */
  given('[case1] repo with boot.yml simple mode', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-simple' }),
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

      then('outputs stats with say/ref breakdown for briefs', () => {
        expect(result.stdout).toContain('briefs = 3');
        expect(result.stdout).toContain('say = 2');
        expect(result.stdout).toContain('ref = 1');
      });

      then('outputs stats with say/ref breakdown for skills', () => {
        expect(result.stdout).toContain('skills = 2');
        // skills also have say/ref breakdown in the nested stats
      });

      then('says matched briefs with full content (always-say.md)', () => {
        expect(result.stdout).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/always-say.md">',
        );
        expect(result.stdout).toContain(
          'this brief is matched by the say glob',
        );
      });

      then('says matched briefs with full content (deep.md)', () => {
        expect(result.stdout).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/subdir/deep.md">',
        );
        expect(result.stdout).toContain(
          'this brief is in a subdirectory and matched',
        );
      });

      then('refs unmatched briefs with path only (not-matched.md)', () => {
        expect(result.stdout).toContain(
          '<brief.ref path=".agent/repo=.this/role=any/briefs/not-matched.md"/>',
        );
        // should NOT contain full content of not-matched.md
        expect(result.stdout).not.toContain(
          'this brief is NOT matched by any say glob',
        );
      });

      then('says matched skills with full content (say-me.sh)', () => {
        expect(result.stdout).toContain(
          '<skill.say path=".agent/repo=.this/role=any/skills/say-me.sh">',
        );
      });

      then('refs unmatched skills with path only (ref-me.sh)', () => {
        expect(result.stdout).toContain(
          '<skill.ref path=".agent/repo=.this/role=any/skills/ref-me.sh"/>',
        );
      });

      then('always says readme with full content', () => {
        expect(result.stdout).toContain('<readme path=');
        expect(result.stdout).toContain('this role tests simple mode');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] roles boot --repo .this --role any --subject test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--repo',
            '.this',
            '--role',
            'any',
            '--subject',
            'test',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('fails with error: --subject requires subject mode', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain(
          '--subject requires boot.yml in subject mode',
        );
      });
    });
  });

  given('[case2] repo with boot.yml but no boot.yml present', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-briefs' }),
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

      then('says all briefs with full content (backwards compat)', () => {
        expect(result.stdout).toContain('<brief.say path=');
        expect(result.stdout).toContain('sample brief');
      });

      then('stats do not show say/ref breakdown', () => {
        // when no boot.yml, no say/ref breakdown shown
        expect(result.stdout).not.toMatch(/say\s*=/);
        expect(result.stdout).not.toMatch(/ref\s*=/);
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] roles boot --repo .this --role any --subject test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--repo',
            '.this',
            '--role',
            'any',
            '--subject',
            'test',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('fails with error: --subject requires subject mode', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain(
          '--subject requires boot.yml in subject mode',
        );
      });
    });
  });

  given('[case3] repo with boot.yml mixed mode (error case)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-mixed' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('fails with error: mixed mode not allowed', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain('mixed mode not allowed');
      });
    });
  });

  /**
   * subject mode tests (placeholder - subject mode not yet implemented)
   * these tests verify the error cases for subject mode
   */
  given('[case4] repo with boot.yml subject mode', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-subject' }),
    );

    when('[t0] roles boot --repo .this --role any (all subjects)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      // placeholder: subject mode currently says all (to be implemented)
      then('says the readme', () => {
        expect(result.stdout).toContain('<readme path=');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] repo with boot.yml subject mode without always', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-subject-no-always' }),
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

      // placeholder: subject mode currently says all (to be implemented)
      then('says the readme', () => {
        expect(result.stdout).toContain('<readme path=');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * minified briefs integration tests
   */
  given('[case6] repo with boot.yml and minified briefs', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-minified' }),
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

      then('says brief without minified counterpart with full content', () => {
        expect(result.stdout).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/full-brief.md">',
        );
        expect(result.stdout).toContain(
          'this is a brief without a minified counterpart',
        );
      });

      then('says brief with minified counterpart via minified content', () => {
        // path should reference the .md.min file (actual file used)
        expect(result.stdout).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/minified-brief.md.min">',
        );
        // content should be from .md.min (minified)
        expect(result.stdout).toContain(
          'test brief; validates boot.yml prefers minified content',
        );
      });

      then('does NOT contain verbose content from full .md file', () => {
        // the extra section only exists in the full .md, not in .md.min
        expect(result.stdout).not.toContain(
          'this section contains extra verbose content',
        );
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
