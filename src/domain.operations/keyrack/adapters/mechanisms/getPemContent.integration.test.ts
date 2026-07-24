import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genTempPemFile } from '@src/.test/assets/genTempPemFile';

import { getPemContent } from './getPemContent';

describe('getPemContent', () => {
  given('[case1] a pem file that exists on disk', () => {
    const scene = useBeforeAll(async () =>
      genTempPemFile({ content: '-----BEGIN RSA PRIVATE KEY-----\nabc\n' }),
    );

    when('[t0] the pem content is read', () => {
      then('it returns the file content', () => {
        expect(getPemContent({ path: scene.path })).toEqual(scene.content);
      });
    });
  });

  given('[case2] a pem path that does not exist', () => {
    when('[t0] the pem content is read', () => {
      then('it fails loud with the absent path', async () => {
        const error = await getError(() =>
          getPemContent({ path: '/no/such/app.pem' }),
        );
        expect(error.message).toContain('could not read pem file');
        expect(error.message).toContain('/no/such/app.pem');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
