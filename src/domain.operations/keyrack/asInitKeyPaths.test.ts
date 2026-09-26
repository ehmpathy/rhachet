import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asInitKeyPaths } from './asInitKeyPaths';

/**
 * .what = prove the pure branches of the init key-path transform: a pubkey VALUE is
 *         rejected, a .pub path maps to its private-key twin, a plain path is used
 *         as-is (with a .pub twin)
 * .why  = the transform had only transitive coverage via initKeyrack; its two
 *         error/path branches over an explicit --pubkey are pure and deserve a direct
 *         unit (rule.require.test-coverage-by-grain). the no-pubkey branch reads the
 *         filesystem (getAllSshKeyCandidatePaths) and is exercised at the integration
 *         grain instead
 *
 * .note = unit (pure) — only the --pubkey-provided branches are covered here; they
 *         touch no filesystem
 */
describe('asInitKeyPaths', () => {
  given('[case1] a --pubkey that is a key VALUE, not a path', () => {
    when('[t0] an ssh- value is passed', () => {
      then(
        'it rejects with a BadRequestError (init needs the private path)',
        () => {
          const error = getError(() =>
            asInitKeyPaths({
              pubkey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5',
              owner: null,
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
        },
      );
    });

    when('[t1] an age value is passed', () => {
      then('it rejects with a BadRequestError', () => {
        const error = getError(() =>
          asInitKeyPaths({ pubkey: 'age1q{{redacted}}', owner: null }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('[case2] a --pubkey that is a .pub file path', () => {
    when('[t0] the path is resolved', () => {
      then('it maps to the private-key twin + a .pub pubkey path', () => {
        expect(
          asInitKeyPaths({
            pubkey: '/home/me/.ssh/id_ed25519.pub',
            owner: null,
          }),
        ).toEqual({
          prikeyPath: '/home/me/.ssh/id_ed25519',
          pubkeyPath: '/home/me/.ssh/id_ed25519.pub',
          mech: 'ssh',
        });
      });
    });
  });

  given('[case3] a --pubkey that is a plain (private-key) path', () => {
    when('[t0] the path is resolved', () => {
      then('it uses the path as-is and derives the .pub twin', () => {
        expect(
          asInitKeyPaths({ pubkey: '/home/me/.ssh/id_ed25519', owner: null }),
        ).toEqual({
          prikeyPath: '/home/me/.ssh/id_ed25519',
          pubkeyPath: '/home/me/.ssh/id_ed25519.pub',
          mech: 'ssh',
        });
      });
    });
  });
});
