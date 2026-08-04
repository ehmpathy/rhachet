import { given, then, when } from 'test-fns';

import { isKeyrackAwsParamMeta } from './isKeyrackAwsParamMeta';

describe('isKeyrackAwsParamMeta', () => {
  given('[case1] meta with a region', () => {
    when('[t0] assessed', () => {
      then('it passes and narrows', () => {
        const meta = { region: 'us-east-1' };
        expect(isKeyrackAwsParamMeta.assess(meta)).toEqual(true);
        expect(isKeyrackAwsParamMeta.assure(meta)).toEqual(meta);
      });
    });
  });

  given('[case2] meta without a region', () => {
    const cases = [
      { desc: 'region absent', value: { other: 'x' } },
      { desc: 'region empty', value: { region: '' } },
      { desc: 'region wrong type', value: { region: 123 } },
      { desc: 'null', value: null },
      { desc: 'not an object', value: 'us-east-1' },
    ];

    cases.forEach((thisCase) => {
      when(`[t0] ${thisCase.desc}`, () => {
        then('assess is false and assure throws', () => {
          expect(isKeyrackAwsParamMeta.assess(thisCase.value)).toEqual(false);
          expect(() => isKeyrackAwsParamMeta.assure(thisCase.value)).toThrow();
        });
      });
    });
  });
});
