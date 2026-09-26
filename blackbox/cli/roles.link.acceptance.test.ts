import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

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

      then('the whole stdout is locked (the reviewer-faced contract)', () => {
        // the .toContain asserts above prove the FRAGMENTS a caller depends on;
        // this pins the WHOLE render, so a reviewer vibechecks the command's real
        // output in the pr diff and any drift surfaces there (rule.require.snapshots,
        // rule.require.contract-snapshot-exhaustiveness). this command now also
        // renders both brain dirs and reports their boot.md, so its stdout is a
        // user-faced surface this branch changed
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
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

      then('root .gitignore gains only the default actor negation', () => {
        // the linked roles stay ignored from within .agent/repo=*; the root spares the default brain dir
        const content = readFileSync(join(repo.path, '.gitignore'), 'utf-8');
        expect(content.split('\n').filter((line) => line.includes('.agent'))).toEqual(
          ['!.agent/.actors/actor.via.slug=.default/'],
        );
      });

      /**
       * .what = the rendered corpus carries the briefs and NOT the `<stats>` census
       * .why = `rhx roles boot` HEADS its stdout with a `<stats>` block, and the brain dir
       *   corpus is rendered from that same source. so the transport must be a FILTER, never
       *   a pipe: a census block inside `boot.md` would charge every clone's context for a
       *   report only a human reads. this is the ADDED half of `delivered == rendered` —
       *   the LOST half is the journey's head-and-tail quote
       *
       * .note = the two asserts are a pair on purpose. `<stats>` absent alone would also hold
       *   for an EMPTY file, so the brief tag is what proves the corpus actually landed and
       *   the census alone was dropped
       */
      then('the rendered boot.md carries the corpus and not the census block', () => {
        const boot = readFileSync(
          join(
            repo.path,
            '.agent/.actors/actor.via.slug=.default/brain/.claude/boot.md',
          ),
          'utf-8',
        );
        expect(boot).not.toContain('<stats>');
        expect(boot).toContain('<brief.say');
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

      then('the whole negative-path stderr is locked', () => {
        // the negative path is the half a reviewer never runs by hand, so it is the
        // half that rots unseen — pin it (rule.require.contract-snapshot-exhaustiveness)
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
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

      then('the whole absent-flag stderr is locked', () => {
        // an absent required flag is the commonest first contact a human has with
        // this command; its full text is an ergonomic surface, so it is pinned
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
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

  given('[case4] repo with role that has boot and keyrack', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-boot-keyrack' }),
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

      then('creates boot.yml symlink', () => {
        const bootPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/boot.yml',
        );
        expect(existsSync(bootPath)).toBe(true);
        expect(lstatSync(bootPath).isSymbolicLink()).toBe(true);
      });

      then('boot.yml symlink points to source file', () => {
        const bootPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/boot.yml',
        );
        const linkTarget = readlinkSync(bootPath);
        expect(linkTarget).toContain('roles/tester/boot.yml');
      });

      then('boot.yml contains expected content', () => {
        const bootPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/boot.yml',
        );
        const content = readFileSync(bootPath, 'utf-8');
        expect(content).toContain('model: claude-sonnet');
      });

      then('creates keyrack.yml symlink', () => {
        const keyrackPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/keyrack.yml',
        );
        expect(existsSync(keyrackPath)).toBe(true);
        expect(lstatSync(keyrackPath).isSymbolicLink()).toBe(true);
      });

      then('keyrack.yml symlink points to source file', () => {
        const keyrackPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/keyrack.yml',
        );
        const linkTarget = readlinkSync(keyrackPath);
        expect(linkTarget).toContain('roles/tester/keyrack.yml');
      });

      then('keyrack.yml contains expected content', () => {
        const keyrackPath = resolve(
          repo.path,
          '.agent/repo=test-repo/role=tester/keyrack.yml',
        );
        const content = readFileSync(keyrackPath, 'utf-8');
        expect(content).toContain('org: testorg');
        expect(content).toContain('TEST_ROLE_KEY');
      });

      then('outputs boot.yml and keyrack.yml in links', () => {
        expect(result.stdout).toContain('boot.yml');
        expect(result.stdout).toContain('keyrack.yml');
      });
    });
  });

  given('[case5] a host with NO claude on PATH', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-link-sources' }),
    );

    /**
     * .what = a PATH that finds `node` and the dispatcher's own helpers, and no `claude`
     * .why = `roles link` re-renders every brain dir boot, and that sweep asks the brain-cli
     *   for its version. a ci box installs no brain-cli at all, so the sweep must still
     *   render — `onAbsent: 'permit'` at syncAndReportBrainDirBoots.ts. a refusal here would
     *   break every ci run that links a role, and the corpus it writes has no reader on such
     *   a host anyway, so the floor binds nobody
     *
     * .note = the host PATH is dropped whole rather than filtered, because the dir a real
     *   `claude` installs into is commonly the very dir `node` lives in — a filter would be
     *   host-dependent (`rule.require.hermetic-tests`). `/usr/bin:/bin` is the minimum
     *   `bin/run` needs for `dirname`, `readlink` and `git`; [t0] proves neither holds a
     *   `claude` rather than assume it
     */
    const brainless = useBeforeAll(async () => {
      const binDirNode = join(repo.path, '.stub-bin-node');
      mkdirSync(binDirNode, { recursive: true });
      const nodePath = join(binDirNode, 'node');
      if (!existsSync(nodePath)) symlinkSync(process.execPath, nodePath);
      return { path: `${binDirNode}:/usr/bin:/bin` };
    });

    when('[t0] that PATH is searched for a claude', () => {
      then('it finds none — so the case is hermetic, never host-dependent', () => {
        const probe = spawnSync('/bin/sh', ['-c', 'command -v claude'], {
          env: { ...process.env, PATH: brainless.path },
          encoding: 'utf-8',
        });
        expect(probe.status).not.toEqual(0);
        expect((probe.stdout ?? '').trim()).toEqual('');
      });
    });

    when('[t1] roles link runs on that brainless PATH', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'test-repo', '--role', 'tester'],
          cwd: repo.path,
          env: { PATH: brainless.path },
        }),
      );

      then('exits with status 0 — an absent brain-cli permits the sweep', () => {
        expect(result.status).toEqual(0);
      });

      then('the default brain dir boot.md still rendered', () => {
        const bootPath = resolve(
          repo.path,
          '.agent/.actors/actor.via.slug=.default/brain/.claude/boot.md',
        );
        expect(existsSync(bootPath)).toBe(true);
        expect(readFileSync(bootPath, 'utf-8').length).toBeGreaterThan(0);
      });

      then('stdout reports the boot.md it rendered', () => {
        expect(result.stdout).toContain('boot.md');
      });
    });
  });
});
