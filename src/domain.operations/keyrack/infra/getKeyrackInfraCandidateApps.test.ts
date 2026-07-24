import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getKeyrackInfraCandidateApps } from './getKeyrackInfraCandidateApps';

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

describe('getKeyrackInfraCandidateApps', () => {
  given('[case1] keyrack-infra is not reachable (absent or no access)', () => {
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] discovered', () => {
      then('it fails loud with a caller-fixable ConstraintError', async () => {
        const error = await getError(() =>
          getKeyrackInfraCandidateApps({ org: 'ehmpathy' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not reachable');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case2] the registry holds apps, caller is a member (403)', () => {
    // member is forbidden from the org list → the registry is their only source
    const ghRun = genMockGhRun({
      files: [
        {
          repo: 'ehmpathy/keyrack-infra',
          path: 'registry/github-apps.json',
          content: `${JSON.stringify([appOne], null, 2)}\n`,
        },
      ],
      orgInstalls: { forbidden: true },
    });

    when('[t0] discovered', () => {
      then('it returns the registry apps (no admin rights needed)', () => {
        expect(
          getKeyrackInfraCandidateApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([appOne]);
      });
    });
  });

  given('[case3] registry empty, caller is an admin', () => {
    const ghRun = genMockGhRun({
      files: [
        {
          repo: 'ehmpathy/keyrack-infra',
          path: 'registry/github-apps.json',
          content: '[]\n',
        },
      ],
      orgInstalls: {
        forbidden: false,
        installs: [
          { appId: '123456', installationId: '78901234', slug: 'ehmpathy-bot' },
        ],
      },
    });

    when('[t0] discovered', () => {
      then('it falls back to the admin install list', () => {
        expect(
          getKeyrackInfraCandidateApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([appOne]);
      });
    });
  });

  given('[case4] registry empty, caller is a member (403)', () => {
    const ghRun = genMockGhRun({
      files: [
        {
          repo: 'ehmpathy/keyrack-infra',
          path: 'registry/github-apps.json',
          content: '[]\n',
        },
      ],
      orgInstalls: { forbidden: true },
    });

    when('[t0] discovered', () => {
      then('it fails loud; the member is asked to see an admin', async () => {
        const error = await getError(() =>
          getKeyrackInfraCandidateApps({ org: 'ehmpathy' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no github apps registered');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given(
    '[case5] registry holds one app, admin has a second, unregistered install',
    () => {
      // appOne is registered; appTwo is installed but not yet in the registry
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: `${JSON.stringify([appOne], null, 2)}\n`,
          },
        ],
        orgInstalls: {
          forbidden: false,
          installs: [
            {
              appId: appTwo.appId,
              installationId: appTwo.installationId,
              slug: appTwo.slug,
            },
          ],
        },
      });

      when('[t0] discovered', () => {
        then('the admin sees both the registered and the new app', () => {
          expect(
            getKeyrackInfraCandidateApps({ org: 'ehmpathy' }, { ghRun }),
          ).toEqual([appOne, appTwo]);
        });
      });
    },
  );

  given('[case6] registry and admin install list share the same app', () => {
    // appOne is both registered and installed → it must appear only once
    const ghRun = genMockGhRun({
      files: [
        {
          repo: 'ehmpathy/keyrack-infra',
          path: 'registry/github-apps.json',
          content: `${JSON.stringify([appOne], null, 2)}\n`,
        },
      ],
      orgInstalls: {
        forbidden: false,
        installs: [
          {
            appId: appOne.appId,
            installationId: appOne.installationId,
            slug: appOne.slug,
          },
        ],
      },
    });

    when('[t0] discovered', () => {
      then('the shared app is deduped to a single entry', () => {
        expect(
          getKeyrackInfraCandidateApps({ org: 'ehmpathy' }, { ghRun }),
        ).toEqual([appOne]);
      });
    });
  });
});
