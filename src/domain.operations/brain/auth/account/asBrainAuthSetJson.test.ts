import { given, then, when } from 'test-fns';

import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';

import { asBrainAuthSetJson } from './asBrainAuthSetJson';

const key = '@all.prep.BRAINS_AUTH__OF__CLAUDE_CODE_OAUTH_TOKEN';

describe('asBrainAuthSetJson', () => {
  given('[case1] a new account filed', () => {
    when('[t0] the envelope is built', () => {
      const json = asBrainAuthSetJson({
        account: genSampleBrainAuthAccount({
          email: 'one@example.com',
          orgId: 'org-one',
        }),
        outcome: 'stored',
        owner: 'ehmpath',
        key,
      });
      then('it names the account, the outcome, the owner, and the key', () => {
        expect(json.account.email).toEqual('one@example.com');
        expect(json.outcome).toEqual('stored');
        expect(json.owner).toEqual('ehmpath');
        expect(json.key).toEqual(key);
      });
      then('it holds no token', () => {
        expect(Object.keys(json).sort()).toEqual([
          'account',
          'key',
          'outcome',
          'owner',
        ]);
      });
      then('the envelope matches its snapshot', () => {
        expect(json).toMatchSnapshot();
      });
    });
  });

  given('[case2] an account set again, with no org named', () => {
    when('[t0] the outcome is renewed', () => {
      const json = asBrainAuthSetJson({
        account: genSampleBrainAuthAccount({ email: 'two@example.com' }),
        outcome: 'renewed',
        owner: 'ehmpath',
        key,
      });
      then('the outcome reads renewed', () => {
        expect(json.outcome).toEqual('renewed');
      });
      then('the envelope matches its snapshot', () => {
        expect(json).toMatchSnapshot();
      });
    });
  });
});
