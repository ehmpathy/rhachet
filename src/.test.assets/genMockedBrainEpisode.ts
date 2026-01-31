import { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import { BrainExchange } from '@src/domain.objects/BrainExchange';
import { genBrainEpisode } from '@src/domain.operations/brainContinuation/genBrainEpisode';
import { genBrainExchange } from '@src/domain.operations/brainContinuation/genBrainExchange';

/**
 * .what = generates a mocked BrainEpisode for tests
 * .why = provides a simple way to create test fixtures with sensible defaults
 */
export const genMockedBrainEpisode = async (input?: {
  exchange?: BrainExchange;
  priorEpisode?: BrainEpisode | null;
  exid?: string | null;
}): Promise<BrainEpisode> => {
  const exchange =
    input?.exchange ??
    (await genBrainExchange({
      with: { input: '__mock_input__', output: '__mock_output__', exid: null },
    }));
  return genBrainEpisode({
    on: { episode: input?.priorEpisode ?? null },
    with: {
      exchange,
      exid: input?.exid ?? null,
    },
  });
};
