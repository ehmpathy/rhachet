import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asOpensshKeyBytes } from './asOpensshKeyBytes';

/**
 * .what = prove the PEM-armor -> raw-bytes transform: it base64-decodes the body
 *         between the openssh header/footer, and rejects a non-openssh blob loud
 * .why  = the shared parse behind cipher + seed extraction had only transitive
 *         coverage (via asEd25519Seed / asSshKeyCipher); its error branch — a blob
 *         with no openssh header/footer -> BadRequestError — was untested. this
 *         unit pins both branches directly (rule.require.test-coverage-by-grain)
 *
 * .note = unit (pure) — the body need not be a real key; the transform only
 *         base64-decodes whatever sits between the armor lines
 */
describe('asOpensshKeyBytes', () => {
  given('[case1] a well-formed openssh private key PEM', () => {
    const body = Buffer.from('a-fake-openssh-key-v1-body').toString('base64');
    const pem = [
      '-----BEGIN OPENSSH PRIVATE KEY-----',
      body,
      '-----END OPENSSH PRIVATE KEY-----',
    ].join('\n');

    when('[t0] parsed to bytes', () => {
      then('it returns the base64-decoded body verbatim', () => {
        const bytes = asOpensshKeyBytes({ keyContent: pem });
        expect(bytes.toString('utf8')).toEqual('a-fake-openssh-key-v1-body');
      });
    });
  });

  given('[case2] a blob with no openssh header/footer', () => {
    when('[t0] parsed to bytes', () => {
      then('it throws a BadRequestError (caller-condition)', () => {
        const error = getError(() =>
          asOpensshKeyBytes({
            keyContent: 'ssh-ed25519 AAAAC3Nz... not a pem',
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('[case3] a blob with the header but no footer', () => {
    when('[t0] parsed to bytes', () => {
      then('it throws a BadRequestError', () => {
        const partial = [
          '-----BEGIN OPENSSH PRIVATE KEY-----',
          Buffer.from('truncated').toString('base64'),
        ].join('\n');
        const error = getError(() =>
          asOpensshKeyBytes({ keyContent: partial }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });
});
