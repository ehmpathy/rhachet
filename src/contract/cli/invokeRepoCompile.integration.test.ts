import { given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

describe('invokeRepoCompile.integration', () => {
  /**
   * creates a temp rhachet-roles-* package with test fixtures
   */
  const createTestPackage = async (input: {
    packageName: string;
    roles: Array<{
      slug: string;
      briefsDirs?: string[];
      skillsDirs?: string[];
      initsDirs?: string[];
      readmeUri?: string;
      bootUri?: string;
      keyrackUri?: string;
    }>;
    files: Array<{ path: string; content: string }>;
  }): Promise<{ rootDir: string; cleanup: () => void }> => {
    const rootDir = join(tmpdir(), `test-${getUuid()}`);
    mkdirSync(rootDir, { recursive: true });

    // create package.json
    const packageJson = {
      name: input.packageName,
      version: '1.0.0',
      main: 'dist/index.js',
    };
    writeFileSync(
      join(rootDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    // create role registry in dist/index.js
    const roleDefinitions = input.roles.map((role) => {
      const briefs = role.briefsDirs
        ? `briefs: { dirs: [${role.briefsDirs.map((d) => `{ uri: '${d}' }`).join(', ')}] }`
        : '';
      const skills = role.skillsDirs
        ? `skills: { dirs: [${role.skillsDirs.map((d) => `{ uri: '${d}' }`).join(', ')}] }`
        : '';
      const inits = role.initsDirs
        ? `inits: { dirs: [${role.initsDirs.map((d) => `{ uri: '${d}' }`).join(', ')}] }`
        : '';
      const readme = role.readmeUri
        ? `readme: { uri: '${role.readmeUri}' }`
        : '';
      const boot = role.bootUri ? `boot: { uri: '${role.bootUri}' }` : '';
      const keyrack = role.keyrackUri
        ? `keyrack: { uri: '${role.keyrackUri}' }`
        : '';

      const parts = [briefs, skills, inits, readme, boot, keyrack].filter(
        Boolean,
      );
      return `{ slug: '${role.slug}', ${parts.join(', ')} }`;
    });

    const indexContent = `
module.exports = {
  getRoleRegistry: () => ({
    roles: [${roleDefinitions.join(',\n')}]
  })
};
`;
    mkdirSync(join(rootDir, 'dist'), { recursive: true });
    writeFileSync(join(rootDir, 'dist', 'index.js'), indexContent);

    // create src files
    for (const file of input.files) {
      const fullPath = join(rootDir, file.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.content);
    }

    // create dist dir
    mkdirSync(join(rootDir, 'dist'), { recursive: true });

    // init git repo (required by invokeRepoCompile)
    execSync('git init', { cwd: rootDir, stdio: 'ignore' });

    return {
      rootDir,
      cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
    };
  };

  /**
   * invokes rhachet repo compile in a test package
   */
  const invokeRepoCompile = async (input: {
    cwd: string;
    from: string;
    into: string;
    include?: string[];
    exclude?: string[];
  }): Promise<{ stdout: string; stderr: string; status: number }> => {
    const args = [
      'repo',
      'compile',
      '--from',
      input.from,
      '--into',
      input.into,
    ];
    if (input.include) {
      args.push('--include', ...input.include);
    }
    if (input.exclude) {
      args.push('--exclude', ...input.exclude);
    }

    // use the built binary from this repo
    const binPath = join(__dirname, '../../../bin/run');

    try {
      const stdout = execSync(`${binPath} ${args.join(' ')}`, {
        cwd: input.cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '', status: 0 };
    } catch (error: unknown) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        status?: number;
      };
      return {
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? '',
        status: execError.status ?? 1,
      };
    }
  };

  // === test cases ===

  given('[case1] rhachet-roles-* package with briefs', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
          },
        ],
        files: [
          {
            path: 'src/test-role/briefs/rule.md',
            content: '# rule\n\ncontent',
          },
          {
            path: 'src/test-role/briefs/guide.md',
            content: '# guide\n\ncontent',
          },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t0] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout shows compile progress', () => {
        expect(result.stdout).toMatchSnapshot();
      });

      then('copies briefs to dist', () => {
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.md')),
        ).toBe(true);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/guide.md')),
        ).toBe(true);
      });
    });
  });

  given('[case2] role with keyrack.yml', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
            keyrackUri: 'test-role/keyrack.yml',
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          { path: 'src/test-role/keyrack.yml', content: 'keys:\n  - API_KEY' },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t1] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('copies keyrack.yml to dist', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/keyrack.yml')),
        ).toBe(true);
        expect(
          readFileSync(join(pkg.rootDir, 'dist/test-role/keyrack.yml'), 'utf8'),
        ).toContain('API_KEY');
      });
    });
  });

  given('[case3] role with boot.yml', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
            bootUri: 'test-role/boot.yml',
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          { path: 'src/test-role/boot.yml', content: 'boot: true' },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t2] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('copies boot.yml to dist', () => {
        expect(result.status).toEqual(0);
        expect(existsSync(join(pkg.rootDir, 'dist/test-role/boot.yml'))).toBe(
          true,
        );
      });
    });
  });

  given('[case4] briefs with .test dir', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          {
            path: 'src/test-role/briefs/.test/fixture.md',
            content: '# fixture',
          },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t3] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('excludes .test dir by default', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.md')),
        ).toBe(true);
        expect(
          existsSync(
            join(pkg.rootDir, 'dist/test-role/briefs/.test/fixture.md'),
          ),
        ).toBe(false);
      });
    });
  });

  given('[case5] briefs with *.test.* files', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          { path: 'src/test-role/briefs/rule.test.md', content: '# test' },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t4] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('excludes *.test.* files by default', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.md')),
        ).toBe(true);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.test.md')),
        ).toBe(false);
      });
    });
  });

  given('[case6] briefs with --include to rescue test files', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          { path: 'src/test-role/briefs/rule.test.md', content: '# test' },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t5] repo compile is invoked with --include', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
          include: ['**/*.test.md'],
        }),
      );

      then('--include rescues from default exclusion', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.md')),
        ).toBe(true);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.test.md')),
        ).toBe(true);
      });

      then('stdout shows rescued file', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] briefs with --exclude', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          { path: 'src/test-role/briefs/draft.md', content: '# draft' },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t6] repo compile is invoked with --exclude', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
          exclude: ['**/draft.md'],
        }),
      );

      then('--exclude removes from output', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/rule.md')),
        ).toBe(true);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/briefs/draft.md')),
        ).toBe(false);
      });

      then('stdout shows only non-excluded files', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case8] --from dir not found', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [{ slug: 'test-role', briefsDirs: ['test-role/briefs'] }],
        files: [],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t7] repo compile is invoked with nonexistent --from', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'nonexistent',
          into: 'dist',
        }),
      );

      then('fails with error', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain('--from directory not found');
      });

      then('stderr output', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case9] not a rhachet-roles-* package', () => {
    const pkg = useBeforeAll(async () => {
      const rootDir = join(tmpdir(), `test-${getUuid()}`);
      mkdirSync(rootDir, { recursive: true });

      // create package.json with wrong name
      writeFileSync(
        join(rootDir, 'package.json'),
        JSON.stringify(
          { name: 'some-other-package', version: '1.0.0' },
          null,
          2,
        ),
      );
      mkdirSync(join(rootDir, 'src'), { recursive: true });
      execSync('git init', { cwd: rootDir, stdio: 'ignore' });

      return {
        rootDir,
        cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
      };
    });

    afterAll(() => pkg.cleanup());

    when('[t8] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('fails with rhachet-roles-* error', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain('rhachet-roles-*');
      });

      then('stderr output', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case10] role with skills', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            skillsDirs: ['test-role/skills'],
          },
        ],
        files: [
          {
            path: 'src/test-role/skills/tool.sh',
            content: '#!/bin/bash\necho hi',
          },
          {
            path: 'src/test-role/skills/config.jsonc',
            content: '{ "key": "value" }',
          },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t9] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('copies skills to dist', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/skills/tool.sh')),
        ).toBe(true);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/skills/config.jsonc')),
        ).toBe(true);
      });

      then('stdout shows skills filetree', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case11] skills with template dir', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            skillsDirs: ['test-role/skills'],
          },
        ],
        files: [
          { path: 'src/test-role/skills/tool.sh', content: '#!/bin/bash' },
          {
            path: 'src/test-role/skills/template/file.txt',
            content: 'template content',
          },
          {
            path: 'src/test-role/skills/templates/other.txt',
            content: 'other template',
          },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t10] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('copies template dirs to dist', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(
            join(pkg.rootDir, 'dist/test-role/skills/template/file.txt'),
          ),
        ).toBe(true);
        expect(
          existsSync(
            join(pkg.rootDir, 'dist/test-role/skills/templates/other.txt'),
          ),
        ).toBe(true);
      });
    });
  });

  given('[case12] role with readme', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            briefsDirs: ['test-role/briefs'],
            readmeUri: 'test-role/readme.md',
          },
        ],
        files: [
          { path: 'src/test-role/briefs/rule.md', content: '# rule' },
          { path: 'src/test-role/readme.md', content: '# test-role readme' },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t11] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('copies readme to dist', () => {
        expect(result.status).toEqual(0);
        expect(existsSync(join(pkg.rootDir, 'dist/test-role/readme.md'))).toBe(
          true,
        );
      });
    });
  });

  given('[case13] role with inits', () => {
    const pkg = useBeforeAll(async () =>
      createTestPackage({
        packageName: 'rhachet-roles-test',
        roles: [
          {
            slug: 'test-role',
            initsDirs: ['test-role/inits'],
          },
        ],
        files: [
          {
            path: 'src/test-role/inits/setup.sh',
            content: '#!/bin/bash\necho setup',
          },
          {
            path: 'src/test-role/inits/config.jsonc',
            content: '{ "key": "value" }',
          },
        ],
      }),
    );

    afterAll(() => pkg.cleanup());

    when('[t12] repo compile is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRepoCompile({
          cwd: pkg.rootDir,
          from: 'src',
          into: 'dist',
        }),
      );

      then('copies inits to dist', () => {
        expect(result.status).toEqual(0);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/inits/setup.sh')),
        ).toBe(true);
        expect(
          existsSync(join(pkg.rootDir, 'dist/test-role/inits/config.jsonc')),
        ).toBe(true);
      });

      then('stdout shows inits filetree', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given(
    '[case14] comprehensive: 2 roles, deep nest (4 levels), all artifact types, include/exclude',
    () => {
      const pkg = useBeforeAll(async () =>
        createTestPackage({
          packageName: 'rhachet-roles-test',
          roles: [
            {
              slug: 'mechanic',
              briefsDirs: ['mechanic/briefs'],
              skillsDirs: ['mechanic/skills'],
              initsDirs: ['mechanic/inits'],
              readmeUri: 'mechanic/readme.md',
              bootUri: 'mechanic/boot.yml',
              keyrackUri: 'mechanic/keyrack.yml',
            },
            {
              slug: 'architect',
              briefsDirs: ['architect/briefs'],
              skillsDirs: ['architect/skills'],
            },
          ],
          files: [
            // === MECHANIC ROLE ===

            // explicit uris: readme, boot, keyrack
            { path: 'src/mechanic/readme.md', content: '# mechanic' },
            { path: 'src/mechanic/boot.yml', content: 'boot: true' },
            {
              path: 'src/mechanic/keyrack.yml',
              content: 'keys:\n  - GITHUB_TOKEN',
            },

            // briefs: 4 levels deep
            { path: 'src/mechanic/briefs/rule.md', content: '# top level' },
            {
              path: 'src/mechanic/briefs/practices/code.prod/evolvable.architecture/rule.require.bounded-contexts.md',
              content: '# 4 levels',
            },
            {
              path: 'src/mechanic/briefs/practices/code.prod/evolvable.architecture/rule.prefer.wet-over-dry.md',
              content: '# another 4 levels',
            },
            {
              path: 'src/mechanic/briefs/practices/code.test/frames.behavior/howto.write-bdd.md',
              content: '# bdd',
            },
            // briefs: .min condensed variant
            {
              path: 'src/mechanic/briefs/practices/rule.require.tests.min',
              content: 'condensed',
            },
            // briefs: .test dirs at multiple levels (excluded)
            {
              path: 'src/mechanic/briefs/.test/fixture.md',
              content: '# excluded',
            },
            {
              path: 'src/mechanic/briefs/practices/.test/nested.md',
              content: '# excluded',
            },
            {
              path: 'src/mechanic/briefs/practices/code.prod/.test/deep.md',
              content: '# excluded',
            },
            // briefs: *.test.md (excluded by default, rescued via --include)
            { path: 'src/mechanic/briefs/rule.test.md', content: '# rescued' },
            {
              path: 'src/mechanic/briefs/practices/howto.test.md',
              content: '# rescued',
            },
            // briefs: *.wip.md (excluded via --exclude)
            { path: 'src/mechanic/briefs/draft.wip.md', content: '# excluded' },
            {
              path: 'src/mechanic/briefs/practices/code.prod/draft.wip.md',
              content: '# excluded',
            },

            // skills: nested skill dirs with templates
            { path: 'src/mechanic/skills/deploy.sh', content: '#!/bin/bash' },
            {
              path: 'src/mechanic/skills/git.commit/git.commit.set.sh',
              content: '#!/bin/bash',
            },
            {
              path: 'src/mechanic/skills/git.commit/git.commit.push.sh',
              content: '#!/bin/bash',
            },
            {
              path: 'src/mechanic/skills/git.commit/config.jsonc',
              content: '{}',
            },
            {
              path: 'src/mechanic/skills/git.commit/output.sh',
              content: '#!/bin/bash',
            },
            {
              path: 'src/mechanic/skills/git.commit/git.commit.operations.sh',
              content: '#!/bin/bash',
            },
            // skills: deeply nested templates (3 levels under templates/)
            {
              path: 'src/mechanic/skills/git.commit/templates/message.txt',
              content: 'template',
            },
            {
              path: 'src/mechanic/skills/git.commit/templates/nested/deep/template.stone',
              content: 'stone',
            },
            {
              path: 'src/mechanic/skills/git.commit/templates/nested/deep/template.guard',
              content: 'guard',
            },
            // skills: another nested skill
            {
              path: 'src/mechanic/skills/git.release/git.release.sh',
              content: '#!/bin/bash',
            },
            {
              path: 'src/mechanic/skills/git.release/templates/pr-body.md',
              content: '# PR',
            },
            // skills: .test dirs (excluded)
            {
              path: 'src/mechanic/skills/.test/helper.sh',
              content: '# excluded',
            },
            {
              path: 'src/mechanic/skills/git.commit/.test/mock.sh',
              content: '# excluded',
            },
            // skills: *.test.sh (excluded by default, rescued via --include)
            {
              path: 'src/mechanic/skills/git.commit/git.commit.set.test.sh',
              content: '#!/bin/bash\n# test skill',
            },
            {
              path: 'src/mechanic/skills/deploy.test.sh',
              content: '#!/bin/bash\n# test skill',
            },

            // inits: nested structure
            { path: 'src/mechanic/inits/setup.sh', content: '#!/bin/bash' },
            {
              path: 'src/mechanic/inits/claude.hooks/sessionstart.notify.sh',
              content: '#!/bin/bash',
            },
            {
              path: 'src/mechanic/inits/claude.hooks/config.jsonc',
              content: '{}',
            },
            {
              path: 'src/mechanic/inits/claude.hooks/pretooluse.validate.sh',
              content: '#!/bin/bash',
            },
            // inits: .test dir (excluded)
            { path: 'src/mechanic/inits/.test/mock.sh', content: '# excluded' },

            // === ARCHITECT ROLE ===
            {
              path: 'src/architect/briefs/define.bounded-contexts.md',
              content: '# bounded',
            },
            {
              path: 'src/architect/briefs/practices/rule.require.ubiqlang.md',
              content: '# ubiqlang',
            },
            { path: 'src/architect/skills/review.sh', content: '#!/bin/bash' },
            { path: 'src/architect/skills/review/config.jsonc', content: '{}' },
          ],
        }),
      );

      afterAll(() => pkg.cleanup());

      when(
        '[t13] repo compile with --include *.test.md *.test.sh and --exclude *.wip.md',
        () => {
          const result = useBeforeAll(async () =>
            invokeRepoCompile({
              cwd: pkg.rootDir,
              from: 'src',
              into: 'dist',
              include: ['**/*.test.md', '**/*.test.sh'],
              exclude: ['**/*.wip.md'],
            }),
          );

          then('exits with status 0', () => {
            expect(result.status).toEqual(0);
          });

          then('stdout shows filetree for 2 roles with all artifacts', () => {
            expect(result.stdout).toMatchSnapshot();
          });

          // mechanic: explicit uris
          then('mechanic: copies readme, boot, keyrack', () => {
            expect(
              existsSync(join(pkg.rootDir, 'dist/mechanic/readme.md')),
            ).toBe(true);
            expect(
              existsSync(join(pkg.rootDir, 'dist/mechanic/boot.yml')),
            ).toBe(true);
            expect(
              existsSync(join(pkg.rootDir, 'dist/mechanic/keyrack.yml')),
            ).toBe(true);
          });

          // mechanic: briefs 4 levels deep
          then('mechanic: includes briefs 4 levels deep', () => {
            expect(
              existsSync(join(pkg.rootDir, 'dist/mechanic/briefs/rule.md')),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/code.prod/evolvable.architecture/rule.require.bounded-contexts.md',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/code.test/frames.behavior/howto.write-bdd.md',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: .min files
          then('mechanic: includes .min condensed briefs', () => {
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/rule.require.tests.min',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: .test dirs excluded at all levels
          then('mechanic: excludes .test dirs at all levels', () => {
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/mechanic/briefs/.test/fixture.md'),
              ),
            ).toBe(false);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/.test/nested.md',
                ),
              ),
            ).toBe(false);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/code.prod/.test/deep.md',
                ),
              ),
            ).toBe(false);
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/mechanic/skills/.test/helper.sh'),
              ),
            ).toBe(false);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/.test/mock.sh',
                ),
              ),
            ).toBe(false);
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/mechanic/inits/.test/mock.sh'),
              ),
            ).toBe(false);
          });

          // mechanic: *.test.md rescued via --include
          then('mechanic: includes *.test.md rescued via --include', () => {
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/mechanic/briefs/rule.test.md'),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/howto.test.md',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: *.test.sh rescued via --include
          then('mechanic: includes *.test.sh rescued via --include', () => {
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/mechanic/skills/deploy.test.sh'),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/git.commit.set.test.sh',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: *.wip.md excluded via --exclude
          then('mechanic: excludes *.wip.md via --exclude', () => {
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/mechanic/briefs/draft.wip.md'),
              ),
            ).toBe(false);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/briefs/practices/code.prod/draft.wip.md',
                ),
              ),
            ).toBe(false);
          });

          // mechanic: nested skills
          then('mechanic: includes nested skill directories', () => {
            expect(
              existsSync(join(pkg.rootDir, 'dist/mechanic/skills/deploy.sh')),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/git.commit.set.sh',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/git.commit.push.sh',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/git.commit.operations.sh',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.release/git.release.sh',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: skill config files
          then('mechanic: includes skill config.jsonc files', () => {
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/config.jsonc',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: deeply nested templates (3 levels under templates/)
          then('mechanic: includes deeply nested templates', () => {
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/templates/message.txt',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/templates/nested/deep/template.stone',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.commit/templates/nested/deep/template.guard',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/skills/git.release/templates/pr-body.md',
                ),
              ),
            ).toBe(true);
          });

          // mechanic: nested inits
          then('mechanic: includes nested inits', () => {
            expect(
              existsSync(join(pkg.rootDir, 'dist/mechanic/inits/setup.sh')),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/inits/claude.hooks/sessionstart.notify.sh',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/inits/claude.hooks/pretooluse.validate.sh',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/mechanic/inits/claude.hooks/config.jsonc',
                ),
              ),
            ).toBe(true);
          });

          // architect role
          then('architect: includes briefs', () => {
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/architect/briefs/define.bounded-contexts.md',
                ),
              ),
            ).toBe(true);
            expect(
              existsSync(
                join(
                  pkg.rootDir,
                  'dist/architect/briefs/practices/rule.require.ubiqlang.md',
                ),
              ),
            ).toBe(true);
          });

          then('architect: includes skills', () => {
            expect(
              existsSync(join(pkg.rootDir, 'dist/architect/skills/review.sh')),
            ).toBe(true);
            expect(
              existsSync(
                join(pkg.rootDir, 'dist/architect/skills/review/config.jsonc'),
              ),
            ).toBe(true);
          });
        },
      );
    },
  );
});
