import { execSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * .what = path to fixture assets
 * .why = assets are copied into temp repos for acceptance tests
 */
const ASSETS_DIR = resolve(__dirname, '../assets');

/**
 * .what = fixture slug for test repos
 * .why = references a directory in accept.blackbox/.test/assets/
 * .note = validated at runtime to fail fast if fixture dne
 */
export type TestRepoFixture = string;

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
  /** run pnpm install after copy (for fixtures with package.json) */
  install?: boolean;
}): {
  /** absolute path to the test repo */
  path: string;
} => {
  // gen unique temp directory path
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const suffix = input.suffix ? `-${input.suffix}` : '';
  const repoPath = join(tmpdir(), `rhachet-test-${uniqueId}${suffix}`);

  // fail fast if fixture dne
  const fixturePath = join(ASSETS_DIR, input.fixture);
  if (!existsSync(fixturePath))
    throw new Error(`fixture not found: ${input.fixture} (${fixturePath})`);

  // copy fixture assets into temp repo
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

  // install dependencies if requested and package.json exists
  // use bun install for bun-compatible node_modules structure
  if (input.install && existsSync(join(repoPath, 'package.json'))) {
    execSync('bun install', {
      cwd: repoPath,
      stdio: 'inherit',
      timeout: 120000, // 2 minute timeout
    });
  }

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
