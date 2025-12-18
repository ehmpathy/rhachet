import type { ContextLogTrail } from 'as-procedure';

import type { ContextStitchTrail } from '@src/domain.operations/stitch/withStitchTrail';

import type { GStitcher, Stitcher } from './Stitcher';
import type { StitchStep } from './StitchStep';
import type { Thread } from './Thread';
import type { Threads } from './Threads';

type ArtistContext = { name: string };

/**
 * example thread builder
 */
const genThread = <C>(ctx: C): Thread<C> => ({
  context: ctx,
  stitches: [],
});

/**
 * Compile-time test suite using Jest
 */
describe('GStitcher', () => {
  type BaseContext = ContextStitchTrail & ContextLogTrail;

  it('accepts single-threaded Threads', () => {
    type SingleThreads = Threads<{ artist: ArtistContext }, 'single'>;

    const stitcher: GStitcher<SingleThreads, BaseContext, string> = {
      threads: {
        artist: genThread({ role: 'artist' as const, name: 'Zane' }),
      },
      context: {
        stitch: { trail: [] },
        log: console,
      },
      output: 'done',
    };

    expect(stitcher.output).toBe('done');
  });

  it('accepts multi-threaded Threads using Threads<..., "multiple">', () => {
    type MultiThreads = Threads<{ artist: ArtistContext }, 'multiple'>;

    const stitcher: GStitcher<MultiThreads, BaseContext, string> = {
      threads: {
        artist: {
          seed: genThread({ role: 'artist', name: 'Zane' }),
          peers: [genThread({ role: 'artist', name: 'Zane' })],
        },
      },
      context: {
        stitch: { trail: [] },
        log: console,
      },
      output: 'done',
    };

    expect(stitcher.threads.artist.peers[0]?.context.name).toBe('Zane');
  });

  it('rejects invalid thread shape', () => {
    type InvalidThreads = {
      artist: string;
    };

    // @ts-expect-error - artist must be a Thread or Thread[]
    const stitcher: GStitcher<InvalidThreads, BaseContext, string> = {
      threads: {
        artist: 'not-a-thread',
      },
      context: {
        stitch: { trail: [] },
        log: console,
      },
      output: 'fail',
    };
    expect(stitcher);
  });

  describe('Stitcher<GStitcher>', () => {
    // ✅ Positive, single
    it('should allow Stitcher<GStitcher> with Threads<..., "single">', () => {
      type ValidThreadSingle = Threads<{ artist: ArtistContext }, 'single'>;

      type S = Stitcher<
        GStitcher<ValidThreadSingle, GStitcher['context'], string>
      >;
      const assert: S | null = null;
      expect(assert).toBeNull();
    });

    // ✅ Positive, multiple
    it('only allow StitchStep<GStitcher> with Threads<..., "multiple">', () => {
      type ValidThreadMultiple = Threads<{ artist: ArtistContext }, 'multiple'>;

      type S = StitchStep<
        GStitcher<ValidThreadMultiple, GStitcher['context'], string>
      >;
      const assert: S | null = null;
      expect(assert).toBeNull();
    });

    // ❌ Negative, single
    it('should reject Stitcher<GStitcher> with non-Thread single shape', () => {
      type InvalidThreadSingle = { artist: string };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      type S = Stitcher<
        // @ts-expect-error - invalid thread shape
        GStitcher<InvalidThreadSingle, GStitcher['context'], string>
      >;
      expect(true).toBe(true);
    });

    // ❌ Negative, multiple
    it('should reject Stitcher<GStitcher> with non-Thread[] multiple shape', () => {
      type InvalidThreadMultiple = { artist: string[] }; // not Thread[]

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      type S = Stitcher<
        // @ts-expect-error - invalid thread[] shape
        GStitcher<InvalidThreadMultiple, GStitcher['context'], string>
      >;
      expect(true).toBe(true);
    });
  });
});
