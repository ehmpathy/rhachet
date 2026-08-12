import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { getKeyrackKeyGrants } from './getKeyrackKeyGrants';

/**
 * .what = clamps the ONE-key half of the reach guard on the shared get-or-unlock core
 * .why = `assertKeyrackReachRequiresKey` is handed a `keyed` boolean, and the obvious way to
 *        compute it — `!selector.repo` — is WRONG for a multi-key selector: a `keys: [a,b,c]`
 *        ask names keys, so it reads as keyed, and the reach then threads into every one of
 *        them. that is the bulk-reach ambiguity q2 refuses, spelled with a literal list
 *        rather than a repo flag
 *
 * .note = every case here throws BEFORE any i/o — the assert sits above the `getGitRepoRoot`
 *         call — so this is a true unit test despite the operation's heavy dependency tree
 */
describe('getKeyrackKeyGrants — the reach guard', () => {
  const reach = asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' });

  given('[case1] a reach paired with MORE than one key', () => {
    when('[t0] the core is asked for three keys at one reach', () => {
      // ⚠️ THE clamp. `keyed: !selector.repo` lets this through; `keyed: keys.length === 1`
      //    refuses it. an n-key ask is a sweep of n, and one reach cannot name n reaches
      then(
        'it refuses, rather than thread one reach across all three',
        async () => {
          const error = await getError(
            getKeyrackKeyGrants({
              for: { keys: ['API_KEY', 'OTHER_KEY', 'THIRD_KEY'] },
              with: { unlock: false },
              owner: null,
              env: 'test',
              reach,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('--reach requires a key');
        },
      );

      then(
        'the refusal names a fix that asks for exactly one key',
        async () => {
          const error = await getError(
            getKeyrackKeyGrants({
              for: { keys: ['API_KEY', 'OTHER_KEY'] },
              with: { unlock: false },
              owner: null,
              env: 'test',
              reach,
            }),
          );
          // `rule.require.errors-name-the-fix` — "name the key" would be ambiguous here, since
          // the caller DID name keys. the fix has to say which of them to keep
          expect(JSON.stringify(error)).toContain('name exactly one key');
          expect(JSON.stringify(error)).toContain('beav@ehmpathy.com');
        },
      );
    });

    when('[t1] the core is asked for a whole-repo sweep at one reach', () => {
      then(
        'it refuses — the extant repo half of the guard is unmoved',
        async () => {
          const error = await getError(
            getKeyrackKeyGrants({
              for: { repo: true },
              with: { unlock: false },
              owner: null,
              env: 'test',
              reach,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('--reach requires a key');
        },
      );
    });
  });

  given('[case2:e1] a REACHLESS ask — the untouched path', () => {
    // e1 — a reachless call takes zero new branches. the guard returns at its first line, so
    // a multi-key sweep with no reach named stays as legal as it was before this change
    when('[t0] many keys are asked for with no reach named', () => {
      then(
        'the guard does not fire — it fails later, at i/o, never at the reach',
        async () => {
          const error = await getError(
            getKeyrackKeyGrants({
              for: { keys: ['API_KEY', 'OTHER_KEY', 'THIRD_KEY'] },
              with: { unlock: false },
              owner: null,
              env: 'test',
            }),
          );
          // whatever it does downstream, it must NOT be refused for a reach it never carried
          if (error)
            expect(error.message).not.toContain('--reach requires a key');
        },
      );
    });
  });
});
