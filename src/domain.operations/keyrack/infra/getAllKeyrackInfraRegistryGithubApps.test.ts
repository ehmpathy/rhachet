import { given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getAllKeyrackInfraRegistryGithubApps } from './getAllKeyrackInfraRegistryGithubApps';

const appOne = {
  org: 'ehmpathy',
  appId: '123456',
  installationId: '78901234',
  slug: 'ehmpathy-bot',
};

describe('getAllKeyrackInfraRegistryGithubApps', () => {
  given('[case1] a seeded registry', () => {
    const ghRun = genMockGhRun({
      files: [
        {
          repo: 'ehmpathy/keyrack-infra',
          path: 'registry/github-apps.json',
          content: `${JSON.stringify([appOne], null, 2)}\n`,
        },
      ],
    });

    when('[t0] read', () => {
      then('it returns the registered apps', () => {
        expect(
          getAllKeyrackInfraRegistryGithubApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([appOne]);
      });
    });
  });

  given('[case2] a repo with no registry file yet', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] read', () => {
      then('it returns an empty list', () => {
        expect(
          getAllKeyrackInfraRegistryGithubApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([]);
      });
    });
  });
});
