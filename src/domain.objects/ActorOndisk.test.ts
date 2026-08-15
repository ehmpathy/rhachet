import { getUniqueIdentifier } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { ActorOndisk } from './ActorOndisk';

describe('ActorOndisk', () => {
  given('[case1] the ActorOndisk class', () => {
    when('[t0] the key statics are checked', () => {
      then('the natural key { repoPath, hash } IS the unique key', () => {
        expect(ActorOndisk.unique).toEqual(['repoPath', 'hash']);
      });
    });
  });

  given('[case2] an ActorOndisk instance', () => {
    when('[t0] constructed with a brain + roleset', () => {
      const actor = new ActorOndisk({
        repoPath: '/home/dev/repo',
        hash: '9c1e0af3',
        brain: 'claude',
        roles: ['mechanic'],
      });

      then('the fields are accessible', () => {
        expect(actor.repoPath).toEqual('/home/dev/repo');
        expect(actor.hash).toEqual('9c1e0af3');
        expect(actor.brain).toEqual('claude');
        expect(actor.roles).toEqual(['mechanic']);
      });
    });
  });

  given('[case3] identity is keyed on { repoPath, hash }', () => {
    when('[t0] two records share the same repoPath + hash', () => {
      const a = new ActorOndisk({
        repoPath: '/home/dev/repo',
        hash: '9c1e0af3',
        brain: 'claude',
        roles: ['mechanic'],
      });
      const b = new ActorOndisk({
        repoPath: '/home/dev/repo',
        hash: '9c1e0af3',
        brain: 'claude',
        roles: ['driver'], // a non-key field differs — identity must still match
      });

      then('they share one unique identifier', () => {
        expect(getUniqueIdentifier(a)).toEqual(getUniqueIdentifier(b));
      });
    });

    when('[t1] the same hash lands in a different repoPath', () => {
      const a = new ActorOndisk({
        repoPath: '/home/dev/repoA',
        hash: '9c1e0af3',
        brain: 'claude',
        roles: ['mechanic'],
      });
      const b = new ActorOndisk({
        repoPath: '/home/dev/repoB',
        hash: '9c1e0af3',
        brain: 'claude',
        roles: ['mechanic'],
      });

      then('the two repos never collide on a bare hash', () => {
        expect(getUniqueIdentifier(a)).not.toEqual(getUniqueIdentifier(b));
      });
    });
  });
});
