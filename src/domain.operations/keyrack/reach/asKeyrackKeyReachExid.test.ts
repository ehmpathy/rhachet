import { given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = clamps the parse↔render round trip on a reach exid
 * .why = one grammar serves three surfaces — the cli flag, the repo manifest, and the
 *        daemon's store key — and it holds only while `asKeyrackKeyReach` and
 *        `asKeyrackKeyReachExid` stay exact inverses. were the render to reshape an
 *        exid at all, a human's exid and the exid keyrack files it under would
 *        diverge, and the key they set would not be the key they unlock
 */
describe('asKeyrackKeyReachExid', () => {
  given('[case1] an exid a human wrote', () => {
    const EXIDS = [
      'beav@ehmpathy.com', // the os.secure account juggle
      'github://org=ehmpathy', // the github-app mint convention
      'ehmpathy', // a bare word: legal, since keyrack reads no scheme
      'prod-vpn', // punctuation a human might reach for
      'ЖΩ日本', // non-ascii: an exid is plaintext, not an identifier
    ];

    when('[t0] it is parsed and rendered back', () => {
      then('it returns byte for byte, unreshaped', () => {
        for (const exid of EXIDS)
          expect(
            asKeyrackKeyReachExid({ reach: asKeyrackKeyReach({ exid }) }),
          ).toEqual(exid);
      });
    });
  });

  given('[case2] two exids that differ only in case', () => {
    when('[t0] both are rendered', () => {
      then('they stay distinct — a reach is never case-folded', () => {
        // .note = a case fold here would silently merge two reaches into one key,
        //         which is the collision reach-as-identity exists to make impossible
        expect(
          asKeyrackKeyReachExid({
            reach: asKeyrackKeyReach({ exid: 'Beav@Ehmpathy.com' }),
          }),
        ).not.toEqual(
          asKeyrackKeyReachExid({
            reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
          }),
        );
      });
    });
  });
});
