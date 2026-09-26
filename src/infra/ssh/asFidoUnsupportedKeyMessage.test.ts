import { asFidoUnsupportedKeyMessage } from './asFidoUnsupportedKeyMessage';
import { FIDO_UNSUPPORTED_MARKER } from './fidoUnsupportedMarker';

describe('asFidoUnsupportedKeyMessage', () => {
  const message = asFidoUnsupportedKeyMessage({
    keyType: 'sk-ssh-ed25519@openssh.com',
  });

  test('names the FIDO marker so the predicate stays in lockstep', () => {
    expect(message).toContain(FIDO_UNSUPPORTED_MARKER);
  });

  test('names the human key type', () => {
    expect(message).toContain('sk-ssh-ed25519@openssh.com');
  });

  test('names the fix: an ed25519 or passphrase-less key', () => {
    expect(message).toContain('ed25519');
    expect(message).toContain('passphrase-less key');
  });

  test('carries NO class prefix and NO metadata json — a pure body', () => {
    expect(message).not.toContain('BadRequestError');
    expect(message).not.toContain('ConstraintError');
    expect(message).not.toContain('{');
  });

  test('hangs its why/fix branches as a rooted 3-space treestruct', () => {
    // the body is a rooted tree: the why + fix branches hang under the summary
    // line via 3-space ├─/└─ connectors (no rootless list without a parent)
    expect(message).toContain('\n   ├─ why:');
    expect(message).toContain('\n   └─ fix:');
    // never the 2-space off-by-one that a peer message once had
    expect(message).not.toContain('\n  ├─ why:');
  });
});
