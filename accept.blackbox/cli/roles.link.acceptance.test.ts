import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet roles link', () => {
  given('[case1] repo with link sources', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-link-sources' }),
    );

    when('[t0] roles link --repo test-repo --role tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'test-repo', '--role', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates .agent/readme.md', () => {
        const readmePath = resolve(repo.path, '.agent/readme.md');
        const content = readFileSync(readmePath, 'utf-8');
        expect(content).toContain('agent');
      });

      then('creates .agent/repo=test-repo/readme.md with repo readme', () => {
        const readmePath = resolve(repo.path, '.agent/repo=test-repo/readme.md');
        const content = readFileSync(readmePath, 'utf-8');
        expect(content).toContain('Test Repository');
        expect(content).toContain('test repo readme for acceptance tests');
      });

      then('creates .agent/repo=test-repo/role=tester/readme.md with role readme', () => {
        const readmePath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/readme.md',
        );
        const content = readFileSync(readmePath, 'utf-8');
        expect(content).toContain('Tester Role');
        expect(content).toContain('tester role readme for acceptance tests');
      });

      then('repo readme is a symlink to source file', () => {
        const readmePath = resolve(repo.path, '.agent/repo=test-repo/readme.md');
        const stats = lstatSync(readmePath);
        expect(stats.isSymbolicLink()).toBe(true);

        // verify symlink points to the correct source
        const linkTarget = readlinkSync(readmePath);
        expect(linkTarget).toContain('.source/repo-readme.md');
      });

      then('role readme is a symlink to source file', () => {
        const readmePath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/readme.md',
        );
        const stats = lstatSync(readmePath);
        expect(stats.isSymbolicLink()).toBe(true);

        // verify symlink points to the correct source
        const linkTarget = readlinkSync(readmePath);
        expect(linkTarget).toContain('.source/role-readme.md');
      });

      then('links briefs from source directory', () => {
        const briefPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/briefs/sample-brief.md',
        );
        const content = readFileSync(briefPath, 'utf-8');
        expect(content).toContain('Sample Brief');
      });

      then('links skills from source directory', () => {
        const skillPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/skills/say-hello.sh',
        );
        const content = readFileSync(skillPath, 'utf-8');
        expect(content).toContain('hello from acceptance test');
      });

      then('outputs upserted readme paths', () => {
        expect(result.stdout).toContain('repo=test-repo/readme.md');
        expect(result.stdout).toContain('repo=test-repo/role=tester/readme.md');
      });

      then('outputs linked counts', () => {
        expect(result.stdout).toContain('1 brief(s)');
        expect(result.stdout).toContain('1 skill(s)');
      });

      then('creates .gitignore inside .agent/repo=test-repo/', () => {
        const gitignorePath = resolve(
          repo.path,
          '.agent/repo=test-repo/.gitignore',
        );
        expect(existsSync(gitignorePath)).toBe(true);

        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toContain('.what = tells git to ignore this dir');
        expect(content).toContain('.why = keeps git history clean');
        expect(content).toContain('*');
      });

      then('does not modify root .gitignore', () => {
        const rootGitignorePath = resolve(repo.path, '.gitignore');
        // root .gitignore should not exist or not contain .agent entries
        if (existsSync(rootGitignorePath)) {
          const content = readFileSync(rootGitignorePath, 'utf-8');
          expect(content).not.toContain('.agent/');
        }
      });
    });

    when('[t1] roles link --role tester (without --repo)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--role', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0 (auto-infers repo)', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs inferred repo in message', () => {
        expect(result.stdout).toContain('repo=test-repo/role=tester');
      });
    });
  });

  given('[case2] minimal repo (empty registries)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] roles link --role nonexistent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--role', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('outputs error about no registries', () => {
        expect(result.stderr).toContain('No registries found');
      });
    });

    when('[t1] roles link without --role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('outputs error about --role required', () => {
        expect(result.stderr).toContain('--role is required');
      });
    });
  });

  given('[case3] repo without rhachet.use.ts but with rhachet-roles packages', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-packages' }),
    );

    when('[t0] roles link --role tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--role', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains discovery message', () => {
        expect(result.stdout).toContain('discover roles from packages');
      });

      then('creates .agent directory structure', () => {
        const readmePath = resolve(repo.path, '.agent/readme.md');
        const content = readFileSync(readmePath, 'utf-8');
        expect(content).toContain('agent');
      });

      then('links role from discovered package', () => {
        const roleReadmePath = resolve(
          repo.path,
          '.agent/repo=test/role=tester/readme.md',
        );
        const content = readFileSync(roleReadmePath, 'utf-8');
        expect(content).toContain('Tester Role');
      });

      then('creates .gitignore inside .agent/repo=test/', () => {
        const gitignorePath = resolve(repo.path, '.agent/repo=test/.gitignore');
        expect(existsSync(gitignorePath)).toBe(true);

        const content = readFileSync(gitignorePath, 'utf-8');
        expect(content).toContain('.what = tells git to ignore this dir');
        expect(content).toContain('*');
      });
    });

    when('[t1] roles link --role test/tester (with repo prefix)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--role', 'tester', '--repo', 'test'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });
  });
});
