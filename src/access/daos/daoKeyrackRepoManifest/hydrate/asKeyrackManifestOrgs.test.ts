import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asKeyrackManifestOrgs } from './asKeyrackManifestOrgs';

const path = '.agent/keyrack.yml';

describe('asKeyrackManifestOrgs', () => {
  given('[case1] a well-formed org:', () => {
    when('[t0] org: is a scalar', () => {
      then('it is a one-member allowlist', () => {
        expect(asKeyrackManifestOrgs({ org: 'ahbode', path })).toEqual([
          'ahbode',
        ]);
      });
    });

    when('[t1] org: is a list', () => {
      then(
        'the members keep their written order; position 0 is the default',
        () => {
          expect(
            asKeyrackManifestOrgs({ org: ['ahbode', 'bhanya'], path }),
          ).toEqual(['ahbode', 'bhanya']);
        },
      );
    });

    // .note = the grove scope main supports — a manifest of orgless keys (fulcrum F11)
    when('[t2] org: is the scalar @all', () => {
      then('it stays the grove scope', () => {
        expect(asKeyrackManifestOrgs({ org: '@all', path })).toEqual(['@all']);
      });
    });

    when('[t3] org: is a list that holds only @all', () => {
      then('it is still refused — @all is a scope, never a member', () => {
        const error = getError(() =>
          asKeyrackManifestOrgs({ org: ['@all'], path }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain("'@all' cannot be an org: member");
      });
    });
  });

  given('[case2] a malformed org: (refused at parse)', () => {
    const TEST_CASES = [
      {
        description: 'an empty list',
        org: [],
        message: 'keyrack manifest org: lists no org',
      },
      {
        description: 'a blank member',
        org: ['ahbode', ''],
        message: 'keyrack manifest org: member 1 is not an org name',
      },
      {
        description: 'a non-text member',
        org: ['ahbode', 7],
        message: 'keyrack manifest org: member 1 is not an org name',
      },
      {
        description: 'the @all sigil as a member',
        org: ['ahbode', '@all'],
        message: "'@all' cannot be an org: member",
      },
      {
        description: 'the @this sigil as a member',
        org: ['@this'],
        message: "'@this' cannot be an org: member",
      },
      {
        description: 'a repeated member',
        org: ['ahbode', 'bhanya', 'ahbode'],
        message: "org 'ahbode' is listed more than once",
      },
    ];

    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it refuses as caller-fixable, with the path named', () => {
          const error = getError(() =>
            asKeyrackManifestOrgs({ org: thisCase.org, path }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(thisCase.message);
          expect(error.message).toContain(path);
        });
      }),
    );
  });
});
