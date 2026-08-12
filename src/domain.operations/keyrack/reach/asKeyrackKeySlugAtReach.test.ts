import { given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

describe('asKeyrackKeySlugAtReach', () => {
  given('[case1:e1] a slug with no reach', () => {
    when('[t0] the key is addressed', () => {
      then('it is the bare slug, byte for byte', () => {
        expect(asKeyrackKeySlugAtReach({ slug: 'ahbode.prep.FOO' })).toEqual(
          'ahbode.prep.FOO',
        );
      });

      then('an explicit undefined reach behaves the same', () => {
        expect(
          asKeyrackKeySlugAtReach({
            slug: 'ahbode.prep.FOO',
            reach: undefined,
          }),
        ).toEqual('ahbode.prep.FOO');
      });
    });
  });

  given('[case2] a slug with a reach', () => {
    const reach = asKeyrackKeyReach({ exid: 'github://org=ehmpathy' });

    when('[t0] the key is addressed', () => {
      then('the reach exid is appended, verbatim', () => {
        expect(
          asKeyrackKeySlugAtReach({ slug: 'ahbode.prep.FOO', reach }),
        ).toEqual('ahbode.prep.FOO@github://org=ehmpathy');
      });

      // .note = the exid above happens to LOOK like a uri because the github-app mech
      //         imposes that convention on its own exids. the address builder reads no
      //         scheme and no structure — it appends the plaintext, so an account email
      //         (the os.secure juggle) rides the exact same path
      then('a plaintext account exid rides the identical path', () => {
        expect(
          asKeyrackKeySlugAtReach({
            slug: 'ehmpathy.test.ANTHROPIC_API_KEY',
            reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
          }),
        ).toEqual('ehmpathy.test.ANTHROPIC_API_KEY@beav@ehmpathy.com');
      });
    });
  });

  given('[case3:e9] one slug at two different reaches', () => {
    const reachEhmpathy = asKeyrackKeyReach({ exid: 'github://org=ehmpathy' });
    const reachSeaturtle = asKeyrackKeyReach({
      exid: 'github://org=seaturtle',
    });

    when('[t0] both are addressed', () => {
      then('they never collide', () => {
        expect(
          asKeyrackKeySlugAtReach({
            slug: 'ahbode.prep.FOO',
            reach: reachEhmpathy,
          }),
        ).not.toEqual(
          asKeyrackKeySlugAtReach({
            slug: 'ahbode.prep.FOO',
            reach: reachSeaturtle,
          }),
        );
      });

      then('neither collides with the reachless key', () => {
        const reachless = asKeyrackKeySlugAtReach({ slug: 'ahbode.prep.FOO' });
        expect(
          asKeyrackKeySlugAtReach({
            slug: 'ahbode.prep.FOO',
            reach: reachEhmpathy,
          }),
        ).not.toEqual(reachless);
      });
    });
  });

  given('[case4] a sudo wildcard slug, which already carries an @', () => {
    const reach = asKeyrackKeyReach({ exid: 'github://org=ehmpathy' });

    when('[t0] the key is addressed', () => {
      then('the reachless form stays exactly the wildcard slug', () => {
        expect(asKeyrackKeySlugAtReach({ slug: '@all.sudo.FOO' })).toEqual(
          '@all.sudo.FOO',
        );
      });

      then('the reach form stays distinct from it', () => {
        expect(
          asKeyrackKeySlugAtReach({ slug: '@all.sudo.FOO', reach }),
        ).toEqual('@all.sudo.FOO@github://org=ehmpathy');
      });
    });
  });

  given('[case5:e7] a reach that names the SAME org the slug came from', () => {
    const reachAhbode = asKeyrackKeyReach({ exid: 'github://org=ahbode' });

    when('[t0] the key is addressed', () => {
      then('it is its own key, never collapsed into the reachless one', () => {
        expect(
          asKeyrackKeySlugAtReach({
            slug: 'ahbode.prep.FOO',
            reach: reachAhbode,
          }),
        ).not.toEqual(asKeyrackKeySlugAtReach({ slug: 'ahbode.prep.FOO' }));
      });

      then('an explicit reach is honored even when redundant', () => {
        // a silent collapse here would make e8 order-dependent: whichever of the two
        // was unlocked last would evict the other, so both must stay their own key
        expect(
          asKeyrackKeySlugAtReach({
            slug: 'ahbode.prep.FOO',
            reach: reachAhbode,
          }),
        ).toEqual('ahbode.prep.FOO@github://org=ahbode');
      });
    });
  });

  given('[case6:e16] a reach is optional, never nullable', () => {
    when('[t0] a reachless payload is serialized', () => {
      then('the reach key is DROPPED, so extant bytes are unchanged', () => {
        const payload = { slug: 'ahbode.prep.FOO', reach: undefined };
        expect(JSON.stringify(payload)).toEqual('{"slug":"ahbode.prep.FOO"}');
      });

      then(
        'a null reach would have emitted a byte, which is why it is absent',
        () => {
          const payloadIfNullable = { slug: 'ahbode.prep.FOO', reach: null };
          expect(JSON.stringify(payloadIfNullable)).toContain('"reach":null');
        },
      );
    });
  });
});
