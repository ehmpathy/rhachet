import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  createTestHomeWithSshKey,
  getTestSshAgeRecipient,
} from '@src/.test/infra';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';

import { assertBrainAuthSlotWritable } from './assertBrainAuthSlotWritable';
import { delBrainAuthSlotToken } from './delBrainAuthSlotToken';
import { getAllBrainAuthSlotEmails } from './getAllBrainAuthSlotEmails';
import { getOneBrainAuthSlotToken } from './getOneBrainAuthSlotToken';
import { setBrainAuthSlotToken } from './setBrainAuthSlotToken';

/**
 * .what = the brains auth slot ops, round-tripped through the real keyrack in a temp HOME
 * .why = every token `set`, `get` and `use` hold passes through these four ops; this proves a token
 *   filed at an account's reach reads back whole, is replaced by a re-file, lists by its email, and
 *   is gone after a del — over the real host manifest, os.secure vault and daemon
 * .note = a unique owner keeps this daemon apart from the box's own keyrack
 * .note = the tokens are plain labels, never a key shape
 */
describe('brains auth slot ops, over the real keyrack', () => {
  const testHome = createTestHomeWithSshKey({ name: 'brainsAuthSlotToken' });
  const owner = 'brainsauthslot';
  beforeAll(() => testHome.setup());
  afterAll(async () => {
    await relockKeyrack({ owner, slugs: [CLAUDE_AUTH_SLOT.slug] });
    testHome.teardown();
  });

  given('[case0] an owner with no host keyrack at all', () => {
    const ownerNone = 'brainsauthnone';

    when('[t0] the slot is checked for a write', () => {
      then(
        'it refuses as a constraint, and names the keyrack init',
        async () => {
          const error = await getError(
            assertBrainAuthSlotWritable({ owner: ownerNone }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('a login cannot be filed');
          expect(error.message).toContain(
            `rhx keyrack init --owner ${ownerNone}`,
          );
          expect(error).toMatchSnapshot();
        },
      );
    });

    when('[t1] a token is filed anyway', () => {
      then('the write refuses the same way, and files naught', async () => {
        const error = await getError(
          setBrainAuthSlotToken({
            owner: ownerNone,
            email: 'a@example.com',
            token: 'refresh.a.0',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          `rhx keyrack init --owner ${ownerNone}`,
        );
        expect(await getAllBrainAuthSlotEmails({ owner: ownerNone })).toEqual(
          [],
        );
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case1] a host keyrack with no account filed', () => {
    useBeforeAll(async () =>
      daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: `~/.rhachet/keyrack/keyrack.host.${owner}.age`,
          owner,
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: await getTestSshAgeRecipient(),
              label: 'test-key',
              addedAt: '2026-11-14T00:00:00.000Z',
            }),
          ],
          hosts: {},
        }),
      }),
    );

    when('[t0] a token is filed for a@example.com', () => {
      const after = useBeforeAll(async () => {
        await setBrainAuthSlotToken({
          owner,
          email: 'a@example.com',
          token: 'refresh.a.1',
        });
        return {
          emails: await getAllBrainAuthSlotEmails({ owner }),
          slot: await getOneBrainAuthSlotToken({
            owner,
            email: 'a@example.com',
          }),
        };
      });

      then('the account lists by its email', () => {
        expect(after.emails).toEqual(['a@example.com']);
      });

      then('the token reads back whole', () => {
        expect(after.slot).toEqual({ status: 'granted', token: 'refresh.a.1' });
      });
    });

    when('[t1] a rotated token is filed over it', () => {
      const after = useBeforeAll(async () => {
        await setBrainAuthSlotToken({
          owner,
          email: 'a@example.com',
          token: 'refresh.a.2',
        });
        return {
          emails: await getAllBrainAuthSlotEmails({ owner }),
          slot: await getOneBrainAuthSlotToken({
            owner,
            email: 'a@example.com',
          }),
        };
      });

      then('the slot holds the new token, never the spent one', () => {
        expect(after.slot).toEqual({ status: 'granted', token: 'refresh.a.2' });
      });

      then('the account still lists once', () => {
        expect(after.emails).toEqual(['a@example.com']);
      });
    });

    when('[t2] the slot is deleted', () => {
      const after = useBeforeAll(async () => {
        await delBrainAuthSlotToken({ owner, email: 'a@example.com' });
        return {
          emails: await getAllBrainAuthSlotEmails({ owner }),
          slot: await getOneBrainAuthSlotToken({
            owner,
            email: 'a@example.com',
          }),
        };
      });

      then('the account no longer lists', () => {
        expect(after.emails).toEqual([]);
      });

      then('the slot reads as absent', () => {
        expect(after.slot.status).toEqual('absent');
      });
    });

    when('[t3] the del runs again', () => {
      then('it is a no-op', async () => {
        await delBrainAuthSlotToken({ owner, email: 'a@example.com' });
        expect(await getAllBrainAuthSlotEmails({ owner })).toEqual([]);
      });
    });
  });
});
