import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findsertRepoThisRoleAnyBootGuard } from './findsertRepoThisRoleAnyBootGuard';

/**
 * .what = a temp repo whose `.agent/repo=.this/role=any` holds the files given
 */
const genRepoWithRoleAny = (input: {
  slug: string;
  files: Record<string, string>;
}): { repo: string; roleDir: string } => {
  const repo = genTempDir({ slug: input.slug });
  const roleDir = genSampleFileTree({
    dir: join(repo, '.agent', 'repo=.this', 'role=any'),
    files: input.files,
  });
  return { repo, roleDir };
};

const BOOT_YML_NO_BUDGET = [
  '# the repo briefs every clone reads',
  'always:',
  '  briefs:',
  '    say:',
  '      - briefs/core.md',
  '',
].join('\n');

/**
 * .what = clamps the findsert of the budget a repo's own role=any boot owes
 * .why = the budget is created where absent and NEVER changed where present — an author's
 *        declared cap of any size is theirs to keep. it is also the opt-in that arms the
 *        built-in onStop gate, so no hook file is written here
 *
 * .note = INTEGRATION grain: it reads and writes the filesystem
 */
describe('findsertRepoThisRoleAnyBootGuard', () => {
  given('[case1] a repo with no .agent/repo=.this/role=any dir', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({ slug: 'repo-this-guard-absent' });
      const result = findsertRepoThisRoleAnyBootGuard({ repoPath: repo });
      return { repo, result };
    });

    when('[t0] the guard is findserted', () => {
      then('it reports the budget absent and writes naught', () => {
        expect(scene.result).toEqual({ budget: 'absent' });
        expect(existsSync(join(scene.repo, '.agent'))).toEqual(false);
      });
    });
  });

  given('[case2] a boot.yml with a payload and no budget', () => {
    const scene = useBeforeAll(async () => {
      const { repo, roleDir } = genRepoWithRoleAny({
        slug: 'repo-this-guard-no-budget',
        files: { 'boot.yml': BOOT_YML_NO_BUDGET },
      });
      const first = findsertRepoThisRoleAnyBootGuard({ repoPath: repo });
      const bootAfterFirst = readFileSync(join(roleDir, 'boot.yml'), 'utf8');
      const second = findsertRepoThisRoleAnyBootGuard({ repoPath: repo });
      const bootAfterSecond = readFileSync(join(roleDir, 'boot.yml'), 'utf8');
      return {
        roleDir,
        first,
        second,
        bootAfterFirst,
        bootAfterSecond,
      };
    });

    when('[t0] the guard is findserted', () => {
      then('it creates the budget', () => {
        expect(scene.first).toEqual({ budget: 'created' });
      });

      then('the budget lands under the lead comment, above the payload', () => {
        expect(scene.bootAfterFirst).toEqual(
          [
            '# the repo briefs every clone reads',
            'budget:',
            '  tokens: 5_000',
            'always:',
            '  briefs:',
            '    say:',
            '      - briefs/core.md',
            '',
          ].join('\n'),
        );
      });

      then('no hook file is written, since the gate is built in', () => {
        expect(existsSync(join(scene.roleDir, 'hooks.yml'))).toEqual(false);
      });
    });

    when('[t1] the guard is findserted again', () => {
      then('it reports extant and changes naught', () => {
        expect(scene.second).toEqual({ budget: 'extant' });
        expect(scene.bootAfterSecond).toEqual(scene.bootAfterFirst);
      });
    });
  });

  given('[case3] a boot.yml that already declares its own budget', () => {
    const scene = useBeforeAll(async () => {
      const content = [
        'budget:',
        '  tokens: 25_000',
        'always:',
        '  briefs:',
        '    say:',
        '      - briefs/core.md',
        '',
      ].join('\n');
      const { repo, roleDir } = genRepoWithRoleAny({
        slug: 'repo-this-guard-own-budget',
        files: { 'boot.yml': content },
      });
      const result = findsertRepoThisRoleAnyBootGuard({ repoPath: repo });
      const bootAfter = readFileSync(join(roleDir, 'boot.yml'), 'utf8');
      return { content, result, bootAfter };
    });

    when('[t0] the guard is findserted', () => {
      then('the declared budget is kept byte for byte', () => {
        expect(scene.result.budget).toEqual('extant');
        expect(scene.bootAfter).toEqual(scene.content);
      });
    });
  });

  given('[case4] a boot.yml with no payload key', () => {
    const scene = useBeforeAll(async () => {
      const content = '# a spec with no payload yet\n';
      const { repo, roleDir } = genRepoWithRoleAny({
        slug: 'repo-this-guard-no-payload',
        files: { 'boot.yml': content },
      });
      const result = findsertRepoThisRoleAnyBootGuard({ repoPath: repo });
      const bootAfter = readFileSync(join(roleDir, 'boot.yml'), 'utf8');
      return { content, result, bootAfter };
    });

    when('[t0] the guard is findserted', () => {
      then('no budget is added, since there is no payload to cap', () => {
        expect(scene.result.budget).toEqual('absent');
        expect(scene.bootAfter).toEqual(scene.content);
      });
    });
  });

  given('[case5] a role=any dir with no boot.yml', () => {
    const scene = useBeforeAll(async () => {
      const { repo, roleDir } = genRepoWithRoleAny({
        slug: 'repo-this-guard-no-spec',
        files: { 'readme.md': '# any\n' },
      });
      const result = findsertRepoThisRoleAnyBootGuard({ repoPath: repo });
      return {
        result,
        isBootCreated: existsSync(join(roleDir, 'boot.yml')),
      };
    });

    when('[t0] the guard is findserted', () => {
      then('no boot.yml is created for the author', () => {
        expect(scene.result.budget).toEqual('absent');
        expect(scene.isBootCreated).toEqual(false);
      });
    });
  });
});
