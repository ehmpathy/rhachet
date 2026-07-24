import { given, then, when } from 'test-fns';

import { asGithubAppSource } from './asGithubAppSource';

describe('asGithubAppSource', () => {
  given('[case1] app ids and a pem', () => {
    when('[t0] cast to a source blob', () => {
      const source = asGithubAppSource({
        appId: '123456',
        installationId: '78901234',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nabc\n',
      });

      then('it embeds the ids, pem, and the roundtrip mech tag', () => {
        expect(JSON.parse(source)).toEqual({
          appId: '123456',
          installationId: '78901234',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\nabc\n',
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
        });
      });

      then('the raw blob format (key order + structure) stays locked', () => {
        // the raw string is the stored-credential contract deliverForGet reads;
        // a key reorder or whitespace shift would survive the parsed assertion
        expect(source).toMatchSnapshot();
      });
    });
  });
});
