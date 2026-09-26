import { BadRequestError } from 'helpful-errors';

import { asFidoUnsupportedKeyError } from './asFidoUnsupportedKeyError';
import { FIDO_UNSUPPORTED_MARKER } from './fidoUnsupportedMarker';

describe('asFidoUnsupportedKeyError', () => {
  const error = asFidoUnsupportedKeyError({
    cipher: 'aes256-ctr',
    keyType: 'sk-ssh-ed25519@openssh.com',
    keyPath: '/home/vlad/.ssh/id_ed25519_sk',
  });

  test('returns a BadRequestError', () => {
    expect(error).toBeInstanceOf(BadRequestError);
  });

  test('names the FIDO marker so both call sites detect it identically', () => {
    expect(error.message).toContain(FIDO_UNSUPPORTED_MARKER);
  });

  test('names the human key type in the message', () => {
    expect(error.message).toContain('sk-ssh-ed25519@openssh.com');
  });

  test('names the fix: an ed25519 or passphrase-less key', () => {
    expect(error.message).toContain('ed25519');
    expect(error.message).toContain('passphrase-less key');
  });

  test('carries the cipher, keyType, keyPath as metadata', () => {
    expect(error.metadata).toMatchObject({
      cipher: 'aes256-ctr',
      keyType: 'sk-ssh-ed25519@openssh.com',
      keyPath: '/home/vlad/.ssh/id_ed25519_sk',
    });
  });
});
