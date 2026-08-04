import { given, then, when } from 'test-fns';

import { isKeyrackAwsParamName } from './isKeyrackAwsParamName';

describe('isKeyrackAwsParamName', () => {
  given('[case1] a legal SSM path name', () => {
    const name =
      '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/prod/ANTHROPIC_API_KEY';

    when('[t0] assessed', () => {
      then('it passes', () => {
        expect(isKeyrackAwsParamName.assess(name)).toEqual(true);
      });
      then('assure returns the value', () => {
        expect(isKeyrackAwsParamName.assure(name)).toEqual(name);
      });
    });
  });

  given('[case2] a bare legal name with no slashes', () => {
    when('[t0] assessed', () => {
      then('it passes', () => {
        expect(isKeyrackAwsParamName.assess('ANTHROPIC_API_KEY')).toEqual(true);
      });
    });
  });

  given('[case3] malformed names', () => {
    const cases = [
      { desc: 'has a space', value: '/keyrack/foo bar' },
      { desc: 'has an equals', value: '/keyrack/vault=aws.params/x' },
      { desc: 'has an aws prefix', value: '/aws/foo' },
      { desc: 'has an ssm prefix', value: '/ssm/foo' },
      { desc: 'is empty', value: '' },
      { desc: 'slashed but has no slash prefix', value: 'keyrack/foo' },
    ];

    cases.forEach((thisCase) => {
      when(`[t0] ${thisCase.desc}`, () => {
        then('assess is false', () => {
          expect(isKeyrackAwsParamName.assess(thisCase.value)).toEqual(false);
        });
        then('assure throws', () => {
          expect(() => isKeyrackAwsParamName.assure(thisCase.value)).toThrow();
        });
      });
    });
  });
});
