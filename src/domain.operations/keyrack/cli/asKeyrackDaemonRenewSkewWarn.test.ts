import { given, then, when } from 'test-fns';

import { asKeyrackDaemonRenewSkewWarn } from './asKeyrackDaemonRenewSkewWarn';

describe('asKeyrackDaemonRenewSkewWarn', () => {
  given('[case1] one key a prior-build daemon will not renew', () => {
    when('[t0] the rack has an owner', () => {
      const lines = asKeyrackDaemonRenewSkewWarn({
        slugs: ['ahbode.camp.AWS_PROFILE'],
        owner: 'ehmpath',
      });

      then('it names the key and the prune that cures it', () => {
        expect(lines).toContain('   ├─ ahbode.camp.AWS_PROFILE');
        expect(lines).toContain(
          '      ├─ rhx keyrack daemon prune --owner ehmpath',
        );
      });

      then('it renders the warn shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case2] two keys, in a rack with no owner', () => {
    when('[t0] it is rendered', () => {
      const lines = asKeyrackDaemonRenewSkewWarn({
        slugs: ['ahbode.camp.AWS_PROFILE', 'ahbode.prep.AWS_PROFILE'],
        owner: null,
      });

      then('the header counts the keys and the fix names no owner', () => {
        expect(lines[0]).toContain('these 2 keys');
        expect(lines).toContain('      ├─ rhx keyrack daemon prune');
      });

      then('it renders the warn shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });
});
