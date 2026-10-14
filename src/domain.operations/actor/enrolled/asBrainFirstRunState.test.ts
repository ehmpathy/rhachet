import { given, then, when } from 'test-fns';

import { asBrainFirstRunState } from './asBrainFirstRunState';

const REPO = '/repo';

describe('asBrainFirstRunState', () => {
  given('[case1] an empty prior and a human who finished first run', () => {
    when('[t0] the state is computed', () => {
      then(
        'onboard, theme and the approved key are copied, and trust is set for the repo',
        () => {
          expect(
            asBrainFirstRunState({
              prior: {},
              human: {
                hasCompletedOnboarding: true,
                theme: 'dark',
                customApiKeyResponses: {
                  approved: ['key-a'],
                  rejected: ['key-z'],
                },
                projects: { '/other': { hasTrustDialogAccepted: true } },
              },
              repoPath: REPO,
              repoPathMain: null,
            }),
          ).toEqual({
            hasCompletedOnboarding: true,
            theme: 'dark',
            customApiKeyResponses: { approved: ['key-a'] },
            projects: { [REPO]: { hasTrustDialogAccepted: true } },
          });
        },
      );
    });
  });

  given('[case2] a prior with every key already set', () => {
    when('[t0] the state is computed', () => {
      then('the result is null — no write', () => {
        expect(
          asBrainFirstRunState({
            prior: {
              hasCompletedOnboarding: true,
              theme: 'light',
              customApiKeyResponses: { approved: ['key-a'] },
              projects: { [REPO]: { hasTrustDialogAccepted: true } },
            },
            human: {
              hasCompletedOnboarding: true,
              theme: 'dark',
              customApiKeyResponses: { approved: ['key-a'] },
            },
            repoPath: REPO,
            repoPathMain: null,
          }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a prior with its own theme and one approved key', () => {
    when('[t0] the state is computed', () => {
      const state = asBrainFirstRunState({
        prior: {
          theme: 'light',
          customApiKeyResponses: { approved: ['key-a'] },
          numStartups: 7,
          projects: { '/other': { allowedTools: ['x'] } },
        },
        human: {
          theme: 'dark',
          customApiKeyResponses: { approved: ['key-b', 'key-a'] },
        },
        repoPath: REPO,
        repoPathMain: null,
      });

      then('the prior theme is kept', () => {
        expect(state?.['theme']).toEqual('light');
      });

      then('the approved lists are unioned with no duplicate', () => {
        expect(state?.['customApiKeyResponses']).toEqual({
          approved: ['key-a', 'key-b'],
        });
      });

      then(
        'an unrelated prior field and another project entry are kept byte-equal',
        () => {
          expect(state?.['numStartups']).toEqual(7);
          expect(state?.['projects']).toEqual({
            '/other': { allowedTools: ['x'] },
            [REPO]: { hasTrustDialogAccepted: true },
          });
        },
      );
    });
  });

  given('[case4] an empty human', () => {
    when('[t0] the state is computed', () => {
      then('only the trust key is set', () => {
        expect(
          asBrainFirstRunState({
            prior: {},
            human: {},
            repoPath: REPO,
            repoPathMain: null,
          }),
        ).toEqual({
          projects: { [REPO]: { hasTrustDialogAccepted: true } },
        });
      });
    });
  });

  given('[case5] a repo that is a worktree of a main checkout', () => {
    /**
     * claude keys workspace trust by the MAIN checkout in a worktree (measured
     * 2026-09-27), so trust under the worktree path alone is never read
     */
    const MAIN = '/home/someone/git/org/repo';

    when('[t0] the state is computed from an empty prior', () => {
      then(
        'trust is set under both the worktree path and the main checkout',
        () => {
          expect(
            asBrainFirstRunState({
              prior: {},
              human: {},
              repoPath: REPO,
              repoPathMain: MAIN,
            }),
          ).toEqual({
            projects: {
              [REPO]: { hasTrustDialogAccepted: true },
              [MAIN]: { hasTrustDialogAccepted: true },
            },
          });
        },
      );
    });

    when('[t1] the prior trusts only the worktree path', () => {
      then('the main checkout key is added, and the worktree key kept', () => {
        expect(
          asBrainFirstRunState({
            prior: { projects: { [REPO]: { hasTrustDialogAccepted: true } } },
            human: {},
            repoPath: REPO,
            repoPathMain: MAIN,
          }),
        ).toEqual({
          projects: {
            [REPO]: { hasTrustDialogAccepted: true },
            [MAIN]: { hasTrustDialogAccepted: true },
          },
        });
      });
    });

    when('[t2] the prior trusts both paths', () => {
      then('no write is owed', () => {
        expect(
          asBrainFirstRunState({
            prior: {
              projects: {
                [REPO]: { hasTrustDialogAccepted: true },
                [MAIN]: { hasTrustDialogAccepted: true },
              },
            },
            human: {},
            repoPath: REPO,
            repoPathMain: MAIN,
          }),
        ).toEqual(null);
      });
    });
  });
});
