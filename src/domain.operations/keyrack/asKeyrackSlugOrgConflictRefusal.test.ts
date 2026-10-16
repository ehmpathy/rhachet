import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asKeyrackSlugOrgConflictRefusal } from './asKeyrackSlugOrgConflictRefusal';

describe('asKeyrackSlugOrgConflictRefusal', () => {
  given(
    '[case1] a slug that names one org, and --org that names another',
    () => {
      when('[t0] the refusal is built', () => {
        const error = asKeyrackSlugOrgConflictRefusal({
          key: 'bhanya.camp.AWS_PROFILE',
          orgAsked: 'ahbode',
          orgOfSlug: 'bhanya',
        });

        then('it is a ConstraintError, so the cli exits 2', () => {
          expect(error).toBeInstanceOf(ConstraintError);
        });

        then('the message names both the --org given and the slug', () => {
          expect(error.message).toContain(
            '--org ahbode conflicts with org in slug bhanya.camp.AWS_PROFILE',
          );
        });

        then(
          'the metadata carries the key, the org given, and the slug org',
          () => {
            expect(error.metadata).toMatchObject({
              key: 'bhanya.camp.AWS_PROFILE',
              org: { given: 'ahbode', ofSlug: 'bhanya' },
            });
          },
        );

        then('the hint names both fixes, with the slug org spelled out', () => {
          expect(error.metadata?.hint).toEqual(
            'drop --org, or pass --org bhanya to match the slug',
          );
        });
      });
    },
  );
});
