import { given, then, when } from 'test-fns';

import { getAllKeyrackInfraRegistryGithubAppsUnregistered } from './getAllKeyrackInfraRegistryGithubAppsUnregistered';

const appOne = {
  org: 'ehmpathy',
  appId: '123456',
  installationId: '78901234',
  slug: 'ehmpathy-bot',
};

const appTwo = {
  org: 'ehmpathy',
  appId: '654321',
  installationId: '43210987',
  slug: 'ehmpathy-ci',
};

describe('getAllKeyrackInfraRegistryGithubAppsUnregistered', () => {
  given('[case1] an install whose slug is not in the registry', () => {
    when('[t0] the unregistered installs are picked', () => {
      then('it returns that install', () => {
        expect(
          getAllKeyrackInfraRegistryGithubAppsUnregistered({
            registryApps: [appOne],
            installApps: [appTwo],
          }),
        ).toEqual([appTwo]);
      });
    });
  });

  given('[case2] an install whose slug is already in the registry', () => {
    when('[t0] the unregistered installs are picked', () => {
      then('it excludes that install', () => {
        expect(
          getAllKeyrackInfraRegistryGithubAppsUnregistered({
            registryApps: [appOne],
            installApps: [appOne],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case3] a mix of registered and new installs', () => {
    when('[t0] the unregistered installs are picked', () => {
      then('it returns only the new ones', () => {
        expect(
          getAllKeyrackInfraRegistryGithubAppsUnregistered({
            registryApps: [appOne],
            installApps: [appOne, appTwo],
          }),
        ).toEqual([appTwo]);
      });
    });
  });
});
