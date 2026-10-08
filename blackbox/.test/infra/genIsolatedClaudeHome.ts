import { ConstraintError } from 'helpful-errors';
import { genTempDir } from 'test-fns';

import { BRAIN_CLI_VERSION_FLOOR } from '@src/domain.operations/enroll/assertBrainCliVersionFloor';
import {
  asBrainCliVersion,
  type BrainCliVersion,
} from '@src/domain.operations/enroll/asBrainCliVersion';
import { isBrainCliVersionAtOrAboveFloor } from '@src/domain.operations/enroll/isBrainCliVersionAtOrAboveFloor';

/**
 * .what = the one claude-code version every real-brain journey runs against
 * .why = `@latest` let each vendor release change the brain under test between two runs of
 *   the same commit — a new model behind the `haiku` alias, new envelope keys, new /compact
 *   behavior — so a red run could not tell a rhachet defect from a vendor release. a pin
 *   makes the run reproducible; a bump is a deliberate commit, verified on its own
 * .note = keep in step with the global install in `.github/workflows/.test.yml`, which the
 *   PATH-based real-brain suites spawn
 */
const CLAUDE_CLI_VERSION_PINNED = '2.1.292';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * .what = the one claude-code install every real-brain journey shares, cached on disk
 * .why =
 *   - an install costs a minute and a network trip; per test it would dominate the run
 *   - the install holds no state — config, trust and transcripts live under HOME and
 *     CLAUDE_CONFIG_DIR — so one shared binary leaves each test's HOME fully isolated
 *
 * .note = the cache lives under the repo's `node_modules/.cache`, gitignored with the rest
 *   of `node_modules`. it is reinstalled only when absent or not the pinned version
 * .note = two jest workers may race a cold cache; each installs into its own temp prefix and
 *   renames it into place, so the loser's rename fails harmlessly and it reads the winner's
 */
const CACHE_DIR = resolve(
  __dirname,
  '../../..',
  'node_modules',
  '.cache',
  'rhachet.test.claude-cli',
);

const getCachedBinVersion = (input: {
  binPath: string;
}): BrainCliVersion | null => {
  if (!existsSync(input.binPath)) return null;
  const probe = spawnSync(input.binPath, ['--version'], {
    stdio: 'pipe',
    timeout: 30_000,
  });
  return asBrainCliVersion({ output: probe.stdout?.toString() ?? '' });
};

const isCachedBinFresh = (input: { binPath: string }): boolean => {
  const version = getCachedBinVersion(input);
  if (!version) return false;
  return (
    `${version.major}.${version.minor}.${version.patch}` ===
    CLAUDE_CLI_VERSION_PINNED
  );
};

/**
 * .what = the pnpm install command for claude-code into a prefix
 * .why = tests never use npm (rule.forbid.npm-in-tests); an absent pnpm fails fast
 *
 * .note = pnpm skips a dependency's postinstall unless allowed, and claude-code's postinstall
 *   lands its native binary; without the allow, the bin fails with "native binary not installed"
 */
const getClaudeCliInstallCommand = (input: {
  prefix: string;
}): [string, string[]] => {
  // pnpm is required; npm is never a fallback
  const isPnpmOnPath =
    spawnSync('pnpm', ['--version'], { stdio: 'pipe' }).status === 0;
  if (!isPnpmOnPath)
    throw new ConstraintError('pnpm is required to install the test claude-code', {
      hint: 'install pnpm: corepack enable pnpm (or see https://pnpm.io/installation)',
    });

  return [
    'pnpm',
    [
      'add',
      `@anthropic-ai/claude-code@${CLAUDE_CLI_VERSION_PINNED}`,
      '--dir',
      input.prefix,
      '--ignore-workspace',
      '--allow-build=@anthropic-ai/claude-code',
    ],
  ];
};

