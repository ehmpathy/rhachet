import { given, then, when } from 'test-fns';

import { asTestKeyBegin, asTestKeyEnd, asTestKeyText } from './asTestKeyText';

describe('asTestKeyText', () => {
  given('[case1] an rsa test key body', () => {
    when('[t0] it is framed', () => {
      then('it renders the pem frame a key reader expects, around the body as given', () => {
        expect(asTestKeyText({ kind: 'RSA', body: ['abc', 'def'] })).toEqual(
          [asTestKeyBegin({ kind: 'RSA' }), 'abc', 'def', asTestKeyEnd({ kind: 'RSA' })].join('\n'),
        );
        expect(asTestKeyBegin({ kind: 'RSA' })).toEqual(['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' '));
      });
    });
  });

  given('[case2] an openssh test key body', () => {
    when('[t0] it is framed', () => {
      then('the frame names the openssh kind', () => {
        expect(asTestKeyEnd({ kind: 'OPENSSH' })).toEqual(['-----END OPENSSH', 'PRIVATE KEY-----'].join(' '));
      });
    });
  });
});
