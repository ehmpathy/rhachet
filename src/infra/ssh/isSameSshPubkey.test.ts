import { given, then, when } from 'test-fns';

import { isSameSshPubkey } from './isSameSshPubkey';

describe('isSameSshPubkey', () => {
  given('two pubkey strings for the same key', () => {
    const body = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIABCDEF';

    when('[t0] they differ only by comment', () => {
      then('they match', () => {
        expect(
          isSameSshPubkey({
            a: `${body} vlad@laptop`,
            b: `${body} keyrack@host`,
          }),
        ).toBe(true);
      });
    });

    when('[t1] one has a newline suffix + extra whitespace', () => {
      then('they still match', () => {
        expect(
          isSameSshPubkey({ a: `  ${body}  vlad@laptop\n`, b: body }),
        ).toBe(true);
      });
    });
  });

  given('two pubkey strings for different keys', () => {
    when('[t0] the base64 body differs', () => {
      then('they do not match', () => {
        expect(
          isSameSshPubkey({
            a: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIABCDEF',
            b: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAZZZZZ',
          }),
        ).toBe(false);
      });
    });

    when('[t1] the type differs but body matches', () => {
      then('they do not match (type is part of identity)', () => {
        expect(
          isSameSshPubkey({
            a: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIABCDEF',
            b: 'ssh-rsa AAAAC3NzaC1lZDI1NTE5AAAAIABCDEF',
          }),
        ).toBe(false);
      });
    });
  });

  given('a malformed single-field input', () => {
    when('[t0] compared against a well-formed key', () => {
      then('it cannot match (returns false, never throws)', () => {
        expect(
          isSameSshPubkey({
            a: 'ssh-ed25519',
            b: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIABCDEF',
          }),
        ).toBe(false);
      });
    });

    when('[t1] both inputs are empty', () => {
      then('they do not match', () => {
        expect(isSameSshPubkey({ a: '', b: '' })).toBe(false);
      });
    });
  });
});