export const getCachedClaudeCliBin =(): { binDir: string; binPath: string } => {
  const binDir = join(CACHE_DIR, 'node_modules', '.bin');
  const binPath = join(binDir, 'claude');

  // a warm cache at or above the floor is reused as is
  if (isCachedBinFresh({ binPath })) return { binDir, binPath };

  // install into a private prefix, then rename it into place
  const prefix = `${CACHE_DIR}.${process.pid}.${Date.now()}`;
  mkdirSync(prefix, { recursive: true });
  writeFileSync(join(prefix, 'package.json'), '{"private":true}\n');
  const install = spawnSync(...getClaudeCliInstallCommand({ prefix }), {
    stdio: 'pipe',
    timeout: 600_000,
  });
  if (install.status !== 0)
    throw new ConstraintError('could not install claude-code into the test cache', {
      prefix,
      status: install.status,
      stderr: install.stderr?.toString().trim() ?? '',
      hint: 'check network access to the npm registry',
    });

  // a racer that already swapped a fresh cache in wins; ours is discarded
  if (isCachedBinFresh({ binPath })) {
    rmSync(prefix, { recursive: true, force: true });
    return { binDir, binPath };
  }

  // swap the fresh install in over a stale or absent cache
  rmSync(CACHE_DIR, { recursive: true, force: true });
  try {
    renameSync(prefix, CACHE_DIR);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOTEMPTY' && code !== 'EEXIST') throw error;
    rmSync(prefix, { recursive: true, force: true });
  }

  // the install must land the pinned version
  if (!isCachedBinFresh({ binPath }))
    throw new ConstraintError('the cached claude-code is not the pinned version', {
      binPath,
      version: getCachedBinVersion({ binPath }),
      pinned: CLAUDE_CLI_VERSION_PINNED,
    });

  // the pin must clear the enroll floor, or every enroll step refuses
  const version = getCachedBinVersion({ binPath });
  if (
    !version ||
    !isBrainCliVersionAtOrAboveFloor({ version, floor: BRAIN_CLI_VERSION_FLOOR })
  )
    throw new ConstraintError('the pinned claude-code is below the enroll floor', {
      pinned: CLAUDE_CLI_VERSION_PINNED,
      floor: BRAIN_CLI_VERSION_FLOOR,
      hint: 'bump CLAUDE_CLI_VERSION_PINNED in genIsolatedClaudeHome.ts',
    });
  return { binDir, binPath };
};

/**
 * .what = a temp HOME for one real-brain journey, beside the shared cached claude-code
 * .why =
 *   - the HOME is a temp dir, so the host's `~/.claude`, `~/.claude.json` and user-scope
 *     `CLAUDE.md` never reach the run
 *   - only the credential is shared: `.claude/.credentials.json` symlinks to the host's,
 *     so the brain can authenticate without a copy of the secret
 *
 * .note = an absent host credential with no ANTHROPIC_API_KEY fails loud; this tier never skips
 */
export const genIsolatedClaudeHome = (input: {
  slug: string;
}): { home: string; binDir: string; binPath: string } => {
  // the claude-code binary, shared across runs
  const { binDir, binPath } = getCachedClaudeCliBin();

  // the temp HOME and its claude config dir
  const home = genTempDir({ slug: input.slug });
  mkdirSync(join(home, '.claude'), { recursive: true });

  // the credential, shared by symlink
  const credsHost = join(homedir(), '.claude', '.credentials.json');
  if (!existsSync(credsHost) && !process.env.ANTHROPIC_API_KEY)
    throw new ConstraintError(
      'no claude credential to share into the isolated HOME',
      {
        expected: credsHost,
        hint: 'log in with `claude` on this host, or export ANTHROPIC_API_KEY (in ci: rhx keyrack unlock --owner ehmpath --env test)',
      },
    );
  if (existsSync(credsHost))
    symlinkSync(credsHost, join(home, '.claude', '.credentials.json'));

  // the first-run state a human who has used claude carries: onboard done, a theme, and
  // approval of the api key this run hands claude. enroll copies it into each brain dir
  // (D11); with none, a pty clone boots into the onboard login menu with no keyboard
  const apiKey = process.env.ANTHROPIC_API_KEY;
  writeFileSync(
    join(home, '.claude.json'),
    `${JSON.stringify(
      {
        hasCompletedOnboarding: true,
        theme: 'dark',
        ...(apiKey
          ? { customApiKeyResponses: { approved: [apiKey.slice(-20)], rejected: [] } }
          : {}),
      },
      null,
      2,
    )}\n`,
  );

  return { home, binDir, binPath };
};
