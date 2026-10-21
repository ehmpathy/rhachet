import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useThen, when } from 'test-fns';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { withCloneSpawnDepthScope } from './withCloneSpawnDepthScope';

/**
 * .what = the env a repl child reads, and the refusal of a reviewer caller
 * .why = this is the second spawn door; a review brain must carry its depth and the leaf
 *   mark, carry no parent serial, and a reviewer caller's review must be refused before
 *   any brain runs (#577)
 *
 * .note = the caller's tty is pinned to "none" so the case reads the depth var, as a
 *   brain's tool shell does, whatever terminal runs the suite
 */
describe('withCloneSpawnDepthScope', () => {
  const ttyBefore = process.stdin.isTTY;
  const envBefore = { ...process.env };
  const setCaller = (input: {
    depth: string | undefined;
    leaf?: string;
  }): void => {
    delete process.env[CLONE_ENV_KEYS.depth];
    delete process.env[CLONE_ENV_KEYS.leaf];
    if (input.depth !== undefined)
      process.env[CLONE_ENV_KEYS.depth] = input.depth;
    if (input.leaf !== undefined) process.env[CLONE_ENV_KEYS.leaf] = input.leaf;
    process.env[CLONE_ENV_KEYS.serial] = 'serial-parent';
    process.env[CLONE_ENV_KEYS.socket] = '/tmp/socket-parent';
  };
  const readScoped = (): Record<string, string | undefined> => ({
    depth: process.env[CLONE_ENV_KEYS.depth],
    leaf: process.env[CLONE_ENV_KEYS.leaf],
    serial: process.env[CLONE_ENV_KEYS.serial],
    socket: process.env[CLONE_ENV_KEYS.socket],
  });
  beforeAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });
  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: ttyBefore,
      configurable: true,
    });
    for (const key of [
      CLONE_ENV_KEYS.depth,
      CLONE_ENV_KEYS.leaf,
      CLONE_ENV_KEYS.serial,
      CLONE_ENV_KEYS.socket,
    ]) {
      delete process.env[key];
      if (envBefore[key] !== undefined) process.env[key] = envBefore[key];
    }
  });

  given('[case1] a caller at depth 0', () => {
    when('[t0] it runs a repl call', () => {
      const result = useThen('it runs', async () => {
        setCaller({ depth: '0' });
        const inside = await withCloneSpawnDepthScope(async () => readScoped());
        return { inside, after: readScoped() };
      });

      then('the child reads depth 1', () => {
        expect(result.inside.depth).toEqual('1');
      });

      then(
        'the child carries the leaf mark — a review brain is a reviewer',
        () => {
          expect(result.inside.leaf).toEqual('1');
        },
      );

      then('the child carries no parent serial or socket', () => {
        expect(result.inside.serial).toBeUndefined();
        expect(result.inside.socket).toBeUndefined();
      });

      then('the caller env is restored after the call', () => {
        expect(result.after).toEqual({
          depth: '0',
          leaf: undefined,
          serial: 'serial-parent',
          socket: '/tmp/socket-parent',
        });
      });
    });

    when('[t1] it runs two repl calls in parallel', () => {
      const result = useThen('both run', async () => {
        setCaller({ depth: '0' });
        const release: { first: () => void } = { first: () => undefined };
        const first = withCloneSpawnDepthScope(
          () =>
            new Promise<Record<string, string | undefined>>((done) => {
              release.first = () => done(readScoped());
            }),
        );
        // the second starts while the first holds the scope open
        const second = await withCloneSpawnDepthScope(async () => readScoped());
        const midway = readScoped();
        release.first();
        return { first: await first, second, midway, after: readScoped() };
      });

      then(
        '🔴 the second call is not refused — it skips the read of the leaf mark its peer set',
        () => {
          expect(result.second.depth).toEqual('1');
          expect(result.second.leaf).toEqual('1');
        },
      );

      then('the env stays scoped until the last call returns', () => {
        expect(result.midway.depth).toEqual('1');
        expect(result.first.depth).toEqual('1');
      });

      then('the caller env is restored after the last call', () => {
        expect(result.after.depth).toEqual('0');
        expect(result.after.leaf).toBeUndefined();
        expect(result.after.serial).toEqual('serial-parent');
      });
    });
  });

  given('[case2] a caller with no depth var', () => {
    when('[t0] it runs a repl call', () => {
      const result = useThen('it runs', async () => {
        setCaller({ depth: undefined });
        const inside = await withCloneSpawnDepthScope(async () => readScoped());
        return { inside, after: readScoped() };
      });

      then('it reads as a depth-0 caller; the child reads depth 1', () => {
        expect(result.inside.depth).toEqual('1');
      });

      then('the absent var is absent again after the call', () => {
        expect(result.after.depth).toBeUndefined();
      });
    });

    when('[t1] it runs two repl calls in parallel', () => {
      // 🔴 case=3 [t3], a raw `claude`'s parallel reviews: the first call's open scope sets the
      //   leaf mark, so a peer that re-read the env would be refused. the peer must use the
      //   held scope, and the last call out must restore the var to absent, never to '0'
      const result = useThen('both run', async () => {
        setCaller({ depth: undefined });
        const release: { first: () => void } = { first: () => undefined };
        const first = withCloneSpawnDepthScope(
          () =>
            new Promise<Record<string, string | undefined>>((done) => {
              release.first = () => done(readScoped());
            }),
        );
        const second = await withCloneSpawnDepthScope(async () => readScoped());
        release.first();
        return { first: await first, second, after: readScoped() };
      });

      then(
        '🔴 the second call is not refused — both children read depth 1',
        () => {
          expect(result.second.depth).toEqual('1');
          expect(result.first.depth).toEqual('1');
        },
      );

      then('the absent var is absent again after the last call', () => {
        expect(result.after.depth).toBeUndefined();
        expect(result.after.serial).toEqual('serial-parent');
      });
    });
  });

  given(
    '[case3] a work clone at depth 1 — a driver a human enrolled with no tty',
    () => {
      // 🔴 the #577 defect: under the old absolute cap a depth-1 driver could run no review.
      //   every work clone may spawn one level deeper, at any depth
      when('[t0] it runs a repl call', () => {
        const result = useThen('it runs', async () => {
          setCaller({ depth: '1' });
          const inside = await withCloneSpawnDepthScope(async () =>
            readScoped(),
          );
          return { inside, after: readScoped() };
        });

        then('it is not refused — the child reads depth 2, as a leaf', () => {
          expect(result.inside.depth).toEqual('2');
          expect(result.inside.leaf).toEqual('1');
        });

        then('the caller env is restored after the call', () => {
          expect(result.after.depth).toEqual('1');
          expect(result.after.leaf).toBeUndefined();
        });
      });
    },
  );

  given('[case3b] a reviewer caller — it carries the leaf mark', () => {
    when('[t0] it runs a repl call', () => {
      const result = useThen('it is refused', async () => {
        setCaller({ depth: '1', leaf: '1' });
        const calls = { count: 0 };
        const error = await getError(
          withCloneSpawnDepthScope(async () => {
            calls.count += 1;
          }),
        );
        return {
          isConstraint: error instanceof ConstraintError,
          message: error.message,
          calls: calls.count,
          after: readScoped(),
        };
      });

      then('it is refused as a constraint that names the reviewer', () => {
        expect(result.isConstraint).toEqual(true);
        expect(result.message).toContain('a reviewer clone may not spawn');
      });

      then('the refusal renders whole, for review', () => {
        expect(result.message).toMatchSnapshot();
      });

      then('no brain runs', () => {
        expect(result.calls).toEqual(0);
      });

      then('the caller env is untouched', () => {
        expect(result.after.depth).toEqual('1');
        expect(result.after.leaf).toEqual('1');
        expect(result.after.serial).toEqual('serial-parent');
      });
    });
  });

  given('[case4] a caller at depth 0 whose repl call throws', () => {
    // 🔴 a brain call that fails must still close the scope. a scope left open would hold
    //   the leaf mark in the top-level clone's own env, so its next spawn would be refused
    //   as a reviewer's — the worst failure the bound has
    when('[t0] the call throws, then a second call runs', () => {
      const result = useThen('the throw surfaces', async () => {
        setCaller({ depth: '0' });
        const error = await getError(
          withCloneSpawnDepthScope(async () => {
            throw new MalfunctionError('brain malfunction');
          }),
        );
        const afterThrow = readScoped();
        const insideNext = await withCloneSpawnDepthScope(async () =>
          readScoped(),
        );
        return { message: error.message, afterThrow, insideNext };
      });

      then('the logic error surfaces as is', () => {
        expect(result.message).toContain('brain malfunction');
      });

      then('the caller env is restored after the throw', () => {
        expect(result.afterThrow).toEqual({
          depth: '0',
          leaf: undefined,
          serial: 'serial-parent',
          socket: '/tmp/socket-parent',
        });
      });

      then('the next call reads a fresh depth 1, never a held 2', () => {
        expect(result.insideNext.depth).toEqual('1');
      });
    });
  });

  given('[case5] a caller at a tty with an inherited leaf mark', () => {
    // 🔴 a tty that carries the leaf mark is a pty a reviewer opened with its env kept (a
    //   pty wrap such as `unbuffer`). a reviewer may not reach a brain through a fresh pty
    when('[t0] it runs a repl call', () => {
      const result = useThen('it is refused', async () => {
        setCaller({ depth: '1', leaf: '1' });
        Object.defineProperty(process.stdin, 'isTTY', {
          value: true,
          configurable: true,
        });
        try {
          const calls = { count: 0 };
          const error = await getError(
            withCloneSpawnDepthScope(async () => {
              calls.count += 1;
              return readScoped();
            }),
          );
          return { error, calls: calls.count, after: readScoped() };
        } finally {
          Object.defineProperty(process.stdin, 'isTTY', {
            value: false,
            configurable: true,
          });
        }
      });

      then(
        'the call is refused as a constraint: a pty wrap is no reset',
        () => {
          expect(result.error).toBeInstanceOf(ConstraintError);
          expect(result.error.message).toContain(
            'a reviewer clone may not spawn',
          );
        },
      );

      then('no brain runs', () => {
        expect(result.calls).toEqual(0);
      });

      then('the caller env is untouched', () => {
        expect(result.after.depth).toEqual('1');
        expect(result.after.serial).toEqual('serial-parent');
      });
    });
  });

  given('[case6] two copies of the module loaded in one process', () => {
    // 🔴 a global `rhx` beside a local `rhachet/brains` loads the module twice. the env is
    //   one per process, so the two copies must share one scope: a copy with its own state
    //   would re-read the leaf mark its peer set, and refuse a work clone's second review
    when('[t0] copy B runs a call while copy A holds the scope open', () => {
      const result = useThen('both run', async () => {
        setCaller({ depth: '0' });
        const copyB = ((): typeof import('./withCloneSpawnDepthScope') => {
          const holder: {
            mod: typeof import('./withCloneSpawnDepthScope') | null;
          } = { mod: null };
          jest.isolateModules(() => {
            holder.mod = require('./withCloneSpawnDepthScope');
          });
          if (!holder.mod) throw new MalfunctionError('copy B did not load');
          return holder.mod;
        })();
        const release: { first: () => void } = { first: () => undefined };
        const first = withCloneSpawnDepthScope(
          () =>
            new Promise<Record<string, string | undefined>>((done) => {
              release.first = () => done(readScoped());
            }),
        );
        // one call through copy B, its value or its refusal kept as data
        const second = await copyB
          .withCloneSpawnDepthScope(async () => readScoped())
          .then(
            (value) => ({ value, error: null }),
            (error: Error) => ({ value: null, error }),
          );
        release.first();
        await first;
        return {
          isCopyDistinct:
            copyB.withCloneSpawnDepthScope !== withCloneSpawnDepthScope,
          second,
          after: readScoped(),
        };
      });

      then('copy B is a distinct module instance', () => {
        expect(result.isCopyDistinct).toEqual(true);
      });

      then('🔴 copy B uses the held depth, never refused', () => {
        expect(result.second.error).toBeNull();
        expect(result.second.value?.depth).toEqual('1');
      });

      then('the caller env is restored after both close', () => {
        expect(result.after.depth).toEqual('0');
        expect(result.after.serial).toEqual('serial-parent');
      });
    });
  });
});
