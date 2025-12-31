import { BrainAtom } from '@src/domain.objects/BrainAtom';

/**
 * .what = generates a mocked BrainAtom for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior
 */
export const genMockedBrainAtom = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
}): BrainAtom =>
  new BrainAtom({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_atom__',
    description: input?.description ?? 'mocked brain atom for testing',
    ask: async (askInput) =>
      askInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      }),
  });
