import { given, then, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  findsertRepoGitignore,
  REPO_GITIGNORE_CONTENT,
} from './findsertRepoGitignore';

describe('findsertRepoGitignore', () => {
  const testDir = resolve(__dirname, './.temp/findsertRepoGitignore');
  const repoDir = resolve(testDir, '.agent/repo=test');
  const originalCwd = process.cwd();

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(repoDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const gitignorePath = resolve(repoDir, '.gitignore');
    if (existsSync(gitignorePath)) {
      rmSync(gitignorePath);
    }
  });

  given('[case1] directory exists, no .gitignore', () => {
    when('[t0] findsertRepoGitignore called', () => {
      then('creates file with correct content, status=created', () => {
        const result = findsertRepoGitignore({ repoDir });

        expect(result.status).toEqual('created');

        const content = readFileSync(resolve(repoDir, '.gitignore'), 'utf8');
        expect(content).toContain('.what = tells git to ignore this dir');
        expect(content).toContain('.why = keeps git history clean');
        expect(content).toContain('*');
      });
    });
  });

  given('[case2] .gitignore exists with correct content', () => {
    beforeEach(() => {
      writeFileSync(
        resolve(repoDir, '.gitignore'),
        REPO_GITIGNORE_CONTENT,
        'utf8',
      );
    });

    when('[t0] findsertRepoGitignore called', () => {
      then('returns unchanged, no modification', () => {
        const result = findsertRepoGitignore({ repoDir });

        expect(result.status).toEqual('unchanged');

        const content = readFileSync(resolve(repoDir, '.gitignore'), 'utf8');
        expect(content).toContain('.what = tells git to ignore this dir');
        expect(content).toContain('.why = keeps git history clean');
        expect(content).toContain('*');
      });
    });
  });

  given('[case3] .gitignore exists with different content', () => {
    beforeEach(() => {
      writeFileSync(resolve(repoDir, '.gitignore'), '*.log\n', 'utf8');
    });

    when('[t0] findsertRepoGitignore called', () => {
      then('overwrites with correct content, status=updated', () => {
        const result = findsertRepoGitignore({ repoDir });

        expect(result.status).toEqual('updated');

        const content = readFileSync(resolve(repoDir, '.gitignore'), 'utf8');
        expect(content).toContain('.what = tells git to ignore this dir');
        expect(content).toContain('.why = keeps git history clean');
        expect(content).toContain('*');
      });
    });
  });
});
