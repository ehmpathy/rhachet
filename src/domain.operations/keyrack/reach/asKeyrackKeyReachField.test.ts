import { given, then, when } from 'test-fns';

import { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

/**
 * .what = clamps e16 — the field is OMITTED when no reach was named, never nullable
 * .why = this expression was hand-written at 14 sites, and the reason it must omit rather
 *        than nullify lived at none of them. now it lives here, and the claim that carries
 *        the weight is the json one: `JSON.stringify` drops an `undefined` field and emits
 *        a `null` one, so an omitted reach keeps every reachless render byte-identical (e1)
 */
describe('asKeyrackKeyReachField', () => {
  given('[case1:e1] no reach was named', () => {
    when('[t0] the reach is absent', () => {
      then('the fragment is empty — the field is not present at all', () => {
        const field = asKeyrackKeyReachField({});
        expect(field).toEqual({});
        expect('reach' in field).toEqual(false);
      });

      then('an explicit undefined behaves the same as an absent key', () => {
        const field = asKeyrackKeyReachField({ reach: undefined });
        expect('reach' in field).toEqual(false);
      });

      then(
        'a shape it is spread into serializes as it did before reach',
        () => {
          // e1/e16: this is the whole point. `{ reach: null }` would NOT match, and the
          // encrypted host manifest round-trips this shape on every developer machine
          const grant = {
            slug: 'ehmpathy.test.FOO',
            ...asKeyrackKeyReachField({}),
          };
          expect(JSON.stringify(grant)).toEqual('{"slug":"ehmpathy.test.FOO"}');
        },
      );
    });
  });

  given('[case2] a reach was named', () => {
    const reach = new KeyrackKeyReach({ exid: 'beav@ehmpathy.com' });

    when('[t0] the reach is present', () => {
      then('the fragment carries it, by reference', () => {
        const field = asKeyrackKeyReachField({ reach });
        expect(field).toEqual({ reach });
        expect(field.reach).toBe(reach);
      });

      then('a shape it is spread into serializes with the exid', () => {
        const grant = {
          slug: 'ehmpathy.test.FOO',
          ...asKeyrackKeyReachField({ reach }),
        };
        expect(JSON.stringify(grant)).toContain('beav@ehmpathy.com');
      });
    });
  });
});
