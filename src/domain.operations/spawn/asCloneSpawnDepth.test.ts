import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asCloneSpawnDepth, CLONE_SPAWN_DEPTH_MAX } from './asCloneSpawnDepth';

/**
 * .what = the depth a fresh spawn would mint, over every shape the caller's env, tty,
 *   and door take
 * .why =
 *   - the +1 is the subtlety — the env holds the CALLER's depth and the transformer
 *     returns the CHILD's
 *   - a tty with no depth var is a human: a tty enroll there is top-level, and every
 *     no-tty spawn is at least depth 1
 *   - a tty that carries a depth var is a pty a clone opened, so it reads that var + 1
 *     (fulcrum F13) — a clone cannot reset to 0 by a pty wrap that keeps its env
 *   - the repl door never mints 0: a review brain is always a spawn
 */
const TEST_CASES: {
  description: string;
  given: {
    depth: string | undefined;
    depthMinted?: string;
    hostDetached?: string;
    isTty: boolean;
    door: 'enroll' | 'repl';
  };
  expect: number;
}[] = [
  // enroll at a tty — a human's top-level clone
  {
    description: 'a tty enroll with no depth var mints a top-level clone (0)',
    given: { depth: undefined, isTty: true, door: 'enroll' },
    expect: 0,
  },
  {
    description:
      'a tty enroll in a pty a depth-0 clone opened mints depth 1, never a fresh top level',
    given: { depth: '0', isTty: true, door: 'enroll' },
    expect: 1,
  },
  {
    description:
      'a tty enroll in a pty a depth-1 clone opened would mint depth 2 — over the limit (the tmux hole, F13)',
    given: { depth: '1', isTty: true, door: 'enroll' },
    expect: 2,
  },
  {
    description:
      'a tty enroll under a smudged depth var still mints a top-level clone (0) — a smudge never locks a human out',
    given: { depth: 'deep', isTty: true, door: 'enroll' },
    expect: 0,
  },

  // enroll with no tty — a spawn
  {
    description:
      'a no-tty enroll with no depth var reads a depth-0 caller and mints depth 1',
    given: { depth: undefined, isTty: false, door: 'enroll' },
    expect: 1,
  },
  {
    description: 'a no-tty enroll by a depth-0 clone mints depth 1',
    given: { depth: '0', isTty: false, door: 'enroll' },
    expect: 1,
  },
  {
    description:
      'a no-tty enroll by a depth-1 clone would mint depth 2 — over the limit',
    given: { depth: '1', isTty: false, door: 'enroll' },
    expect: 2,
  },
  {
    description:
      'a malformed depth reads a depth-0 caller, never a fresh chain',
    given: { depth: 'deep', isTty: false, door: 'enroll' },
    expect: 1,
  },
  {
    description:
      'a depth with a digit prefix and a suffix reads a depth-0 caller, never its prefix — a smudge never locks out',
    given: { depth: '9x', isTty: false, door: 'enroll' },
    expect: 1,
  },
  {
    description: 'a fractional depth reads a depth-0 caller',
    given: { depth: '1.5', isTty: false, door: 'enroll' },
    expect: 1,
  },
  {
    description: 'an empty depth reads a depth-0 caller',
    given: { depth: '', isTty: false, door: 'enroll' },
    expect: 1,
  },
  {
    description: 'a negative depth reads a depth-0 caller',
    given: { depth: '-3', isTty: false, door: 'enroll' },
    expect: 1,
  },

  // a detached host replays its caller's decision
  {
    description:
      'a detached host takes the depth its tty caller decided (0), never re-reads',
    given: {
      depth: '1',
      depthMinted: '0',
      hostDetached: '1',
      isTty: false,
      door: 'enroll',
    },
    expect: 0,
  },
  {
    description: 'a detached host takes a handed depth of 1',
    given: {
      depth: '0',
      depthMinted: '1',
      hostDetached: '1',
      isTty: false,
      door: 'enroll',
    },
    expect: 1,
  },
  {
    description:
      'a stray handed depth on a process that is no host is ignored, never a fresh chain',
    given: { depth: '1', depthMinted: '0', isTty: false, door: 'enroll' },
    expect: 2,
  },

  // the repl door — a review brain is always a spawn
  {
    description: 'a repl call at a tty mints its brain at depth 1, never 0',
    given: { depth: undefined, isTty: true, door: 'repl' },
    expect: 1,
  },
  {
    description:
      'a repl call at a tty in a pty a depth-1 clone opened would mint depth 2 — over the limit',
    given: { depth: '1', isTty: true, door: 'repl' },
    expect: 2,
  },
  {
    description: 'a repl call by a depth-0 clone mints depth 1',
    given: { depth: '0', isTty: false, door: 'repl' },
    expect: 1,
  },
  {
    description:
      'a repl call by a depth-1 clone would mint depth 2 — over the limit',
    given: { depth: '1', isTty: false, door: 'repl' },
    expect: 2,
  },
  {
    description: 'the repl door ignores a handed-over enroll depth',
    given: {
      depth: '1',
      depthMinted: '0',
      hostDetached: '1',
      isTty: false,
      door: 'repl',
    },
    expect: 2,
  },
];

describe('asCloneSpawnDepth', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asCloneSpawnDepth({
          env: {
            [CLONE_ENV_KEYS.depth]: thisCase.given.depth,
            [CLONE_ENV_KEYS.depthMinted]: thisCase.given.depthMinted,
            [CLONE_ENV_KEYS.hostDetached]: thisCase.given.hostDetached,
          },
          isTty: thisCase.given.isTty,
          door: thisCase.given.door,
        }),
      ).toEqual(thisCase.expect);
    }),
  );

  test('the limit permits a top-level clone to spawn exactly one level', () => {
    // a human's tty enroll, and that clone's no-tty spawn, both fit
    expect(
      asCloneSpawnDepth({ env: {}, isTty: true, door: 'enroll' }),
    ).toBeLessThanOrEqual(CLONE_SPAWN_DEPTH_MAX);
    expect(
      asCloneSpawnDepth({
        env: { [CLONE_ENV_KEYS.depth]: '0' },
        isTty: false,
        door: 'repl',
      }),
    ).toBeLessThanOrEqual(CLONE_SPAWN_DEPTH_MAX);

    // the child's own spawn does not
    expect(
      asCloneSpawnDepth({
        env: { [CLONE_ENV_KEYS.depth]: '1' },
        isTty: false,
        door: 'repl',
      }),
    ).toBeGreaterThan(CLONE_SPAWN_DEPTH_MAX);
  });
});
