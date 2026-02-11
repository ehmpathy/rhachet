import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';

import { getAllKeyrackEnvsFromRepoManifest } from './getAllKeyrackEnvsFromRepoManifest';

const TEST_CASES = [
  {
    description: 'returns declared envs from manifest with prod and prep',
    given: {
      manifest: genMockKeyrackRepoManifest({
        org: 'ehmpathy',
        envs: ['prod', 'prep'],
      }),
    },
    expect: ['prod', 'prep'],
  },
  {
    description: 'returns empty array when no env-specific sections exist',
    given: {
      manifest: genMockKeyrackRepoManifest({
        org: 'ehmpathy',
        envs: [],
      }),
    },
    expect: [],
  },
  {
    description: 'returns custom env names',
    given: {
      manifest: genMockKeyrackRepoManifest({
        org: 'ehmpathy',
        envs: ['prod', 'prep', 'sandbox'],
      }),
    },
    expect: ['prod', 'prep', 'sandbox'],
  },
];

describe('getAllKeyrackEnvsFromRepoManifest', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = getAllKeyrackEnvsFromRepoManifest(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );
});
