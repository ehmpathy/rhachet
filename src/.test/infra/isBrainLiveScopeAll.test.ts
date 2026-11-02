import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { isBrainLiveScopeAll } from './isBrainLiveScopeAll';

describe('isBrainLiveScopeAll', () => {
  given('[case1] an env with no BRAIN_LIVE_SCOPE', () => {
    when('[t0] the gate is read', () => {
      then('it is not targeted, so live-brain suites skip', () => {
        expect(isBrainLiveScopeAll({ env: {} })).toEqual(false);
      });
    });
  });

  given('[case2] an env with a value outside the closed set', () => {
    when('[t0] the gate is read with BRAIN_LIVE_SCOPE=true', () => {
      // .note = useBeforeAll hands back a proxy over a Record, so the error rides a field
      const result = useBeforeAll(async () => ({
        error: await getError(() =>
          isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'true' } }),
        ),
      }));

      then('it fails loud with a ConstraintError', () => {
        expect(result.error).toBeInstanceOf(ConstraintError);
      });

      then('it names the closed set', () => {
        expect(result.error.message).toContain(
          "BRAIN_LIVE_SCOPE must be 'all' or unset",
        );
      });

      then('it names the value', () => {
        expect(result.error.message).toContain('"value": "true"');
      });

      then('it names the fix', () => {
        expect(result.error.message).toContain('set BRAIN_LIVE_SCOPE=all');
      });

      then('the whole message a seat reads at collection is snapped', () => {
        expect(result.error.message).toMatchSnapshot();
      });
    });
    when('[t1] the gate is read with BRAIN_LIVE_SCOPE=ALL', () => {
      then('it fails loud, since the set is case-exact', async () => {
        const error = await getError(() =>
          isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'ALL' } }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
    when('[t2] the gate is read with an empty BRAIN_LIVE_SCOPE', () => {
      then('it is off, as if unset', () => {
        expect(isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: '' } })).toEqual(false);
      });
    });
  });

  given('[case3] an env with BRAIN_LIVE_SCOPE=all', () => {
    when('[t0] the gate is read', () => {
      then('it is targeted, so live-brain suites run', () => {
        expect(isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'all' } })).toEqual(
          true,
        );
      });
    });
  });
});
