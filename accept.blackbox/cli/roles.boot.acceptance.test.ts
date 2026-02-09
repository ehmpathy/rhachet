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

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs skipped message', () => {
        expect(result.stdout).toContain('🫧');
        expect(result.stdout).toContain('skipped');
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

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs skipped message', () => {
        expect(result.stdout).toContain('🫧');
        expect(result.stdout).toContain('skipped');
      });
    });
  });

  given('[case4] repo with .scratch and .archive directories', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-scratch-archive' }),
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

      then('includes the normal brief', () => {
        expect(result.stdout).toContain('included.brief.md');
        expect(result.stdout).toContain('this brief should be included');
      });

      then('excludes briefs in .scratch directory', () => {
        expect(result.stdout).not.toContain('excluded.scratch.md');
        expect(result.stdout).not.toContain('briefs/.scratch/');
      });

      then('excludes briefs in .archive directory', () => {
        expect(result.stdout).not.toContain('excluded.archive.md');
        expect(result.stdout).not.toContain('briefs/.archive/');
      });

      then('reports correct brief count (1, not 3)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });
    });
  });

  given('[case5] repo with compressed briefs (.md.min)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-min-briefs' }),
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

      then('loads content from .min file', () => {
        expect(result.stdout).toContain(
          'loader prefers minified variant for content',
        );
      });

      then('does not load verbose .md content', () => {
        expect(result.stdout).not.toContain(
          'verbose explanations',
        );
      });

      then('uses .md path in <brief> tag (not .min path)', () => {
        expect(result.stdout).toContain('path="');
        expect(result.stdout).toContain('sample.md"');
        expect(result.stdout).not.toContain('sample.md.min"');
      });

      then('brief count reflects only .md files (not .min)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });
    });
  });

  given('[case6] repo with orphan .md.min', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-orphan-min' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
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

  given('[case7] repo with mixed compression', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-mixed-min' }),
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

      then('loads .min content for briefs that have .min', () => {
        expect(result.stdout).toContain(
          'loader prefers minified variant',
        );
      });

      then('loads .md content for briefs that lack .min', () => {
        expect(result.stdout).toContain(
          'backwards compatibility',
        );
      });

      then('brief count is 2 (one compressed, one plain)', () => {
        expect(result.stdout).toContain('briefs = 2');
      });
    });
  });

  given('[case8] repo with .scratch and .archive directories that contain .md.min files', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-scratch-archive-min' }),
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

      then('includes the normal brief via .min content', () => {
        expect(result.stdout).toContain('included.brief.md');
        expect(result.stdout).toContain('loader prefers minified variant for included brief');
      });

      then('excludes .min files in .scratch directory', () => {
        expect(result.stdout).not.toContain('excluded.scratch.md');
        expect(result.stdout).not.toContain('excluded scratch minified');
      });

      then('excludes .min files in .archive directory', () => {
        expect(result.stdout).not.toContain('excluded.archive.md');
        expect(result.stdout).not.toContain('excluded archive minified');
      });

      then('brief count is 1 (blocklisted .min files excluded)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });
    });
  });
});
