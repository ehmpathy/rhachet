import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getError, genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getRealClaudeOrThrow } from './enrollCloneHarness';
import { asSnapshotSafe } from './invokeRhachetCliBinary';

/**
 * .what = the tier-2 gate's refusals, driven against a stub `claude` and an isolated HOME
 * .why = every real-claude suite passes through `getRealClaudeOrThrow` before its first
 *   spawn, so its refusal is the whole experience of a seat with no credential (vision cells
 *   8, 9): a ConstraintError that names the fix, never a skip. the stub only prints a
 *   version, so no case here reaches a brain or bills a call
 */

/**
 * .what = a stub `claude` that prints one version and exits
 */
const genStubClaudeBin = (input: { dir: string; version: string }): string => {
  const binPath = join(input.dir, 'claude');
  writeFileSync(binPath, `#!/bin/sh\necho "${input.version} (Claude Code)"\n`);
  chmodSync(binPath, 0o755);
  return binPath;
};

/**
 * .what = run `fn` with the env keys set as given, then put them back
 * .why = the gate reads HOME and the credential keys at call time, from process.env
 */
const withEnv = <T>(envPatch: Record<string, string | undefined>, fn: () => T): T => {
  const envBefore = Object.fromEntries(
    Object.keys(envPatch).map((key) => [key, process.env[key]]),
  );
  const setAll = (patch: Record<string, string | undefined>): void =>
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  setAll(envPatch);
  try {
    return fn();
  } finally {
    setAll(envBefore);
  }
};

describe('getRealClaudeOrThrow', () => {
  given('[case1] a claude above the floor, and no credential of any kind', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'real-claude-gate-nocreds' });
      const home = join(dir, 'home');
      mkdirSync(home, { recursive: true });
      const binPath = genStubClaudeBin({ dir, version: '9.9.9' });
      return { home, binPath };
    });

    when('[t0] the gate is asked for a real claude', () => {
      // .note = useBeforeAll hands back a proxy over a Record, so the error rides fields
      const refusal = useBeforeAll(async () => {
        const error = await getError(() =>
          withEnv(
            {
              HOME: scene.home,
              RHACHET_REAL_CLAUDE_BIN: scene.binPath,
              ANTHROPIC_API_KEY: undefined,
              CLAUDE_CODE_OAUTH_TOKEN: undefined,
            },
            () => getRealClaudeOrThrow(),
          ),
        );
        return { className: error.constructor.name, message: error.message };
      });

      then('it refuses with a ConstraintError, never a skip', () => {
        expect(refusal.className).toEqual('ConstraintError');
      });

      then('the fix names the keyrack unlock', () => {
        expect(refusal.message).toContain('rhx keyrack unlock --owner ehmpath --env test');
      });

      then('the fix names the interactive login', () => {
        expect(refusal.message).toContain('`/login`');
      });

      then('the fix never tells the seat to export an api key', () => {
        expect(refusal.message).not.toContain('export ANTHROPIC_API_KEY');
      });

      then('the refusal renders as snapped', () => {
        expect(asSnapshotSafe(refusal.message)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a claude above the floor, with a login file in HOME', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'real-claude-gate-login' });
      const home = join(dir, 'home');
      mkdirSync(join(home, '.claude'), { recursive: true });
      writeFileSync(join(home, '.claude', '.credentials.json'), '{}');
      const binPath = genStubClaudeBin({ dir, version: '9.9.9' });
      return { dir, home, binPath };
    });

    when('[t0] the gate is asked for a real claude', () => {
      const found = useBeforeAll(async () =>
        withEnv(
          {
            HOME: scene.home,
            RHACHET_REAL_CLAUDE_BIN: scene.binPath,
            ANTHROPIC_API_KEY: undefined,
            CLAUDE_CODE_OAUTH_TOKEN: undefined,
          },
          () => getRealClaudeOrThrow(),
        ),
      );

      then('it hands back the bin', () => {
        expect(found.binPath).toEqual(scene.binPath);
      });

      then('it hands back the dir of the bin', () => {
        expect(found.binDir).toEqual(scene.dir);
      });
    });
  });

  given('[case4] a claude above the floor, with a DEAD login file in HOME', () => {
    // .note = the dead-token clear: claude-code keeps the file and empties its refresh token
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'real-claude-gate-deadlogin' });
      const home = join(dir, 'home');
      mkdirSync(join(home, '.claude'), { recursive: true });
      writeFileSync(
        join(home, '.claude', '.credentials.json'),
        JSON.stringify({ claudeAiOauth: { refreshToken: '' } }),
      );
      const binPath = genStubClaudeBin({ dir, version: '9.9.9' });
      return { home, binPath };
    });

    when('[t0] the gate is asked for a real claude', () => {
      const refusal = useBeforeAll(async () => {
        const error = await getError(() =>
          withEnv(
            {
              HOME: scene.home,
              RHACHET_REAL_CLAUDE_BIN: scene.binPath,
              ANTHROPIC_API_KEY: undefined,
              CLAUDE_CODE_OAUTH_TOKEN: undefined,
            },
            () => getRealClaudeOrThrow(),
          ),
        );
        return { className: error.constructor.name, message: error.message };
      });

      then('it refuses up front with a ConstraintError', () => {
        expect(refusal.className).toEqual('ConstraintError');
      });

      then('it says the seat is not authenticated, since a dead login is no auth', () => {
        expect(refusal.message).toContain('not authenticated');
      });

      then('the refusal renders as snapped', () => {
        expect(asSnapshotSafe(refusal.message)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a claude below the floor', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'real-claude-gate-old' });
      const binPath = genStubClaudeBin({ dir, version: '0.0.1' });
      return { binPath };
    });

    when('[t0] the gate is asked for a real claude', () => {
      const refusal = useBeforeAll(async () => {
        const error = await getError(() =>
          withEnv({ RHACHET_REAL_CLAUDE_BIN: scene.binPath }, () =>
            getRealClaudeOrThrow(),
          ),
        );
        return { className: error.constructor.name, message: error.message };
      });

      then('it refuses with a ConstraintError', () => {
        expect(refusal.className).toEqual('ConstraintError');
      });

      then('it names the version it found', () => {
        expect(refusal.message).toContain('=0.0.1');
      });

      then('it names the env var that points at another bin', () => {
        expect(refusal.message).toContain('RHACHET_REAL_CLAUDE_BIN');
      });

      then('the refusal renders as snapped', () => {
        expect(asSnapshotSafe(refusal.message)).toMatchSnapshot();
      });
    });
  });
});
