import { given, then, when } from 'test-fns';

import { genSampleBrainAuthUsage } from '@src/.test/assets/genSampleBrainAuthUsage';
import { genSampleBrainAuthUsageWindow } from '@src/.test/assets/genSampleBrainAuthUsageWindow';

import { asBrainAuthUsageJson } from './asBrainAuthUsageJson';

// a known reset; the snapshot shows its place, never the stamp itself (no clock stamp in a tracked .snap)
const resetsAtKnown = '2026-11-14T18:00:00Z';

const usageRead = genSampleBrainAuthUsage({
  email: 'a@example.com',
  status: 'read',
  windows: [
    genSampleBrainAuthUsageWindow({
      slug: 'session',
      usedShare: 0.92,
      resetsAt: resetsAtKnown,
    }),
    genSampleBrainAuthUsageWindow({
      slug: 'week',
      usedShare: 0.4,
      resetsAt: null,
    }),
  ],
  savedResets: 2,
  signedIn: true,
});

const usageLimited = genSampleBrainAuthUsage({
  email: 'b@example.com',
  status: 'rate-limited',
});

const usageDead = genSampleBrainAuthUsage({
  email: 'd@example.com',
  status: 'dead',
});

describe('asBrainAuthUsageJson', () => {
  given('[case1] three accounts: read with windows, rate-limited, dead', () => {
    when('[t0] the envelope is built and serialized', () => {
      const json = asBrainAuthUsageJson({
        usages: [usageRead, usageLimited, usageDead],
        owner: 'ehmpath',
      });
      const text = JSON.stringify(json, null, 2);

      then('it names the owner, then one row per account in order', () => {
        expect(Object.keys(json).sort()).toEqual(['accounts', 'owner']);
        expect(json.owner).toEqual('ehmpath');
        expect(json.accounts.map((row) => row.status)).toEqual([
          'read',
          'rate-limited',
          'dead',
        ]);
      });

      then(
        'a reset unknown serializes as null, a known one as its stamp',
        () => {
          const parsed = JSON.parse(text) as {
            accounts: Array<{ windows: Array<{ resetsAt: string | null }> }>;
          };
          expect(
            parsed.accounts[0]?.windows.map((window) => window.resetsAt),
          ).toEqual([resetsAtKnown, null]);
        },
      );

      then('it holds no token', () => {
        expect(text.toLowerCase()).not.toContain('token');
      });

      then('the serialized envelope matches its snapshot', () => {
        expect(
          text.split(resetsAtKnown).join('<resetsAtKnown>'),
        ).toMatchSnapshot();
      });
    });
  });
});
