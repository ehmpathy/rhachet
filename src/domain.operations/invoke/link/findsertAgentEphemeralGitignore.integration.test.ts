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
  AGENT_EPHEMERAL_GITIGNORE_CONTENT,
  findsertAgentEphemeralGitignore,
} from './findsertAgentEphemeralGitignore';

describe('findsertAgentEphemeralGitignore', () => {
  const testDir = resolve(__dirname, './.temp/findsertAgentEphemeralGitignore');
  const ephemeralDir = resolve(testDir, '.agent/.actors');
  const originalCwd = process.cwd();

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    rmSync(ephemeralDir, { recursive: true, force: true });
  });

  given('[case1] dir does not exist yet', () => {
    when('[t0] findsertAgentEphemeralGitignore called', () => {
      then('creates dir + file with self-ignore, status=created', () => {
        const result = findsertAgentEphemeralGitignore({ dir: ephemeralDir });

        expect(result.status).toEqual('created');

        const content = readFileSync(
          resolve(ephemeralDir, '.gitignore'),
          'utf8',
        );
        expect(content).toContain('.what = tells git to ignore this dir');
        expect(content).toContain('ephemeral, local-only runtime state');
        expect(content).toContain('*');
      });
    });
  });

  given('[case2] .gitignore exists with correct content', () => {
    beforeEach(() => {
      mkdirSync(ephemeralDir, { recursive: true });
      writeFileSync(
        resolve(ephemeralDir, '.gitignore'),
        AGENT_EPHEMERAL_GITIGNORE_CONTENT,
        'utf8',
      );
    });

    when('[t0] findsertAgentEphemeralGitignore called', () => {
      then('returns unchanged, no modification', () => {
        const result = findsertAgentEphemeralGitignore({ dir: ephemeralDir });

        expect(result.status).toEqual('unchanged');
      });
    });
  });

  given('[case3] .gitignore exists with different content', () => {
    beforeEach(() => {
      mkdirSync(ephemeralDir, { recursive: true });
      writeFileSync(resolve(ephemeralDir, '.gitignore'), '*.log\n', 'utf8');
    });

    when('[t0] findsertAgentEphemeralGitignore called', () => {
      then('overwrites with correct content, status=updated', () => {
        const result = findsertAgentEphemeralGitignore({ dir: ephemeralDir });

        expect(result.status).toEqual('updated');

        const content = readFileSync(
          resolve(ephemeralDir, '.gitignore'),
          'utf8',
        );
        expect(content).toEqual(AGENT_EPHEMERAL_GITIGNORE_CONTENT);
      });
    });
  });

  given('[case4] the .cache ephemeral dir', () => {
    beforeEach(() => {
      const cacheDir = resolve(testDir, '.agent/.cache');
      rmSync(cacheDir, { recursive: true, force: true });
    });

    when('[t0] called for the .cache ephemeral dir', () => {
      then('creates the dir + its self-ignore', () => {
        const cacheDir = resolve(testDir, '.agent/.cache');
        const result = findsertAgentEphemeralGitignore({ dir: cacheDir });

        expect(result.status).toEqual('created');
        expect(existsSync(resolve(cacheDir, '.gitignore'))).toBe(true);
      });
    });
  });
});
