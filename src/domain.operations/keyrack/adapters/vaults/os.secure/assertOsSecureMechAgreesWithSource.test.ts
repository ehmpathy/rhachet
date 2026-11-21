import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertOsSecureMechAgreesWithSource } from './assertOsSecureMechAgreesWithSource';

const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const BLOB_GITHUB_APP = JSON.stringify({
  appId: '1',
  installationId: '2',
  privateKey: 'fake-pem-body',
  mech: 'EPHEMERAL_VIA_GITHUB_APP',
});

describe('assertOsSecureMechAgreesWithSource', () => {
  given('[case1] a mech and a source that agree', () => {
    when('[t0] github-app mech over a github-app blob', () => {
      then('it passes', () => {
        expect(() =>
          assertOsSecureMechAgreesWithSource({
            mech: 'EPHEMERAL_VIA_GITHUB_APP',
            source: BLOB_GITHUB_APP,
            slug: SLUG,
          }),
        ).not.toThrow();
      });
    });

    when('[t1] any mech over a plain value', () => {
      then('it passes', () => {
        expect(() =>
          assertOsSecureMechAgreesWithSource({
            mech: 'EPHEMERAL_VIA_GITHUB_APP',
            source: 'ghp_plainvalue',
            slug: SLUG,
          }),
        ).not.toThrow();
      });
    });

    when('[t2] no mech asked', () => {
      then('it passes', () => {
        expect(() =>
          assertOsSecureMechAgreesWithSource({
            mech: null,
            source: BLOB_GITHUB_APP,
            slug: SLUG,
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a replica mech over a github-app blob', () => {
    when('[t0] asserted', () => {
      then('it refuses with the mismatch', async () => {
        const error = await getError(() =>
          assertOsSecureMechAgreesWithSource({
            mech: 'PERMANENT_VIA_REPLICA',
            source: BLOB_GITHUB_APP,
            slug: SLUG,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('mech mismatch');
      });
    });
  });

  given(
    '[case3] a replica mech over a github-app blob that names no mech',
    () => {
      when('[t0] asserted', () => {
        then(
          'it refuses, so the private key is never served as a token',
          async () => {
            const blobMechless = JSON.stringify({
              appId: '1',
              installationId: '2',
              privateKey: 'fake-pem-body',
            });
            const error = await getError(() =>
              assertOsSecureMechAgreesWithSource({
                mech: 'PERMANENT_VIA_REPLICA',
                source: blobMechless,
                slug: SLUG,
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('mech mismatch');
            expect(error.message).not.toContain('fake-pem-body');
          },
        );
      });
    },
  );
});
