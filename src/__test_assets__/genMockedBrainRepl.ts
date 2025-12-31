import { BrainRepl } from '@src/domain.objects/BrainRepl';

/**
 * .what = generates a mocked BrainRepl for tests
 * .why = reduces boilerplate in tests and ensures consistent mock behavior
 */
export const genMockedBrainRepl = (input?: {
  repo?: string;
  slug?: string;
  description?: string;
  content?: string;
}): BrainRepl =>
  new BrainRepl({
    repo: input?.repo ?? '__mock_repo__',
    slug: input?.slug ?? '__mock_repl__',
    description: input?.description ?? 'mocked brain repl for testing',
    ask: async (askInput) =>
      askInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      }),
    act: async (actInput) =>
      actInput.schema.output.parse({
        content: input?.content ?? '__mock_response__',
      }),
  });
