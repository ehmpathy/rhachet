import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asKeyrackErroredKeyTip } from '@src/domain.operations/keyrack/cli/asKeyrackErroredKeyTip';

import { asGithubAppMintFaultRefusal } from './asGithubAppMintFaultRefusal';
import { asGithubAppMintFaultWithCure } from './asGithubAppMintFaultWithCure';
import { asKeyrackGithubAppSetCommand } from './asKeyrackGithubAppSetCommand';

const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const OWNER = 'ehmpath';

const CURE_OS_SECURE = asKeyrackGithubAppSetCommand({
  vault: 'os.secure',
  owner: OWNER,
  slug: SLUG,
  reach: null,
  form: { kind: 'pipe', readSide: null, host: null },
});
const CURE_AWS_PARAMS = asKeyrackGithubAppSetCommand({
  vault: 'aws.params',
  owner: OWNER,
  slug: SLUG,
  reach: null,
  form: { kind: 'guided' },
});

const asStatusError = (status: number): Error =>
  Object.assign(new Error(`HttpError ${status}`), { status });

const REFUSALS = [
  { description: 'a refused key (401)', error: asStatusError(401) },
  { description: 'a refused installation (404)', error: asStatusError(404) },
  {
    description: 'an invalid private key',
    error: new Error('error:1E08010C:DECODER routines::unsupported'),
  },
];

describe('asGithubAppMintFaultWithCure', () => {
  given('[case1] each mint refusal, under each vault cure', () => {
    REFUSALS.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        const refusal = asGithubAppMintFaultRefusal({
          error: thisCase.error,
          appId: '123456',
        });
        const curedOsSecure = asGithubAppMintFaultWithCure({
          error: refusal,
          cure: CURE_OS_SECURE,
        });
        const curedAwsParams = asGithubAppMintFaultWithCure({
          error: refusal,
          cure: CURE_AWS_PARAMS,
        });

        then('os.secure names the piped re-file, owner and slug filled', () => {
          expect(curedOsSecure).toBeInstanceOf(ConstraintError);
          const tip = asKeyrackErroredKeyTip({
            cause: curedOsSecure,
            slug: SLUG,
            orgDefault: null,
            owner: OWNER,
          });
          expect(tip).toContain(
            `rhx keyrack set --owner ${OWNER} --key ${SLUG} --vault os.secure`,
          );
          expect(tip).toContain('--source @stdin');
        });

        then('aws.params names its own set, never os.secure', () => {
          const tip = asKeyrackErroredKeyTip({
            cause: curedAwsParams,
            slug: SLUG,
            orgDefault: null,
            owner: OWNER,
          });
          expect(tip).toContain('--vault aws.params');
          expect(tip).not.toContain('os.secure');
        });

        then('the tip a human reads matches snapshot', () => {
          expect(
            asKeyrackErroredKeyTip({
              cause: curedOsSecure,
              slug: SLUG,
              orgDefault: null,
              owner: OWNER,
            }),
          ).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case2] an error that is no mech refusal', () => {
    when('[t0] a malfunction', () => {
      then('it is returned as-is', () => {
        const error = new MalfunctionError('network down');
        expect(
          asGithubAppMintFaultWithCure({ error, cure: CURE_OS_SECURE }),
        ).toBe(error);
      });
    });

    when('[t1] a constraint error with no fault', () => {
      then('it is returned as-is', () => {
        const error = new ConstraintError('other refusal', { hint: 'x' });
        expect(
          asGithubAppMintFaultWithCure({ error, cure: CURE_OS_SECURE }),
        ).toBe(error);
      });
    });
  });
});
