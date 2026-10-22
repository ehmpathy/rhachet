import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertUpgradeRoleSpecsUnfocused } from './assertUpgradeRoleSpecsUnfocused';

describe('assertUpgradeRoleSpecsUnfocused', () => {
  given('[case1] package specs with no focus', () => {
    when('[t0] the specs are bare and qualified roles', () => {
      then('it passes', () => {
        expect(() =>
          assertUpgradeRoleSpecsUnfocused({
            roleSpecs: ['mechanic', 'ehmpathy/driver', '*'],
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a spec with a focus (U2)', () => {
    when('[t0] upgrade --roles mechanic::flow', () => {
      then('it refuses and names the package form as the fix', async () => {
        const error = await getError(() =>
          assertUpgradeRoleSpecsUnfocused({ roleSpecs: ['mechanic::flow'] }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a package has no focus');
        expect(error.message).toContain('rhx upgrade --roles mechanic');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
