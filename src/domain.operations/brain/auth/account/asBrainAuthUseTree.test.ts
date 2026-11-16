import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';
import { genSampleBrainAuthUsageWindow } from '@src/.test/assets/genSampleBrainAuthUsageWindow';

import { asBrainAuthUseTree } from './asBrainAuthUseTree';

const now = asIsoTimeStamp('2026-11-14T09:00:00Z');
const accountOne = genSampleBrainAuthAccount({
  email: 'one@example.com',
  orgId: 'org-one',
});
const accountTwo = genSampleBrainAuthAccount({ email: 'two@example.com' });
const weekCapped = genSampleBrainAuthUsageWindow({
  slug: 'week',
  usedShare: 1,
  resetsAt: '2026-11-18T09:00:00Z',
});
const sessionCappedNoReset = genSampleBrainAuthUsageWindow({
  slug: 'session',
  usedShare: 1,
  resetsAt: null,
});

describe('asBrainAuthUseTree', () => {
  given('[case1] a swap from one account to another', () => {
    when('[t0] the prior account was stowed, and naught else to warn', () => {
      const tree = asBrainAuthUseTree({
        outcome: 'swapped',
        before: accountOne,
        after: accountTwo,
        stowed: 'one@example.com',
        windowsCapped: [],
        clonesLive: [],
        owner: 'ehmpath',
        now,
      });
      then('it shows before and after as email and org', () => {
        expect(tree).toContain('before = one@example.com (org org-one)');
        expect(tree).toContain('after = two@example.com (org unknown)');
      });
      then('it names the stow and the read back', () => {
        expect(tree).toContain('stowed in keyrack = one@example.com');
        expect(tree).toContain('└─ landed, read back from the grove');
      });
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth use --scope grove');
        expect(tree).toMatchSnapshot();
      });
    });

    when('[t1] the target is capped, and two clones live on the prior', () => {
      const tree = asBrainAuthUseTree({
        outcome: 'swapped',
        before: accountOne,
        after: accountTwo,
        stowed: 'one@example.com',
        windowsCapped: [sessionCappedNoReset, weekCapped],
        clonesLive: ['@:driver', '@:foreman'],
        owner: 'ehmpath',
        now,
      });
      then('it warns the target is capped, with each full window', () => {
        expect(tree).toContain('🟡 two@example.com is capped until its reset');
        expect(tree).toContain('├─ session reset unknown');
        expect(tree).toContain('└─ week resets in 4d');
      });
      then('no clock time is rendered', () => {
        expect(tree).not.toMatch(/\d{2}:\d{2}/);
      });
      then('it names each live clone and the risk to the prior account', () => {
        expect(tree).toContain('├─ @:driver');
        expect(tree).toContain('└─ @:foreman');
        expect(tree).toContain('🟡 one@example.com is at risk while they live');
      });
      then('no glyph of ambiguous width is used', () => {
        expect(tree).not.toContain('⚠️');
      });
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth use --scope grove');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case4] a swap whose target usage could not be read', () => {
    when('[t0] the caps are unknown', () => {
      const tree = asBrainAuthUseTree({
        outcome: 'swapped',
        before: accountOne,
        after: accountTwo,
        stowed: 'one@example.com',
        windowsCapped: null,
        clonesLive: [],
        owner: 'ehmpath',
        now,
      });
      then(
        'it says the usage was unread, never that the target is clear',
        () => {
          expect(tree).toContain(
            '🟡 two@example.com usage unread, so a full window cannot be named',
          );
          expect(tree).not.toContain('is capped until its reset');
          expect(tree).toContain('└─ landed, read back from the grove');
        },
      );
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth use --scope grove');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case2] a swap from a grove with no signed-in account', () => {
    when('[t0] there was naught to stow', () => {
      const tree = asBrainAuthUseTree({
        outcome: 'swapped',
        before: null,
        after: accountTwo,
        stowed: null,
        windowsCapped: [],
        clonesLive: ['@:driver'],
        owner: 'ehmpath',
        now,
      });
      then('before reads none, and no stow or clone risk is named', () => {
        expect(tree).toContain('before = none');
        expect(tree).not.toContain('stowed in keyrack');
        expect(tree).not.toContain('at risk');
      });
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth use --scope grove');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case3] a use of the account the grove already holds', () => {
    when('[t0] the outcome is unchanged', () => {
      const tree = asBrainAuthUseTree({
        outcome: 'unchanged',
        before: accountOne,
        after: accountOne,
        stowed: null,
        windowsCapped: [],
        clonesLive: [],
        owner: 'ehmpath',
        now,
      });
      then('it shows only after, and says unchanged', () => {
        expect(tree).toContain('after = one@example.com (org org-one)');
        expect(tree).not.toContain('before =');
        expect(tree).toContain(
          'unchanged, the grove already uses this account',
        );
      });
      then('the tree matches its snapshot', () => {
        expect(tree.split('\n')[0]).toEqual('🧠 brains auth use --scope grove');
        expect(tree).toMatchSnapshot();
      });
    });
  });
});
