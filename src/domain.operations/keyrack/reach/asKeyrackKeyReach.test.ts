import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

/**
 * .what = a reach is PLAINTEXT — keyrack never interprets it
 * .why = a reach qualifies the key name so the store looks in a different spot for the
 *        value. that is the whole of it. only the github-app mech asks more of an exid,
 *        and it does so on its own (see asGithubOrgFromReach)
 */
describe('asKeyrackKeyReach', () => {
  given('[case1] a plaintext exid', () => {
    when('[t0] the exid is cast', () => {
      then('it is carried verbatim', () => {
        expect(asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' })).toMatchObject({
          exid: 'beav@ehmpathy.com',
        });
      });

      then('an `@` is allowed — an email is the obvious account exid', () => {
        expect(asKeyrackKeyReach({ exid: 'vlad@ehmpathy.com' }).exid).toEqual(
          'vlad@ehmpathy.com',
        );
      });

      then('a bare word is a perfectly good exid', () => {
        expect(asKeyrackKeyReach({ exid: 'personal' }).exid).toEqual(
          'personal',
        );
      });

      then('outer whitespace is trimmed, not rejected', () => {
        expect(asKeyrackKeyReach({ exid: '  personal  ' }).exid).toEqual(
          'personal',
        );
      });
    });
  });

  given('[case2] the github-app mint convention', () => {
    when('[t0] the exid is cast', () => {
      then(
        'it is just another exid here — no scheme parse, no rejection',
        () => {
          expect(
            asKeyrackKeyReach({ exid: 'github://org=ehmpathy' }).exid,
          ).toEqual('github://org=ehmpathy');
        },
      );

      then(
        'an unknown scheme is equally fine — schemes are not a keyrack concept',
        () => {
          expect(
            asKeyrackKeyReach({ exid: 'gitlab://group=acme' }).exid,
          ).toEqual('gitlab://group=acme');
        },
      );
    });
  });

  given('[case3] an empty exid', () => {
    when('[t0] the exid is cast', () => {
      then('it throws rather than yields a reachless default', async () => {
        const error = await getError(async () =>
          asKeyrackKeyReach({ exid: '' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('may not be empty');
      });

      then('a whitespace-only exid is empty too', async () => {
        const error = await getError(async () =>
          asKeyrackKeyReach({ exid: '   ' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('may not be empty');
      });
    });
  });

  given('[case4] an exid that holds whitespace', () => {
    when('[t0] the exid is cast', () => {
      then('it throws — a key address must stay readable', async () => {
        const error = await getError(async () =>
          asKeyrackKeyReach({ exid: 'beav at ehmpathy' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('may not hold whitespace');
      });

      then('the error names the fix', async () => {
        const error = await getError(async () =>
          asKeyrackKeyReach({ exid: 'beav at ehmpathy' }),
        );
        expect(error.message).toContain('--reach');
      });
    });
  });
});
