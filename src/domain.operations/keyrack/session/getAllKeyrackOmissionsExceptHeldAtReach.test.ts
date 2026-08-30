import { given, then, when } from 'test-fns';

import { getAllKeyrackOmissionsExceptHeldAtReach } from './getAllKeyrackOmissionsExceptHeldAtReach';

/**
 * .what = clamps which omission rows survive once the reach targets are accounted for
 * .why = a reachless target is kept for every slug, so a key cut ONLY at reaches files a
 *        false `absent` beside the reach targets that report the truth. this drops that one
 *        row — and ONLY that one
 * .note = the [case3] clamp is the failhide r7 caught at i011: a slug whose reach target was
 *         SKIPPED must not be flagged, or this prune deletes the last signal the human had
 *         and the key vanishes from the report entirely on an exit-0 run
 */
describe('getAllKeyrackOmissionsExceptHeldAtReach', () => {
  given('[case1] an `absent` row for a slug a reach target reported on', () => {
    when('[t0] the omissions are pruned', () => {
      then('the false `absent` is dropped', () => {
        expect(
          getAllKeyrackOmissionsExceptHeldAtReach({
            omissions: [{ slug: '@all.prep.BRAINS_AUTH', reason: 'absent' }],
            slugsHeldAtReach: new Set(['@all.prep.BRAINS_AUTH']),
          }),
        ).toEqual([]);
      });
    });
  });

  given(
    '[case2] rows whose reason names a fault of the address that HIT',
    () => {
      // ⚠️ only `absent` is a claim the reach targets can contradict. `remote`, `lost`, and
      //    `errored` each report on a real read that really failed, so they stand whatever a
      //    peer target did — to drop them would hide a live fault (rule.forbid.failhide)
      when('[t0] the omissions are pruned', () => {
        then('remote, lost, and errored all stand', () => {
          const omissions = [
            { slug: '@all.prep.K', reason: 'remote' },
            { slug: '@all.prep.K', reason: 'lost' },
            { slug: '@all.prep.K', reason: 'errored' },
          ];
          expect(
            getAllKeyrackOmissionsExceptHeldAtReach({
              omissions,
              slugsHeldAtReach: new Set(['@all.prep.K']),
            }),
          ).toEqual(omissions);
        });
      });
    },
  );

  given(
    '[case3] an `absent` row for a slug NO reach target reported on',
    () => {
      // ⛔ THE FAILHIDE CLAMP. this is the state an UNADDRESSABLE vault (os.envvar) produces:
      //    the enumerated reach target is skipped, so it flags no slug, so the reachless
      //    `absent` row MUST survive. were it pruned, the key would appear in neither
      //    `unlocked` nor `omitted` and the run would exit 0 with the credential never granted
      when('[t0] the omissions are pruned', () => {
        then(
          'the `absent` row SURVIVES — the human keeps their one signal',
          () => {
            const omissions = [
              { slug: '@all.prep.ENVVAR_KEY', reason: 'absent' },
            ];
            expect(
              getAllKeyrackOmissionsExceptHeldAtReach({
                omissions,
                slugsHeldAtReach: new Set(),
              }),
            ).toEqual(omissions);
          },
        );
      });
    },
  );

  given('[case4] a purely reachless pass — every extant unlock today', () => {
    // acceptance 2 at unit grain: with no slug ever flagged, the list is byte-identical
    when('[t0] the omissions are pruned', () => {
      then('every row passes through untouched', () => {
        const omissions = [
          { slug: 'testorg.prep.A', reason: 'absent' },
          { slug: 'testorg.prep.B', reason: 'lost' },
        ];
        expect(
          getAllKeyrackOmissionsExceptHeldAtReach({
            omissions,
            slugsHeldAtReach: new Set(),
          }),
        ).toEqual(omissions);
      });
    });
  });
});
