import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asGithubOrgFromReach } from './asGithubOrgFromReach';

/**
 * .what = binds e2..e5 — the github-app mech is the ONE place a reach exid is parsed
 * .why = this mech MINTS a token for one org's installation, so it must know which org.
 *        an exid it cannot read is a ConstraintError, never a guess — a guessed org would
 *        mint a live credential for a reach the human never named
 */
describe('asGithubOrgFromReach', () => {
  given('[case1] a well formed github reach exid', () => {
    when('[t0] the org is read', () => {
      then('it yields the org', () => {
        expect(
          asGithubOrgFromReach({ reach: { exid: 'github://org=ehmpathy' } }),
        ).toEqual('ehmpathy');
      });

      then('it carries the org verbatim, dashes and all', () => {
        expect(
          asGithubOrgFromReach({
            reach: { exid: 'github://org=ehm-a-seaturtle' },
          }),
        ).toEqual('ehm-a-seaturtle');
      });
    });
  });

  given('[case2:e2] a bare exid, with no scheme', () => {
    when('[t0] the org is read', () => {
      then('e2: it throws rather than read the exid AS an org', async () => {
        const error = await getError(async () =>
          asGithubOrgFromReach({ reach: { exid: 'ehmpathy' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('does not');
      });

      then('e2: the error names the form', async () => {
        const error = await getError(async () =>
          asGithubOrgFromReach({ reach: { exid: 'ehmpathy' } }),
        );
        expect(error.message).toContain('--reach github://org=$org');
      });
    });
  });

  given('[case3:e3] an exid that names another scheme', () => {
    when('[t0] the org is read', () => {
      then('e3: it throws — this mech only mints for github', async () => {
        const error = await getError(async () =>
          asGithubOrgFromReach({ reach: { exid: 'gitlab://group=acme' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('github://org=$org');
      });
    });
  });

  given('[case4:e4] the github scheme with no org param', () => {
    when('[t0] the org is read', () => {
      then('e4: it throws, and calls out the absent param', async () => {
        const error = await getError(async () =>
          asGithubOrgFromReach({ reach: { exid: 'github://ehmpathy' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('github://org=$org');
      });
    });
  });

  given('[case5:e5] the github scheme with an empty org', () => {
    when('[t0] the org is read', () => {
      then('e5: it throws — an empty org is not an org', async () => {
        const error = await getError(async () =>
          asGithubOrgFromReach({ reach: { exid: 'github://org=' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case6] a plaintext account exid, as an os.secure juggle uses', () => {
    when('[t0] the org is read', () => {
      then(
        'it throws — a github key cannot mint for an account exid',
        async () => {
          const error = await getError(async () =>
            asGithubOrgFromReach({ reach: { exid: 'beav@ehmpathy.com' } }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('beav@ehmpathy.com');
        },
      );
    });
  });
});
