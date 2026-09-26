import { AGE_CLI_ABSENT_MARKER } from './ageCliAbsentMarker';
import { asAgeCliAbsentMessage } from './asAgeCliAbsentMessage';

describe('asAgeCliAbsentMessage', () => {
  const message = asAgeCliAbsentMessage({ cipher: 'aes256-ctr' });

  test('names the age-cli-absent marker so the predicate stays in lockstep', () => {
    expect(message).toContain(AGE_CLI_ABSENT_MARKER);
  });

  test('names the human cipher', () => {
    expect(message).toContain('aes256-ctr');
  });

  test('names the fix: brew/apt install age, then retry init', () => {
    expect(message).toContain('brew install age');
    expect(message).toContain('apt install age');
    expect(message).toContain('rhx keyrack init');
  });

  test('carries NO class prefix and NO metadata json — a pure body', () => {
    expect(message).not.toContain('BadRequestError');
    expect(message).not.toContain('ConstraintError');
    expect(message).not.toContain('{');
  });

  test('hangs its why/fix/note branches as a rooted 3-space treestruct', () => {
    // rooted tree: why + fix + note hang under the summary via 3-space connectors;
    // the install list nests one level deeper under the fix branch's │ spine
    expect(message).toContain('\n   ├─ why:');
    expect(message).toContain('\n   ├─ fix:');
    expect(message).toContain('\n   └─ note:');
    expect(message).toContain('├─ brew install age');
    expect(message).toContain('└─ apt install age');
    // never the 2-space off-by-one that a peer message once had
    expect(message).not.toContain('\n  ├─ why:');
  });
});
