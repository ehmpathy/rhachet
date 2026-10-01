import { MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, useThen, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  renameSync,
  rmdirSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { join } from 'node:path';
import { withBrainAuthWriteLock } from './withBrainAuthWriteLock';

/**
 * .what = a fake ~/.claude dir, with the path of its login and of claude-code's write lock
 */
const genScene = (input: { slug: string }) => {
  const claudeDir = join(genTempDir({ slug: input.slug }), '.claude');
  mkdirSync(claudeDir, { recursive: true });
  return {
    brainAuthPath: join(claudeDir, '.credentials.json'),
    lockPath: join(claudeDir, '.storage-write.lock'),
  };
};

describe('withBrainAuthWriteLock', () => {
  given('[case1] no holder of the lock', () => {
    const scene = genScene({ slug: 'brain-auth-lock-free' });

    when('[t0] a procedure runs under the lock', () => {
      const result = useThen('it runs', async () => {
        // .note = deliberate mutation: the holder captures a read from inside the closure
        const heldWithin = { value: false };
        const returned = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          () => {
            heldWithin.value = existsSync(scene.lockPath);
            return 'done';
          },
        );
        return { returned, heldWithin: heldWithin.value };
      });

      then("it holds claude-code's lock dir while the procedure runs", () => {
        expect(result.heldWithin).toBe(true);
      });

      then("it returns the procedure's result", () => {
        expect(result.returned).toEqual('done');
      });

      then('it releases the lock after', () => {
        expect(existsSync(scene.lockPath)).toBe(false);
      });
    });

    when('[t1] the procedure throws', () => {
      const result = useThen('it runs', async () => {
        const error = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          () => {
            throw new Error('procedure fault');
          },
        ).catch((thrown: unknown) => thrown);
        return { error };
      });

      then('the error surfaces', () => {
        expect(result.error).toBeInstanceOf(Error);
      });

      then('the lock is still released', () => {
        expect(existsSync(scene.lockPath)).toBe(false);
      });
    });
  });

  given('[case2] a live holder that releases after a short hold', () => {
    const scene = genScene({ slug: 'brain-auth-lock-held' });

    when('[t0] a procedure asks for the lock', () => {
      const result = useThen('it runs', async () => {
        mkdirSync(scene.lockPath);
        // .note = deliberate mutation: the holder marks its release, so the order is read
        //   from a marker rather than from wall-clock times
        const released = { value: false };
        setTimeout(() => {
          released.value = true;
          rmdirSync(scene.lockPath);
        }, 300);
        const ranAfterRelease = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          () => released.value,
        );
        return { ranAfterRelease };
      });

      then('it waits for the holder, then runs', () => {
        expect(result.ranAfterRelease).toBe(true);
      });

      then('it releases the lock after', () => {
        expect(existsSync(scene.lockPath)).toBe(false);
      });
    });
  });

  given('[case3] a stale lock left by a holder that died', () => {
    const scene = genScene({ slug: 'brain-auth-lock-stale' });

    when('[t0] a procedure asks for the lock', () => {
      const result = useThen('it runs', async () => {
        mkdirSync(scene.lockPath);
        const longAgo = new Date(Date.now() - 60_000);
        utimesSync(scene.lockPath, longAgo, longAgo);
        const returned = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          () => 'ran',
        );
        return { returned };
      });

      then('it clears the stale lock and runs', () => {
        expect(result.returned).toEqual('ran');
      });

      then('it releases the lock after', () => {
        expect(existsSync(scene.lockPath)).toBe(false);
      });
    });
  });

  given('[case4] a peer reclaims the lock while the procedure runs', () => {
    const scene = genScene({ slug: 'brain-auth-lock-reclaimed' });

    when('[t0] the peer swaps in its own fresh lock dir', () => {
      const result = useThen('it runs', async () => {
        const returned = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          () => {
            // the peer makes its dir first, so its inode differs from ours
            const peerDir = `${scene.lockPath}.peer`;
            mkdirSync(peerDir);
            rmdirSync(scene.lockPath);
            renameSync(peerDir, scene.lockPath);
            return 'ran';
          },
        );
        const peerLockKept = existsSync(scene.lockPath);
        rmdirSync(scene.lockPath);
        return { returned, peerLockKept };
      });

      then("it returns the procedure's result", () => {
        expect(result.returned).toEqual('ran');
      });

      then("the release leaves the peer's lock in place", () => {
        expect(result.peerLockKept).toBe(true);
      });
    });
  });

  given('[case6] a procedure that holds the lock past a refresh', () => {
    const scene = genScene({ slug: 'brain-auth-lock-slow' });

    when('[t0] the lock ages toward stale while the procedure runs', () => {
      const result = useThen('it runs', async () => {
        const returned = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          async () => {
            // age the held lock past the stale bound, then outlast one refresh
            const longAgo = new Date(Date.now() - 60_000);
            utimesSync(scene.lockPath, longAgo, longAgo);
            await new Promise((done) => setTimeout(done, 5_500));
            return { lockAgeMs: Date.now() - statSync(scene.lockPath).mtimeMs };
          },
        );
        return { returned };
      });

      then('the lock was refreshed, so no peer would judge it stale', () => {
        expect(result.returned.lockAgeMs).toBeLessThan(15_000);
      });

      then('it releases the lock after', () => {
        expect(existsSync(scene.lockPath)).toBe(false);
      });
    });
  });

  given('[case5] the lock dir is gone before the release', () => {
    const scene = genScene({ slug: 'brain-auth-lock-gone' });

    when('[t0] the procedure ends after the lock dir was removed', () => {
      const result = useThen('it runs', async () => {
        const returned = await withBrainAuthWriteLock(
          { brainAuthPath: scene.brainAuthPath },
          () => {
            rmdirSync(scene.lockPath);
            return 'ran';
          },
        );
        return { returned };
      });

      then('the release is a no-op, not an error', () => {
        expect(result.returned).toEqual('ran');
        expect(existsSync(scene.lockPath)).toBe(false);
      });
    });

    when(
      '[t1] the lock dir is removed, then the procedure outlasts a refresh',
      () => {
        const result = useThen('it runs', async () => {
          const returned = await withBrainAuthWriteLock(
            { brainAuthPath: scene.brainAuthPath },
            async () => {
              rmdirSync(scene.lockPath);
              await new Promise((done) => setTimeout(done, 5_500));
              return 'ran';
            },
          );
          return { returned };
        });

        then(
          'the refresh skips the absent lock, and the procedure completes',
          () => {
            expect(result.returned).toEqual('ran');
            expect(existsSync(scene.lockPath)).toBe(false);
          },
        );
      },
    );
  });

  given('[case7] a live holder that never releases', () => {
    const scene = genScene({ slug: 'brain-auth-lock-kept' });

    when('[t0] a procedure asks for the lock past the wait', () => {
      const result = useThen('it runs', async () => {
        // the holder keeps its lock fresh, so it never reads as stale
        mkdirSync(scene.lockPath);
        const holder = setInterval(() => {
          const now = new Date();
          utimesSync(scene.lockPath, now, now);
        }, 2_000);

        // .note = deliberate mutation: the procedure marks whether it ran
        const ran = { value: false };
        const error = await getError(
          withBrainAuthWriteLock({ brainAuthPath: scene.brainAuthPath }, () => {
            ran.value = true;
          }),
        );
        clearInterval(holder);
        const holderLockKept = existsSync(scene.lockPath);
        rmdirSync(scene.lockPath);
        return { error, ran: ran.value, holderLockKept };
      });

      then('it throws a MalfunctionError', () => {
        expect(result.error).toBeInstanceOf(MalfunctionError);
      });

      then('the procedure never runs', () => {
        expect(result.ran).toBe(false);
      });

      then("the holder's lock is left in place", () => {
        expect(result.holderLockKept).toBe(true);
      });

      then('the error names the lock and the fix', () => {
        expect(
          result.error.message.split(scene.lockPath).join('$LOCK_PATH'),
        ).toMatchSnapshot();
      });
    });
  });
});
