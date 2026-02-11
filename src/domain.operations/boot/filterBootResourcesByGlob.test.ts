import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { filterPathsByGlob } from './filterBootResourcesByGlob';

describe('filterPathsByGlob', () => {
  // create a temp directory with test files for each suite
  const tempDir = join(tmpdir(), 'filterBootResourcesByGlob-test');

  beforeAll(() => {
    // create temp directory structure
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'briefs'), { recursive: true });
    mkdirSync(join(tempDir, 'briefs', 'practices'), { recursive: true });
    mkdirSync(join(tempDir, 'briefs', 'practices', 'code.test'), {
      recursive: true,
    });
    mkdirSync(join(tempDir, 'briefs', 'practices', 'code.prod'), {
      recursive: true,
    });
    mkdirSync(join(tempDir, 'skills'), { recursive: true });
    mkdirSync(join(tempDir, 'skills', 'git.commit'), { recursive: true });

    // create test files
    writeFileSync(join(tempDir, 'briefs', 'core.md'), 'core');
    writeFileSync(join(tempDir, 'briefs', 'glossary.md'), 'glossary');
    writeFileSync(
      join(tempDir, 'briefs', 'practices', 'code.test', 'rule1.md'),
      'rule1',
    );
    writeFileSync(
      join(tempDir, 'briefs', 'practices', 'code.test', 'rule2.md'),
      'rule2',
    );
    writeFileSync(
      join(tempDir, 'briefs', 'practices', 'code.prod', 'rule3.md'),
      'rule3',
    );
    writeFileSync(join(tempDir, 'skills', 'say-hello.sh'), 'hello');
    writeFileSync(join(tempDir, 'skills', 'git.commit', 'set.sh'), 'set');
    writeFileSync(join(tempDir, 'skills', 'git.commit', 'uses.sh'), 'uses');
  });

  afterAll(() => {
    // cleanup temp directory
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  });

  given('[case1] single glob pattern', () => {
    when('[t0] glob matches specific file', () => {
      then('returns only that file', async () => {
        const allPaths = [
          resolve(tempDir, 'briefs', 'core.md'),
          resolve(tempDir, 'briefs', 'glossary.md'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/core.md'],
          cwd: tempDir,
        });

        expect(result).toEqual([resolve(tempDir, 'briefs', 'core.md')]);
      });
    });

    when('[t1] glob matches multiple files via wildcard', () => {
      then('returns all matched files', async () => {
        const allPaths = [
          resolve(tempDir, 'briefs', 'core.md'),
          resolve(tempDir, 'briefs', 'glossary.md'),
          resolve(tempDir, 'skills', 'say-hello.sh'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/*.md'],
          cwd: tempDir,
        });

        expect(result).toHaveLength(2);
        expect(result).toContain(resolve(tempDir, 'briefs', 'core.md'));
        expect(result).toContain(resolve(tempDir, 'briefs', 'glossary.md'));
      });
    });

    when('[t2] glob matches files recursively', () => {
      then('returns all nested matched files', async () => {
        const allPaths = [
          resolve(tempDir, 'briefs', 'core.md'),
          resolve(tempDir, 'briefs', 'practices', 'code.test', 'rule1.md'),
          resolve(tempDir, 'briefs', 'practices', 'code.test', 'rule2.md'),
          resolve(tempDir, 'briefs', 'practices', 'code.prod', 'rule3.md'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/**/*.md'],
          cwd: tempDir,
        });

        expect(result).toHaveLength(4);
      });
    });

    when('[t3] glob matches files in specific subdirectory', () => {
      then('returns only files from that subdirectory', async () => {
        const allPaths = [
          resolve(tempDir, 'briefs', 'practices', 'code.test', 'rule1.md'),
          resolve(tempDir, 'briefs', 'practices', 'code.test', 'rule2.md'),
          resolve(tempDir, 'briefs', 'practices', 'code.prod', 'rule3.md'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/practices/code.test/**/*.md'],
          cwd: tempDir,
        });

        expect(result).toHaveLength(2);
        expect(result).toContain(
          resolve(tempDir, 'briefs', 'practices', 'code.test', 'rule1.md'),
        );
        expect(result).toContain(
          resolve(tempDir, 'briefs', 'practices', 'code.test', 'rule2.md'),
        );
      });
    });
  });

  given('[case2] multiple glob patterns', () => {
    when('[t0] patterns match different files', () => {
      then('returns union of matches', async () => {
        const allPaths = [
          resolve(tempDir, 'briefs', 'core.md'),
          resolve(tempDir, 'skills', 'say-hello.sh'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/core.md', 'skills/say-hello.sh'],
          cwd: tempDir,
        });

        expect(result).toHaveLength(2);
      });
    });

    when('[t1] patterns have overlapped matches', () => {
      then('returns deduplicated results', async () => {
        const allPaths = [
          resolve(tempDir, 'briefs', 'core.md'),
          resolve(tempDir, 'briefs', 'glossary.md'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/*.md', 'briefs/core.md'], // core.md matched by both
          cwd: tempDir,
        });

        expect(result).toHaveLength(2);
      });
    });
  });

  given('[case3] edge cases', () => {
    when('[t0] empty globs array', () => {
      then('returns empty array', async () => {
        const allPaths = [resolve(tempDir, 'briefs', 'core.md')];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: [],
          cwd: tempDir,
        });

        expect(result).toEqual([]);
      });
    });

    when('[t1] empty paths array', () => {
      then('returns empty array', async () => {
        const result = await filterPathsByGlob({
          paths: [],
          globs: ['briefs/**/*.md'],
          cwd: tempDir,
        });

        expect(result).toEqual([]);
      });
    });

    when('[t2] glob matches no files', () => {
      then('returns empty array', async () => {
        const allPaths = [resolve(tempDir, 'briefs', 'core.md')];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['nonexistent/**/*.md'],
          cwd: tempDir,
        });

        expect(result).toEqual([]);
      });
    });

    when('[t3] paths not in input but matched by glob', () => {
      then('are not returned (filters input paths only)', async () => {
        // only include core.md in paths, even though glob matches both
        const allPaths = [resolve(tempDir, 'briefs', 'core.md')];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['briefs/*.md'], // would match core.md AND glossary.md
          cwd: tempDir,
        });

        // only core.md is returned because glossary.md wasn't in input paths
        expect(result).toEqual([resolve(tempDir, 'briefs', 'core.md')]);
      });
    });
  });

  given('[case4] skill files', () => {
    when('[t0] glob matches shell scripts', () => {
      then('returns matched skill files', async () => {
        const allPaths = [
          resolve(tempDir, 'skills', 'say-hello.sh'),
          resolve(tempDir, 'skills', 'git.commit', 'set.sh'),
          resolve(tempDir, 'skills', 'git.commit', 'uses.sh'),
        ];

        const result = await filterPathsByGlob({
          paths: allPaths,
          globs: ['skills/git.commit/**/*.sh'],
          cwd: tempDir,
        });

        expect(result).toHaveLength(2);
        expect(result).toContain(
          resolve(tempDir, 'skills', 'git.commit', 'set.sh'),
        );
        expect(result).toContain(
          resolve(tempDir, 'skills', 'git.commit', 'uses.sh'),
        );
      });
    });
  });
});
