import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../__test_assets__/genContextStitchTrail';
import { Stitch } from '../../domain/objects/Stitch';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { Threads } from '../../domain/objects/Threads';
import { enstitch } from './enstitch';

describe('enstitch', () => {
  const context = { ...genContextStitchTrail(), ...genContextLogTrail() };

  given('a compute stitcher with a single thread', () => {
    const threadMain = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    const stitcher = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, typeof context, string>
    >({
      slug: 'mock-step',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: 'in', output: 'out' }),
    });

    when('enstitch is called', () => {
      then('it should append the stitch to the thread', async () => {
        const result = await enstitch(
          { stitcher, threads: { main: threadMain } },
          context,
        );

        expect(result.stitch.output).toEqual('out');
        expect(result.threads.main.stitches.length).toBe(1);
        expect(result.threads.main.stitches[0]!.output).toEqual('out');
      });
    });
  });

  given('a compute stitcher with a multiple thread (seed + peers)', () => {
    const seed = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });
    const peer = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    const threadBundle = { seed, peers: [peer, peer, peer] };

    const stitcher = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }, 'multiple'>,
        typeof context,
        { peers: number }
      >
    >({
      slug: 'mock-step',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: ({ threads }) => ({
        input: 'in',
        output: { peers: threads.main.peers.length },
      }),
    });

    when('enstitch is called with multiple thread shape', () => {
      then('it should update the seed thread with the stitch', async () => {
        const result = await enstitch(
          { stitcher, threads: { main: threadBundle } },
          context,
        );

        expect(result.stitch.output).toEqual({
          peers: 3,
        });
        expect(result.threads.main.stitches.length).toBe(1);
        expect(result.threads.main.stitches[0]!.output).toEqual({
          peers: 3,
        });
      });
    });
  });

  given('a compute stitcher that returns a constant literal output "A"', () => {
    const threadMain = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    const stitcher = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, typeof context, 'A'>
    >({
      slug: 'repeatee',
      readme: 'Repeat logic',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'A' }),
    });

    when('enstitch is called with a repeatee-style stitcher', () => {
      then('it should append a stitch with output "A"', async () => {
        const result = await enstitch(
          { stitcher, threads: { main: threadMain } },
          context,
        );

        expect(result.stitch.output).toBe('A');
        expect(result.threads.main.stitches.length).toBe(1);
        expect(result.threads.main.stitches[0]!.output).toBe('A');
      });
    });
  });
});
