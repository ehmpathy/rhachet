import { given, then, when } from 'test-fns';

import { asKeyrackAwsParamRoundtripDefect } from './asKeyrackAwsParamRoundtripDefect';

describe('asKeyrackAwsParamRoundtripDefect', () => {
  given('[case1] a clean roundtrip', () => {
    when('[t0] read-back equals written', () => {
      then('it returns null', () => {
        expect(
          asKeyrackAwsParamRoundtripDefect({
            written: 'blob',
            readback: { value: 'blob' },
            exid: '/x',
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case2] an absent read-back', () => {
    when('[t0] read-back is null', () => {
      const defect = asKeyrackAwsParamRoundtripDefect({
        written: 'blob',
        readback: null,
        exid: '/x',
      });

      then('it reports a path/consistency defect', () => {
        expect(defect?.message).toContain('did not read back');
      });
      then('the hint notes a value may now sit at exid', () => {
        expect(defect?.hint).toContain('/x');
      });
    });
  });

  given('[case3] a value mismatch', () => {
    when('[t0] read-back differs from written', () => {
      const defect = asKeyrackAwsParamRoundtripDefect({
        written: 'blob',
        readback: { value: 'other' },
        exid: '/x',
      });

      then('it reports a decrypt/grant defect', () => {
        expect(defect?.message).toContain('did not match');
      });
      then('the hint names kms:Decrypt', () => {
        expect(defect?.hint).toContain('kms:Decrypt');
      });
    });
  });
});
