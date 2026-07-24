import { given, then, when } from 'test-fns';

import { isKeyrackInfraRegistryGithubAppRegistered } from './isKeyrackInfraRegistryGithubAppRegistered';

const appOne = {
  org: 'ehmpathy',
  appId: '123456',
  installationId: '78901234',
  slug: 'ehmpathy-bot',
};

describe('isKeyrackInfraRegistryGithubAppRegistered', () => {
  given('[case1] a registry that holds the slug', () => {
    when('[t0] checked', () => {
      then('it is true', () => {
        expect(
          isKeyrackInfraRegistryGithubAppRegistered({
            apps: [appOne],
            slug: 'ehmpathy-bot',
          }),
        ).toBe(true);
      });
    });
  });

  given('[case2] a registry that lacks the slug', () => {
    when('[t0] checked', () => {
      then('it is false', () => {
        expect(
          isKeyrackInfraRegistryGithubAppRegistered({
            apps: [appOne],
            slug: 'other-bot',
          }),
        ).toBe(false);
      });
    });
  });

  given('[case3] an empty registry', () => {
    when('[t0] checked', () => {
      then('it is false', () => {
        expect(
          isKeyrackInfraRegistryGithubAppRegistered({
            apps: [],
            slug: 'ehmpathy-bot',
          }),
        ).toBe(false);
      });
    });
  });
});
