import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useThen, when } from 'test-fns';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { withCloneSpawnDepthScope } from './withCloneSpawnDepthScope';

/**
 * .what = the env a repl child reads, and the refusal past the limit
 * .why = this is the second spawn door; a review brain must carry depth 1, carry no
 *   parent serial, and a depth-1 caller's review must be refused before any brain runs
 *
 * .note = the caller's tty is pinned to "none" so the case reads the depth var, as a
 *   brain's tool shell does, whatever terminal runs the suite
 */
describe('withCloneSpawnDepthScope', () => {
  const ttyBefore = process.stdin.isTTY;
  const envBefore = { ...process.env };
  const setCaller = (input: { depth: string | undefined }): void => {
    delete process.env[CLONE_ENV_KEYS.depth];
    if (input.depth !== undefined)
      process.env[CLONE_ENV_KEYS.depth] = input.depth;
    process.env[CLONE_ENV_KEYS.serial] = 'serial-parent';
    process.env[CLONE_ENV_KEYS.socket] = '/tmp/socket-parent';
  };
  const readScoped = (): Record<string, string | undefined> => ({
    depth: process.env[CLONE_ENV_KEYS.depth],
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

      then('the child carries no parent serial or socket', () => {
        expect(result.inside.serial).toBeUndefined();
        expect(result.inside.socket).toBeUndefined();
      });

      then('the caller env is restored after the call', () => {
        expect(result.after).toEqual({
          depth: '0',
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

      then('🔴 the second call is not refused — it uses the held depth', () => {
        expect(result.second.depth).toEqual('1');
      });

      then('the env stays scoped until the last call returns', () => {
        expect(result.midway.depth).toEqual('1');
        expect(result.first.depth).toEqual('1');
      });

      then('the caller env is restored after the last call', () => {
        expect(result.after.depth).toEqual('0');
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
  });

  given('[case3] a caller at depth 1', () => {
    when('[t0] it runs a repl call', () => {
      const result = useThen('it is refused', async () => {
        setCaller({ depth: '1' });
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

      then('it is refused as a constraint that names the limit', () => {
        expect(result.isConstraint).toEqual(true);
        expect(result.message).toContain('clone spawn depth limit reached');
      });

      then('the refusal renders whole, for review', () => {
        expect(result.message).toMatchSnapshot();
      });

      then('no brain runs', () => {
        expect(result.calls).toEqual(0);
      });

      then('the caller env is untouched', () => {
        expect(result.after.depth).toEqual('1');
        expect(result.after.serial).toEqual('serial-parent');
      });
    });
  });

  given('[case4] a caller at depth 0 whose repl call throws', () => {
    // 🔴 a brain call that fails must still close the scope. a scope left open would hold
    //   depth 1 in the top-level clone's own env, so its next no-tty spawn would mint
    //   depth 2 and be refused — the worst failure the limit has
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
          serial: 'serial-parent',
          socket: '/tmp/socket-parent',
        });
      });

      then('the next call reads a fresh depth 1, never a held 2', () => {
        expect(result.insideNext.depth).toEqual('1');
      });
    });
  });

  given('[case5] a caller at a tty with an inherited depth 1 var', () => {
    // 🔴 a tty that carries a depth var is a pty a clone opened (a tmux window, a pty
    //   wrap that keeps the env), so it reads that var + 1, as a no-tty call does
    //   (fulcrum F13). a depth-1 clone may not reach a brain through a fresh pty
    when('[t0] it runs a repl call', () => {
      const result = useThen('it is refused', async () => {
        setCaller({ depth: '1' });
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
            'clone spawn depth limit reached',
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
});
