import { given, then, when } from 'test-fns';

import { asUnlockPromptMessage } from './asUnlockPromptMessage';

/**
 * .what = prove the dialog prompt names the full scope + the visual-match code
 * .why  = a contextless prompt is a confused-deputy hole; every in-scope
 *         dimension MUST show so the human authorizes with full knowledge
 *         (rule.forbid.contextless-unlock-prompt)
 */
describe('asUnlockPromptMessage', () => {
  given('[case1] a full scope with reach and key set', () => {
    const scope = {
      owner: 'ehmpath',
      org: 'ehmpathy',
      tree: 'rhachet.vlad.keyrack-identity-unlock',
      branch: 'vlad/keyrack-identity-unlock',
      env: 'test',
      reach: '@this',
      key: '~/.ssh/ehmpath',
      code: '7Q2F',
    };

    when('[t0] the message is rendered', () => {
      const message = asUnlockPromptMessage({ scope });

      then('it leads with the keyrack-unlock header', () => {
        expect(message.split('\n')[0]).toEqual('🔐 keyrack unlock');
      });

      then('it names every always-shown scope word', () => {
        expect(message).toContain('owner:  ehmpath');
        expect(message).toContain('org:    ehmpathy');
        // tree is the worktree/checkout dir — its OWN row, never glued to the branch
        expect(message).toContain(
          'tree:   rhachet.vlad.keyrack-identity-unlock',
        );
        expect(message).toContain('env:    test');
      });

      then('it shows the branch on its own distinct row', () => {
        // branch is a DISTINCT git dimension from tree — its own labelled row
        expect(message).toContain('branch: vlad/keyrack-identity-unlock');
      });

      then('it shows the reach and key when they apply', () => {
        expect(message).toContain('reach:  @this');
        expect(message).toContain('key:    ~/.ssh/ehmpath');
      });

      then('it shows the visual-match code', () => {
        expect(message).toContain('code:   7Q2F');
      });

      then('it matches the approved layout', () => {
        expect(message).toMatchSnapshot();
      });
    });
  });

  given('[case2] a scope with no reach and no key', () => {
    const scope = {
      owner: 'ehmpath',
      org: 'ehmpathy',
      tree: 'rhachet',
      branch: 'main',
      env: 'prod',
      reach: null,
      key: null,
      code: 'K4M9',
    };

    when('[t0] the message is rendered', () => {
      const message = asUnlockPromptMessage({ scope });

      then('it omits the reach row entirely (never an empty field)', () => {
        expect(message).not.toContain('reach:');
      });

      then('it omits the key row entirely (never an empty field)', () => {
        expect(message).not.toContain('key:');
      });

      then('it still shows the always-shown words and the code', () => {
        expect(message).toContain('owner:  ehmpath');
        expect(message).toContain('org:    ehmpathy');
        // tree (worktree/checkout dir) and branch each on their own distinct row —
        // here a normal checkout, so tree is the bare repo dir, branch is `main`
        expect(message).toContain('tree:   rhachet');
        expect(message).toContain('branch: main');
        expect(message).toContain('env:    prod');
        expect(message).toContain('code:   K4M9');
      });
    });
  });

  given('[case3] a detached HEAD (no branch to name)', () => {
    const scope = {
      owner: 'ehmpath',
      org: 'ehmpathy',
      tree: 'rhachet.vlad.keyrack-identity-unlock',
      branch: null,
      env: 'test',
      reach: null,
      key: null,
      code: 'H7X3',
    };

    when('[t0] the message is rendered', () => {
      const message = asUnlockPromptMessage({ scope });

      then('it omits the branch row entirely (never an empty field)', () => {
        expect(message).not.toContain('branch:');
      });

      then('it still shows the tree and the always-shown words', () => {
        expect(message).toContain(
          'tree:   rhachet.vlad.keyrack-identity-unlock',
        );
        expect(message).toContain('env:    test');
        expect(message).toContain('code:   H7X3');
      });
    });
  });
});
