import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { generateKeyPairSync } from 'node:crypto';
import { mechAdapterGithubApp } from './mechAdapterGithubApp';

/**
 * .what = the github-app mint against the REAL api.github.com, with no credential
 * .why = the external contract this pr leans on, called for real: a well-formed blob whose rsa
 *        key is generated at test time, for an app id no github app holds. github itself refuses
 *        the mint, so this proves, against the live service, that a refusal reaches the caller
 *        as a ConstraintError with its cure, never as a transient retry or a raw octokit fault.
 *        measured: github answers an unknown app id with a 404, so the refusal is classed as
 *        `installation-refused`, and its hint names an appId that names no app
 * .note = the positive mint (a real `ghs_` token) needs the real app's private key, which no
 *         test may hold (fulcrum F5); this is the lack-of-credentials case of that contract
 */
const PEM_UNREGISTERED = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;

describe('mechAdapterGithubApp (real api.github.com)', () => {
  given('[case1] a well-formed blob for an app no github app holds', () => {
    const source = JSON.stringify({
      appId: '999999999',
      installationId: '999999999',
      privateKey: PEM_UNREGISTERED,
    });

    when('[t0] deliverForGet mints against the real github', () => {
      // .note = wrapped in a plain object, since useBeforeAll proxies its value and a proxy
      //         defeats instanceof
      const minted = useBeforeAll(async () => ({
        error: await getError(mechAdapterGithubApp.deliverForGet({ source })),
      }));

      then('github refuses it, as a caller-fixable ConstraintError', () => {
        expect(minted.error).toBeInstanceOf(ConstraintError);
      });

      then('the refusal is classed by the status github sent (404)', () => {
        expect((minted.error as ConstraintError).metadata).toMatchObject({
          fault: 'installation-refused',
          status: 404,
          appId: '999999999',
        });
      });

      then(
        'the hint names the cause github gave: an appId that names no app',
        () => {
          expect(
            String((minted.error as ConstraintError).metadata?.hint),
          ).toContain('its appId names no app');
        },
      );

      then('the refusal never carries the private key', () => {
        expect(
          JSON.stringify((minted.error as ConstraintError).metadata),
        ).not.toContain(PEM_UNREGISTERED.split('\n')[1]!);
        expect(minted.error.message).not.toContain('PRIVATE KEY');
      });

      then('the headline matches snapshot', () => {
        expect(minted.error.message.split('\n')[0]).toMatchSnapshot();
      });
    });
  });
});
