import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getOneIsPathIgnoredByGit } from '@src/.test/infra/getOneIsPathIgnoredByGit';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genRepoActorGitignoreExclusion } from './genRepoActorGitignoreExclusion';

const NEGATION = '!.agent/.actors/actor.via.repo=ambient/';
const FILE_DEFAULT =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.json';
const FILE_HASH = '.agent/.actors/actor.via.hash=abc12345/actor.json';

describe('genRepoActorGitignoreExclusion', () => {
  given('[case1] a repo with no .gitignore', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({
        slug: 'default-actor-exclusion-absent',
        git: true,
      });
      const result = await genRepoActorGitignoreExclusion({ repoPath: repo });
      return { repo, result };
    });

    when('[t0] the exclusion is findserted', () => {
      then('the .gitignore is created with the negation alone', () => {
        expect(scene.result).toEqual({ rewritten: false, negation: 'CREATED' });
        expect(readFileSync(join(scene.repo, '.gitignore'), 'utf8')).toEqual(
          `${NEGATION}\n`,
        );
      });
    });
  });

  given('[case2] a .gitignore without an .actors line', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({
        slug: 'default-actor-exclusion-plain',
        git: true,
      });
      writeFileSync(
        join(repo, '.gitignore'),
        'node_modules\n# notes\n',
        'utf8',
      );
      const result = await genRepoActorGitignoreExclusion({ repoPath: repo });
      return { repo, result };
    });

    when('[t0] the exclusion is findserted', () => {
      then('the negation is appended and every prior line is kept', () => {
        expect(scene.result).toEqual({
          rewritten: false,
          negation: 'APPENDED',
        });
        expect(readFileSync(join(scene.repo, '.gitignore'), 'utf8')).toEqual(
          `node_modules\n# notes\n${NEGATION}\n`,
        );
      });
    });
  });

  given('[case3] a .gitignore that excludes the .actors dir', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({
        slug: 'default-actor-exclusion-dir',
        git: true,
      });
      writeFileSync(
        join(repo, '.gitignore'),
        'node_modules\n.agent/.actors/\ndist\n',
        'utf8',
      );
      const result = await genRepoActorGitignoreExclusion({ repoPath: repo });
      return { repo, result };
    });

    when('[t0] the exclusion is findserted', () => {
      then(
        'the dir line is rewritten to its children form, the rest kept',
        () => {
          expect(scene.result).toEqual({
            rewritten: true,
            negation: 'APPENDED',
          });
          expect(readFileSync(join(scene.repo, '.gitignore'), 'utf8')).toEqual(
            `node_modules\n.agent/.actors/*\ndist\n${NEGATION}\n`,
          );
        },
      );

      then('git spares a file in the default dir', () => {
        expect(
          getOneIsPathIgnoredByGit({ repo: scene.repo, path: FILE_DEFAULT }),
        ).toBe(false);
      });

      then('git ignores a file in a hash actor dir', () => {
        expect(
          getOneIsPathIgnoredByGit({ repo: scene.repo, path: FILE_HASH }),
        ).toBe(true);
      });
    });

    when('[t1] the exclusion is findserted again', () => {
      const rerun = useBeforeAll(async () => {
        const before = readFileSync(join(scene.repo, '.gitignore'), 'utf8');
        const result = await genRepoActorGitignoreExclusion({
          repoPath: scene.repo,
        });
        const after = readFileSync(join(scene.repo, '.gitignore'), 'utf8');
        return { before, after, result };
      });

      then('the file is unchanged', () => {
        expect(rerun.result).toEqual({ rewritten: false, negation: 'FOUND' });
        expect(rerun.after).toEqual(rerun.before);
      });
    });
  });

  given('[case4] a .gitignore with a root-anchored .actors dir line', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({
        slug: 'default-actor-exclusion-anchored',
        git: true,
      });
      writeFileSync(join(repo, '.gitignore'), '/.agent/.actors\n', 'utf8');
      await genRepoActorGitignoreExclusion({ repoPath: repo });
      return { repo };
    });

    when('[t0] the exclusion is findserted', () => {
      then('the anchor is kept and git spares the default dir', () => {
        expect(existsSync(join(scene.repo, '.gitignore'))).toBe(true);
        expect(readFileSync(join(scene.repo, '.gitignore'), 'utf8')).toEqual(
          `/.agent/.actors/*\n${NEGATION}\n`,
        );
        expect(
          getOneIsPathIgnoredByGit({ repo: scene.repo, path: FILE_DEFAULT }),
        ).toBe(false);
        expect(
          getOneIsPathIgnoredByGit({ repo: scene.repo, path: FILE_HASH }),
        ).toBe(true);
      });
    });
  });
});
