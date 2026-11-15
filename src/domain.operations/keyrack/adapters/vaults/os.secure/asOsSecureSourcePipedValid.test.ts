import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';

import { asOsSecureSourcePipedValid } from './asOsSecureSourcePipedValid';

const BLOB_WELLFORMED = JSON.stringify({
  appId: '1',
  installationId: '2',
  privateKey: 'fake-pem-body',
  mech: 'EPHEMERAL_VIA_GITHUB_APP',
});

describe('asOsSecureSourcePipedValid', () => {
  given('[case1] a well-formed github-app blob', () => {
    when('[t0] checked against the github-app mech', () => {
      then('returns the blob as-is', () => {
        const source = asOsSecureSourcePipedValid({
          source: BLOB_WELLFORMED,
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
          slug: 'testorg.all.EHMPATH_BEAVER_GITHUB_TOKEN',
          mechAdapter: mechAdapterGithubApp,
        });
        expect(source).toEqual(BLOB_WELLFORMED);
      });
    });
  });

  given('[case2] a blob that lacks its private key', () => {
    const blobMalformed = JSON.stringify({ appId: '1', installationId: '2' });

    when('[t0] checked against the github-app mech', () => {
      then('refuses with the mech reasons, never the value', async () => {
        const error = await getError(() =>
          asOsSecureSourcePipedValid({
            source: blobMalformed,
            mech: 'EPHEMERAL_VIA_GITHUB_APP',
            slug: 'testorg.all.EHMPATH_BEAVER_GITHUB_TOKEN',
            mechAdapter: mechAdapterGithubApp,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not a valid source for its mech');
        expect(JSON.stringify(error)).toContain('privateKey');
        expect(JSON.stringify(error)).not.toContain('"appId":"1"');
      });
    });
  });

  given('[case3] a non-json value against the github-app mech', () => {
    when('[t0] checked', () => {
      then('refuses: value is not valid json', async () => {
        const error = await getError(() =>
          asOsSecureSourcePipedValid({
            source: 'not-a-blob',
            mech: 'EPHEMERAL_VIA_GITHUB_APP',
            slug: 'testorg.all.EHMPATH_BEAVER_GITHUB_TOKEN',
            mechAdapter: mechAdapterGithubApp,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(JSON.stringify(error)).toContain('not valid json');
        expect(JSON.stringify(error)).not.toContain('not-a-blob');
      });
    });
  });

  given(
    '[case5] an empty source, as an sdk caller with no cli guard may pass',
    () => {
      when('[t0] checked', () => {
        then('refuses with the empty-value floor', async () => {
          const error = await getError(() =>
            asOsSecureSourcePipedValid({
              source: '  \n',
              mech: 'PERMANENT_VIA_REPLICA',
              slug: 'testorg.test.SOME_TOKEN',
              mechAdapter: mechAdapterReplica,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('received an empty value');
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );

  given('[case4] a plain token against the replica mech', () => {
    when('[t0] checked', () => {
      then('returns the token as-is', () => {
        const source = asOsSecureSourcePipedValid({
          source: 'plain-token-fake',
          mech: 'PERMANENT_VIA_REPLICA',
          slug: 'testorg.test.SOME_TOKEN',
          mechAdapter: mechAdapterReplica,
        });
        expect(source).toEqual('plain-token-fake');
      });
    });
  });
});
