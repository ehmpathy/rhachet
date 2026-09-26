import { given, then, when } from 'test-fns';

import { getAllSshKeyCandidatePaths } from './getAllSshKeyCandidatePaths';

/**
 * .what = prove the ONE shared key-precedence: owner first, then prescribed, then
 *         the standard default names — de-duped, order preserved
 * .why  = init (seal) and unlock's Variant A (re-derive K) both consume this, so a
 *         proof of the precedence here is a proof they cannot diverge. the function
 *         is pure over process.env.HOME, so this is a unit (no fs)
 */
describe('getAllSshKeyCandidatePaths', () => {
  const HOME = '/home/tester';
  const withHome = <T>(fn: () => T): T => {
    const prior = process.env.HOME;
    process.env.HOME = HOME;
    try {
      return fn();
    } finally {
      process.env.HOME = prior;
    }
  };

  given('[case1] an owner and no prescribed keys', () => {
    when('[t0] the candidates are built', () => {
      then('the owner key comes first, then the standard names', () => {
        const paths = withHome(() =>
          getAllSshKeyCandidatePaths({ owner: 'ehmpath' }),
        );
        expect(paths).toEqual([
          `${HOME}/.ssh/ehmpath`,
          `${HOME}/.ssh/id_ed25519`,
          `${HOME}/.ssh/id_rsa`,
          `${HOME}/.ssh/id_ecdsa`,
        ]);
      });
    });
  });

  given('[case2] no owner and no prescribed keys', () => {
    when('[t0] the candidates are built', () => {
      then('only the standard names are returned, in order', () => {
        const paths = withHome(() =>
          getAllSshKeyCandidatePaths({ owner: null }),
        );
        expect(paths).toEqual([
          `${HOME}/.ssh/id_ed25519`,
          `${HOME}/.ssh/id_rsa`,
          `${HOME}/.ssh/id_ecdsa`,
        ]);
      });
    });
  });

  given('[case3] an owner plus prescribed keys', () => {
    when('[t0] the candidates are built', () => {
      then('order is owner, then prescribed, then standard', () => {
        const paths = withHome(() =>
          getAllSshKeyCandidatePaths({
            owner: 'ehmpath',
            prescribed: ['/custom/key'],
          }),
        );
        expect(paths).toEqual([
          `${HOME}/.ssh/ehmpath`,
          '/custom/key',
          `${HOME}/.ssh/id_ed25519`,
          `${HOME}/.ssh/id_rsa`,
          `${HOME}/.ssh/id_ecdsa`,
        ]);
      });
    });
  });

  given('[case4] a prescribed path equal to a standard default', () => {
    when('[t0] the candidates are built', () => {
      then('the duplicate is de-duped, first position wins', () => {
        const paths = withHome(() =>
          getAllSshKeyCandidatePaths({
            owner: null,
            prescribed: [`${HOME}/.ssh/id_ed25519`],
          }),
        );
        expect(paths).toEqual([
          `${HOME}/.ssh/id_ed25519`,
          `${HOME}/.ssh/id_rsa`,
          `${HOME}/.ssh/id_ecdsa`,
        ]);
      });
    });
  });
});
