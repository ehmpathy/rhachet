import type { ContextStitchTrail } from '@src/domain.operations/stitch/withStitchTrail';

/**
 * .what = generates a new context stitch trail
 */
export const genContextStitchTrail = (
  input: { stream?: ContextStitchTrail['stitch']['stream'] } = {},
): ContextStitchTrail => ({
  stitch: {
    trail: [],
    stream: input.stream,
  },
});
