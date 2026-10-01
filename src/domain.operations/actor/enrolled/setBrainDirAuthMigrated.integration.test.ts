import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleBrainAuth } from '@src/.test/assets/genSampleBrainAuth';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setBrainDirAuthMigrated } from './setBrainDirAuthMigrated';

/**
 * .what = the expiry a fake login records — how a test tells which login landed
 */
const readExpiresAt = (input: { path: string }): number => {
  const parsed: { claudeAiOauth: { expiresAt: number } } = JSON.parse(
    readFileSync(input.path, 'utf-8'),
  );
  return parsed.claudeAiOauth.expiresAt;
};

/**
 * .what = lay out a fake HOME login and a fake actor brain dir
 */
const genScene = (input: { slug: string }) => {
  const home = genTempDir({ slug: `${input.slug}-home` });
  mkdirSync(join(home, '.claude'), { recursive: true });
  const brainAuthPath = join(home, '.claude', '.credentials.json');
  const brainDir = genTempDir({ slug: `${input.slug}-brain` });
  const brainDirAuthPath = join(brainDir, '.credentials.json');
  return { brainAuthPath, brainDir, brainDirAuthPath };
};

describe('setBrainDirAuthMigrated', () => {
  given('[case1] a brain dir with no login of its own', () => {
    when('[t0] the migration runs', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-none' });
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          {
            getLiveCount: () => {
              throw new MalfunctionError(
                'the live probe must not run with no leftover',
                { brainDir: layout.brainDir },
              );
            },
          },
        );
        return { ...layout, result };
      });

      then('the outcome is none, and no live probe ran', () => {
        expect(scene.result.outcome).toEqual('none');
      });
    });
  });

  given('[case2] a 1.48.0 symlink to the shared login', () => {
    when('[t0] a clone of the actor still lives', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-link-live' });
        writeFileSync(
          layout.brainAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 5 }),
        );
        symlinkSync(layout.brainAuthPath, layout.brainDirAuthPath);
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          { getLiveCount: async () => 3 },
        );
        return { ...layout, result };
      });

      then('the symlink is kept, with the live count', () => {
        expect(scene.result.outcome).toEqual('kept');
        expect(scene.result.liveCount).toEqual(3);
        expect(lstatSync(scene.brainDirAuthPath).isSymbolicLink()).toBe(true);
      });
    });

    when('[t1] no clone of the actor lives', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-link-dead' });
        writeFileSync(
          layout.brainAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 5 }),
        );
        symlinkSync(layout.brainAuthPath, layout.brainDirAuthPath);
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          { getLiveCount: async () => 0 },
        );
        return { ...layout, result };
      });

      then('the symlink is removed', () => {
        expect(scene.result.outcome).toEqual('removed');
        expect(existsSync(scene.brainDirAuthPath)).toBe(false);
      });

      then('the shared login it pointed at is untouched', () => {
        expect(readExpiresAt({ path: scene.brainAuthPath })).toEqual(5);
      });
    });
  });

  given('[case3] a live brain-dir login, and a dead shared one', () => {
    when('[t0] no clone of the actor lives', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-adopt' });
        writeFileSync(
          layout.brainAuthPath,
          genSampleBrainAuth({ state: 'dead', expiresAt: 0 }),
        );
        writeFileSync(
          layout.brainDirAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 9000 }),
          { mode: 0o600 },
        );
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          { getLiveCount: async () => 0 },
        );
        return { ...layout, result };
      });

      then('the login is adopted into the shared store', () => {
        expect(scene.result.outcome).toEqual('adopted');
        expect(readExpiresAt({ path: scene.brainAuthPath })).toEqual(9000);
      });

      then('the shared login is mode 0600', () => {
        expect(statSync(scene.brainAuthPath).mode & 0o777).toEqual(0o600);
      });

      then('the brain dir holds no login of its own', () => {
        expect(existsSync(scene.brainDirAuthPath)).toBe(false);
      });
    });
  });

  given('[case4] a live brain-dir login older than the live shared one', () => {
    when('[t0] no clone of the actor lives', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-older' });
        writeFileSync(
          layout.brainAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 9000 }),
        );
        writeFileSync(
          layout.brainDirAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 5 }),
        );
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          { getLiveCount: async () => 0 },
        );
        return { ...layout, result };
      });

      then('it is removed, never adopted', () => {
        expect(scene.result.outcome).toEqual('removed');
        expect(readExpiresAt({ path: scene.brainAuthPath })).toEqual(9000);
        expect(existsSync(scene.brainDirAuthPath)).toBe(false);
      });
    });
  });

  given('[case5] a live brain-dir login NEWER than the live shared one', () => {
    when('[t0] no clone of the actor lives', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-newer-vs-live' });
        writeFileSync(
          layout.brainAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 5 }),
        );
        writeFileSync(
          layout.brainDirAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 9000 }),
        );
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          { getLiveCount: async () => 0 },
        );
        return { ...layout, result };
      });

      then(
        'it is removed, never adopted — a peer may refresh the live shared login',
        () => {
          expect(scene.result.outcome).toEqual('removed');
          expect(readExpiresAt({ path: scene.brainAuthPath })).toEqual(5);
          expect(existsSync(scene.brainDirAuthPath)).toBe(false);
        },
      );
    });
  });

  given('[case6] a live brain-dir login, and no shared one', () => {
    when('[t0] no clone of the actor lives', () => {
      const scene = useBeforeAll(async () => {
        const layout = genScene({ slug: 'migrate-adopt-absent' });
        writeFileSync(
          layout.brainDirAuthPath,
          genSampleBrainAuth({ state: 'live', expiresAt: 9000 }),
        );
        const result = await setBrainDirAuthMigrated(
          { brainDir: layout.brainDir, brainAuthPath: layout.brainAuthPath },
          { getLiveCount: async () => 0 },
        );
        return { ...layout, result };
      });

      then('the login is adopted into the shared store', () => {
        expect(scene.result.outcome).toEqual('adopted');
        expect(readExpiresAt({ path: scene.brainAuthPath })).toEqual(9000);
        expect(existsSync(scene.brainDirAuthPath)).toBe(false);
      });
    });
  });
});
