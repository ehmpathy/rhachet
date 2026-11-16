import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneOsSecureMechOfSourcePiped } from './getOneOsSecureMechOfSourcePiped';

const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const BLOB_FIELDS = {
  appId: '1',
  installationId: '2',
  privateKey: 'fake-pem-body',
};

const TEST_CASES_INFERRED = [
  {
    description: 'a blob that names its mech yields that mech',
    source: JSON.stringify({
      ...BLOB_FIELDS,
      mech: 'EPHEMERAL_VIA_GITHUB_APP',
    }),
    mech: 'EPHEMERAL_VIA_GITHUB_APP',
  },
  {
    description: 'a github-app blob that names no mech yields github-app',
    source: JSON.stringify(BLOB_FIELDS),
    mech: 'EPHEMERAL_VIA_GITHUB_APP',
  },
];

const TEST_CASES_REFUSED = [
  {
    description: 'ciphertext (not json) is refused',
    source: 'AQICAHh-this-looks-like-kms-ciphertext==',
  },
  {
    description: 'a truncated blob is refused',
    source: '{"appId":"1","installationId":"2","privateKey":"fake',
  },
  {
    description: 'json with no github-app shape and no mech is refused',
    source: JSON.stringify({ hello: 'world' }),
  },
];

describe('getOneOsSecureMechOfSourcePiped', () => {
  given('[case1] a source whose mech can be read', () => {
    TEST_CASES_INFERRED.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('the mech is returned', () => {
          expect(
            getOneOsSecureMechOfSourcePiped({
              source: thisCase.source,
              slug: SLUG,
            }),
          ).toEqual(thisCase.mech);
        });
      }),
    );
  });

  given('[case2] a source whose mech cannot be read', () => {
    TEST_CASES_REFUSED.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(
          'it is refused, names --mech, and never echoes the value',
          async () => {
            const error = await getError(() =>
              getOneOsSecureMechOfSourcePiped({
                source: thisCase.source,
                slug: SLUG,
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('pass --mech');
            expect(JSON.stringify(error)).not.toContain(thisCase.source);
          },
        );
      }),
    );
  });
});
