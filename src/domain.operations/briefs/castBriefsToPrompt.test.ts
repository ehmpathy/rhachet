import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import { given, then, when } from 'test-fns';

import { castBriefsToPrompt } from './castBriefsToPrompt';

/**
 * .what = creates a mock artifact with given content
 */
const makeMockArtifact = (
  content: string | null | undefined,
): Artifact<typeof GitFile> =>
  ({
    ref: { uri: `/mock/${Math.random()}` },
    get: async () => ({
      uri: '/mock/file.md',
      hash: 'hash123',
      content,
    }),
  }) as any;

describe('castBriefsToPrompt', () => {
  given('[case1] multiple briefs with content', () => {
    const briefs = [
      makeMockArtifact('first brief content'),
      makeMockArtifact('second brief content'),
      makeMockArtifact('third brief content'),
    ];

    when('[t0] castBriefsToPrompt is called', () => {
      then('it returns concatenated content with double newlines', async () => {
        const result = await castBriefsToPrompt({ briefs });
        expect(result).toEqual(
          'first brief content\n\nsecond brief content\n\nthird brief content',
        );
      });
    });
  });

  given('[case2] empty briefs array', () => {
    const briefs: Artifact<typeof GitFile>[] = [];

    when('[t0] castBriefsToPrompt is called', () => {
      then('it returns empty string', async () => {
        const result = await castBriefsToPrompt({ briefs });
        expect(result).toEqual('');
      });
    });
  });

  given('[case3] briefs with some falsy content', () => {
    const briefs = [
      makeMockArtifact('valid content'),
      makeMockArtifact(''),
      makeMockArtifact(null),
      makeMockArtifact(undefined),
      makeMockArtifact('another valid'),
    ];

    when('[t0] castBriefsToPrompt is called', () => {
      then('it filters out falsy content', async () => {
        const result = await castBriefsToPrompt({ briefs });
        expect(result).toEqual('valid content\n\nanother valid');
      });
    });
  });

  given('[case4] single brief', () => {
    const briefs = [makeMockArtifact('only one brief')];

    when('[t0] castBriefsToPrompt is called', () => {
      then('it returns the content without extra newlines', async () => {
        const result = await castBriefsToPrompt({ briefs });
        expect(result).toEqual('only one brief');
      });
    });
  });
});
