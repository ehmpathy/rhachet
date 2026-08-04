import { given, then, useBeforeAll, when } from 'test-fns';

import { getOneDeclastructAws } from './getOneDeclastructAws';

/**
 * .what = integration test for the declastruct-aws surface loader
 * .why = the peer is a real optional dependency, so a true integration test loads the actual
 *        module (no mocks) and asserts BOTH seams are present: the deep sdkSsm read seam and the
 *        public DAO write seam (setSsmParameterSecure + its domain object)
 */
describe('getOneDeclastructAws', () => {
  given('[case1] the declastruct-aws peer is installed', () => {
    const surface = useBeforeAll(async () => getOneDeclastructAws());

    when('[t0] the surface is loaded', () => {
      then('it exposes the raw sdkSsm read seam', () => {
        expect(surface.sdkSsm).toBeDefined();
        expect(typeof surface.sdkSsm.getOneParameter).toEqual('function');
      });

      then('it exposes the public setSsmParameterSecure write seam', () => {
        expect(typeof surface.setSsmParameterSecure).toEqual('function');
      });

      then('it exposes the DeclaredAwsSsmParameterSecure domain object', () => {
        expect(typeof surface.DeclaredAwsSsmParameterSecure).toEqual(
          'function',
        );
      });
    });
  });
});
