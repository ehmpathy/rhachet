import { given, then, when } from 'test-fns';

import { genSampleRoleContentDefectsOwned } from '@src/.test/assets/genSampleRoleContentDefectsOwned';

import { asRoleContentDefectHookReadout } from './asRoleContentDefectHookReadout';

describe('asRoleContentDefectHookReadout', () => {
  given('[case1] the stop hold over owned defects', () => {
    when('[t0] the readout renders', () => {
      const lines = asRoleContentDefectHookReadout({
        invocation: 'roles cost --all --when hook.onStop',
        defects: genSampleRoleContentDefectsOwned(),
      });

      then('it names the constraint and every defect', () => {
        expect(lines.join('\n')).toContain(
          '✋ ConstraintError: 3 role content defects, set aside at boot',
        );
      });

      then('the readout matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
