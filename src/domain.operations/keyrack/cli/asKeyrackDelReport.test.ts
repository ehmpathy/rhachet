import { given, then, when } from 'test-fns';

import { asKeyrackDelReport } from './asKeyrackDelReport';

/**
 * .what = unit clamp for the `keyrack del` human render, both outcomes
 * .why = the operator-seen del text is pinned deterministically + creds-free here; the destroyed
 *        end-to-end path (github-app del actually destroys the SSM secret + echoes it) is
 *        acceptance-snapshotted in keyrack.aws-params.githubApp.acceptance.test [case3], and the
 *        plain-removed reference path in keyrack.vault.awsParams.acceptance.test [case6]
 */
describe('asKeyrackDelReport', () => {
  given('[case1] a plain removal', () => {
    when('[t0] rendered', () => {
      const report = asKeyrackDelReport({
        slug: 'ehmpathy.prod.REF_KEY',
        effect: 'deleted',
      });

      then('it reports a plain removal', () => {
        expect(report).toContain('removed');
      });

      then('it matches snapshot', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });

  given('[case2] the key was already absent (not_found)', () => {
    when('[t0] rendered', () => {
      const report = asKeyrackDelReport({
        slug: 'ehmpathy.prod.ABSENT_KEY',
        effect: 'not_found',
      });

      then('it reports the key was not found', () => {
        expect(report).toContain('not found (already absent)');
      });

      then('it matches snapshot', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3] a removal that destroyed a keyrack-managed SSM secret (owned mech)',
    () => {
      when('[t0] rendered', () => {
        const report = asKeyrackDelReport({
          slug: 'ehmpathy.prod.EHMPATHY_SEATURTLE_GITHUB_TOKEN',
          effect: 'deleted',
          destroyed: {
            exid: '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/prod/EHMPATHY_SEATURTLE_GITHUB_TOKEN',
          },
        });

        then('it reports the removal AND the destroyed SSM secret', () => {
          expect(report).toContain('removed');
          expect(report).toContain('the SSM secret at');
          expect(report).toContain('was destroyed');
        });

        then('it matches snapshot', () => {
          expect(report).toMatchSnapshot();
        });
      });
    },
  );
});
