import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { FIDO_UNSUPPORTED_MARKER } from '@src/infra/ssh/fidoUnsupportedMarker';

import { genKeyrackRecipientSealed } from './genKeyrackRecipientSealed';

// clamp (rule.require.clamp-edge-cases): init's recipient classifier MUST guard FIDO/sk-
// keys the same as unlock's (sshPrikeyToAgeIdentity). a passphrased sk- key that slips
// past into the raw-ssh branch seals a manifest no code path can decrypt — a silent
// self-brick. reproduces r11's B1: init lacked the FIDO guard unlock already had.
// the guard throws BEFORE any ssh subprocess, so this is a pure unit test
describe('genKeyrackRecipientSealed', () => {
  given('[case1] a passphrase-protected FIDO/sk- key', () => {
    when('[t0] a recipient is picked for init', () => {
      then(
        'it fails fast with the actionable FIDO error, not a silent brick',
        async () => {
          const error = await getError(
            genKeyrackRecipientSealed({
              owner: 'ehmpath',
              cipher: 'aes256-ctr',
              pubkeyContent:
                'sk-ssh-ed25519@openssh.com AAAAGnNrLXNzaC1lZDI1NTE5QG9wZW5zc2guY29t test@fido',
              keyPath: '/home/test/.ssh/id_ed25519_sk',
              pubkeyPath: '/home/test/.ssh/id_ed25519_sk.pub',
            }),
          );

          expect(error).toBeInstanceOf(BadRequestError);
          expect(error?.message).toContain(FIDO_UNSUPPORTED_MARKER);
          // cites a key keyrack CAN serve, not a dead-end
          expect(error?.message).toContain('ed25519');
        },
      );
    });
  });

  // clamp (rule.require.clamp-edge-cases): a passphrased ECDSA key must fail loud at
  // init, not crash. age accepts only ssh-rsa/ssh-ed25519 recipients — an ecdsa key
  // that reaches the raw-ssh branch would seal to an `ecdsa` recipient and crash
  // inside `age -e -r <ecdsa-pubkey>` (raw exec throw, exit 1) at seal time. this
  // asserts the caller-fixable BadRequestError (exit 2) fires FIRST. RED under the
  // pre-guard code (returned a mech:'ssh' recipient → later age crash), GREEN now.
  // the guard throws BEFORE any ssh/age subprocess, so this is a pure unit test
  given('[case2] a passphrase-protected ecdsa key', () => {
    when('[t0] a recipient is picked for init', () => {
      then(
        'it fails fast with an actionable error that cites a serviceable key',
        async () => {
          const error = await getError(
            genKeyrackRecipientSealed({
              owner: 'ehmpath',
              cipher: 'aes256-ctr',
              pubkeyContent:
                'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTY test@ecdsa',
              keyPath: '/home/test/.ssh/id_ecdsa',
              pubkeyPath: '/home/test/.ssh/id_ecdsa.pub',
            }),
          );

          expect(error).toBeInstanceOf(BadRequestError);
          // cites keys keyrack CAN serve, not a dead-end
          expect(error?.message).toContain('ecdsa');
          expect(error?.message).toContain('ed25519');
          expect(error?.message).toContain('rsa');
        },
      );
    });
  });

  // clamp (rule.require.clamp-edge-cases): a PASSWORDLESS non-ed25519 key (rsa/ecdsa/dsa,
  // cipher 'none') routes to the passwordless branch, which converts via
  // asAgeRecipientFromSshPubkey — a converter that supports ONLY ed25519. it already
  // fails loud there with a caller-fixable BadRequestError, but no test pinned that
  // shape (the review's omission #1). this proves the fail-loud, not a crash
  given('[case3] a passwordless (cipher none) ecdsa key', () => {
    when('[t0] a recipient is picked for init', () => {
      then('it fails fast with a caller-fixable error', async () => {
        const error = await getError(
          genKeyrackRecipientSealed({
            owner: 'ehmpath',
            cipher: 'none',
            pubkeyContent:
              'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTY test@ecdsa',
            keyPath: '/home/test/.ssh/id_ecdsa',
            pubkeyPath: '/home/test/.ssh/id_ecdsa.pub',
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error?.message).toContain('ed25519');
      });
    });
  });
});
