import { given, then, when } from 'test-fns';

import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';

import { asBrainAuthSetTree } from './asBrainAuthSetTree';

const key = '@all.prep.BRAINS_AUTH__OF__CLAUDE_CODE_OAUTH_TOKEN';

describe('asBrainAuthSetTree', () => {
  given('[case1] a new account filed', () => {
    when('[t0] the provider named its org', () => {
      const tree = asBrainAuthSetTree({
        account: genSampleBrainAuthAccount({
          email: 'one@example.com',
          orgId: 'org-one',
        }),
        outcome: 'stored',
        owner: 'ehmpath',
        key,
      });
      then('it names the account, its org, its key, and the outcome', () => {
        expect(tree).toContain('├─ one@example.com');
        expect(tree).toContain('├─ org = org-one');
        expect(tree).toContain(`└─ key = ${key}`);
        expect(tree).toContain('├─ stored');
        expect(tree).toContain(
          '└─ next = rhx brains auth use --account one@example.com --scope grove',
        );
      });
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth set');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case2] an account set again, with no org named', () => {
    when('[t0] the outcome is renewed', () => {
      const tree = asBrainAuthSetTree({
        account: genSampleBrainAuthAccount({ email: 'two@example.com' }),
        outcome: 'renewed',
        owner: 'ehmpath',
        key,
      });
      then(
        'the org reads unknown, and the outcome says the account was held',
        () => {
          expect(tree).toContain('org = unknown');
          expect(tree).toContain(
            '├─ renewed — already held; the new login replaces the held one',
          );
        },
      );
      then('the owner leads the tree', () => {
        expect(tree.split('\n')[1]).toEqual('   ├─ owner = ehmpath');
      });
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth set');
        expect(tree).toMatchSnapshot();
      });
    });
  });
});
