import { MalfunctionError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { spawnSync } from 'node:child_process';
import { asBrainReplWithContextBound } from './asBrainReplWithContextBound';

/**
 * .what = the repl door across a real process boundary: a supplier that spawns its brain
 *   as a child process, with no `env` option, hands that child the scoped depth
 * .why = every installed repl supplier spawns its brain this way (Q5: the agent-sdk
 *   `query()` and codex `exec` both inherit `process.env` at spawn). the unit test pins the
 *   in-process read; this pins that the scope still holds when the os copies the env into
 *   a child, which is where a reviewer's own `rhx enroll` would run
 *
 * .note = the caller's tty is pinned to "none" so the case reads the depth var, as a
 *   brain's tool shell does, whatever terminal runs the suite
 * .note = the spawn names `env: process.env`, node's own default. under jest the test's
 *   process.env is a sandbox copy, and a bare spawn would read the runner's env instead
 */
describe('asBrainReplWithContextBound.integration', () => {
  const ttyBefore = process.stdin.isTTY;
  const envBefore = { ...process.env };
  const keys = [
    CLONE_ENV_KEYS.depth,
    CLONE_ENV_KEYS.leaf,
    CLONE_ENV_KEYS.serial,
    CLONE_ENV_KEYS.socket,
  ];
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
    for (const key of keys) {
      delete process.env[key];
      if (envBefore[key] !== undefined) process.env[key] = envBefore[key];
    }
  });

  // a supplier stub that spawns a real child, as the installed suppliers do
  const genSpawnerRepl = () => {
    const mocked = genMockedBrainRepl();
    const seen: Array<{ depth: string; leaf: string; serial: string }> = [];
    const readChildEnv = () => {
      const child = spawnSync(
        process.execPath,
        [
          '-e',
          `process.stdout.write(JSON.stringify({ depth: process.env.${CLONE_ENV_KEYS.depth} ?? '', leaf: process.env.${CLONE_ENV_KEYS.leaf} ?? '', serial: process.env.${CLONE_ENV_KEYS.serial} ?? '' }))`,
        ],
        // node's default is `env: process.env`; jest hands a test file a copy of
        // process.env that node's child_process never sees, so the default is spelled out
        { encoding: 'utf8', env: process.env },
      );

      // a child that failed names its own cause, never a json parse error
      if (child.error || child.status !== 0)
        throw new MalfunctionError('the env-reader child did not exit clean', {
          status: child.status,
          stderr: child.stderr,
          error: child.error?.message ?? null,
          hint: 'a spawn error means node could not launch; a nonzero status means the -e program threw. read stderr, then re-run the integration tier',
        });
      seen.push(JSON.parse(child.stdout));
    };
    const brain = new BrainRepl({
      repo: mocked.repo,
      slug: mocked.slug,
      description: mocked.description,
      spec: mocked.spec,
      ask: async (input, context) => {
        readChildEnv();
        return mocked.ask(input, context);
      },
      act: async (input, context) => {
        readChildEnv();
        return mocked.act(input, context);
      },
    });
    return { brain: asBrainReplWithContextBound(brain, {}), seen };
  };
  const replInput = {
    role: {},
    prompt: 'review this',
    schema: { output: z.object({ content: z.string() }) },
  };

  given('[case1] a caller at depth 0 whose supplier spawns a child', () => {
    when('[t0] it calls ask, then act', () => {
      const result = useThen('both calls run', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '0';
        process.env[CLONE_ENV_KEYS.serial] = 'serial-parent';
        const { brain, seen } = genSpawnerRepl();
        await brain.ask(replInput);
        await brain.act(replInput);
        return { seen };
      });

      then(
        'the child process of ask reads depth 1, the leaf mark, and no parent serial',
        () => {
          expect(result.seen[0]).toEqual({ depth: '1', leaf: '1', serial: '' });
        },
      );

      then(
        'the child process of act reads depth 1, the leaf mark, and no parent serial',
        () => {
          expect(result.seen[1]).toEqual({ depth: '1', leaf: '1', serial: '' });
        },
      );
    });
  });
});
