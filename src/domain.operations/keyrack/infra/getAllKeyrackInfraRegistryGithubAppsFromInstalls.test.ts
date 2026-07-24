import { given, then, when } from 'test-fns';

import { getAllKeyrackInfraRegistryGithubAppsFromInstalls } from './getAllKeyrackInfraRegistryGithubAppsFromInstalls';

describe('getAllKeyrackInfraRegistryGithubAppsFromInstalls', () => {
  given('[case1] an empty install list', () => {
    when('[t0] cast', () => {
      then('it returns an empty list', () => {
        expect(
          getAllKeyrackInfraRegistryGithubAppsFromInstalls({
            org: 'ehmpathy',
            installs: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] two org installs', () => {
    when('[t0] cast', () => {
      then('each install becomes a registry entry tagged with the org', () => {
        expect(
          getAllKeyrackInfraRegistryGithubAppsFromInstalls({
            org: 'ehmpathy',
            installs: [
              {
                appId: '123456',
                installationId: '78901234',
                slug: 'ehmpathy-bot',
              },
              {
                appId: '654321',
                installationId: '43210987',
                slug: 'ehmpathy-ci',
              },
            ],
          }),
        ).toEqual([
          {
            org: 'ehmpathy',
            appId: '123456',
            installationId: '78901234',
            slug: 'ehmpathy-bot',
          },
          {
            org: 'ehmpathy',
            appId: '654321',
            installationId: '43210987',
            slug: 'ehmpathy-ci',
          },
        ]);
      });
    });
  });
});
