import { given, then, when } from 'test-fns';

import { genSampleBrainAuthUsageWindow } from '@src/.test/assets/genSampleBrainAuthUsageWindow';
import { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

import { asBrainAuthUseJson } from './asBrainAuthUseJson';

const accountA = new BrainAuthAccount({
  brain: 'claude',
  accountUuid: 'uuid-a',
  email: 'a@example.com',
  orgId: 'org-a',
});
const accountB = new BrainAuthAccount({
  brain: 'claude',
  accountUuid: 'uuid-b',
  email: 'b@example.com',
  orgId: 'org-b',
});

describe('asBrainAuthUseJson', () => {
  given(
    '[case1] a swap from a to b, b capped on its week, one live clone',
    () => {
      when('[t0] the envelope is built', () => {
        const json = asBrainAuthUseJson({
          outcome: 'swapped',
          before: accountA,
          after: accountB,
          stowed: 'a@example.com',
          windowsCapped: [
            genSampleBrainAuthUsageWindow({
              slug: 'week',
              usedShare: 1,
              resetsAt: '2026-11-18T00:00:00.000Z',
            }),
          ],
          owner: 'ehmpath',
          clonesLive: ['@:driver'],
        });

        then('it is landed at grove scope, and names the live clone', () => {
          expect(json.scope).toEqual('grove');
          expect(json.owner).toEqual('ehmpath');
          expect(json.landed).toEqual(true);
          expect(json.clonesLive).toEqual(['@:driver']);
        });

        then('the capped window carries its reset instant', () => {
          expect(json.windowsCapped?.map((window) => window.resetsAt)).toEqual([
            '2026-11-18T00:00:00Z',
          ]);
        });

        // the instant is asserted above; the snapshot holds a placeholder, since a tracked file may not hold a clock
        then('the envelope matches its snapshot', () => {
          expect({
            ...json,
            windowsCapped: json.windowsCapped?.map((window) => ({
              ...window,
              resetsAt: '<instant>',
            })),
          }).toMatchSnapshot();
        });
      });
    },
  );

  given('[case2] an unchanged use, with a live clone in the repo', () => {
    when('[t0] the envelope is built', () => {
      const json = asBrainAuthUseJson({
        outcome: 'unchanged',
        before: accountB,
        after: accountB,
        stowed: null,
        windowsCapped: null,
        owner: 'ehmpath',
        clonesLive: ['@:driver'],
      });

      then('no clone is named, since no login moved', () => {
        expect(json.clonesLive).toEqual([]);
      });

      then('the usage reads as unread', () => {
        expect(json.windowsCapped).toEqual(null);
      });

      then('the envelope matches its snapshot', () => {
        expect(json).toMatchSnapshot();
      });
    });
  });
});
