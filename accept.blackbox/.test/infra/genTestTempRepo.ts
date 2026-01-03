import { execSync } from 'node:child_process';
import { chmodSync, cpSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * .what = path to fixture assets
 * .why = assets are copied into temp repos for acceptance tests
 */
const ASSETS_DIR = resolve(__dirname, '../assets');

/**
 * .what = fixture types for test repos
 * .why = provides reusable repo configurations for different test scenarios
 */
export type TestRepoFixture =
  | 'minimal'
  | 'with-skills'
  | 'with-briefs'
  | 'with-registry'
  | 'with-link-sources';

/**
 * .what = creates an isolated test repo in os.tmpdir()
 * .why =
 *   - maximally portable and isolated test environments
 *   - OS handles cleanup (no manual teardown needed)
 *   - each test gets a fresh workspace
 */
export const genTestTempRepo = (input: {
  /** fixture template to use */
  fixture: TestRepoFixture;
  /** optional unique suffix for the repo name */
  suffix?: string;
}): {
  /** absolute path to the test repo */
  path: string;
} => {
  // gen unique temp directory path
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const suffix = input.suffix ? `-${input.suffix}` : '';
  const repoPath = join(tmpdir(), `rhachet-test-${uniqueId}${suffix}`);

  // copy fixture assets into temp repo
  const fixturePath = join(ASSETS_DIR, input.fixture);
  cpSync(fixturePath, repoPath, { recursive: true });

  // make shell skills executable
  setSkillsExecutable({ dir: repoPath });

  // init git repo (required for rhachet)
  execSync('git init', { cwd: repoPath, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', {
    cwd: repoPath,
    stdio: 'ignore',
  });
  execSync('git config user.name "Test User"', {
    cwd: repoPath,
    stdio: 'ignore',
  });

  return { path: repoPath };
};

/**
 * .what = recursively makes all .sh files executable
 * .why = shell skills need execute permission after copy
 */
const setSkillsExecutable = (input: { dir: string }): void => {
  const entries = readdirSync(input.dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(input.dir, entry.name);

    if (entry.isDirectory()) {
      setSkillsExecutable({ dir: fullPath });
    }

    if (entry.isFile() && entry.name.endsWith('.sh')) {
      chmodSync(fullPath, '755');
    }
  }
};
