import { getError, given, then, when } from 'test-fns';

import { isRolesPartWayFaultError } from './isRolesPartWayFaultError';
import { withRolesPartWayFault } from './withRolesPartWayFault';

const slugs = [
  { repo: 'test', role: 'tester' },
  { repo: 'test', role: 'reviewer' },
  { repo: 'test', role: 'scribe' },
];

describe('withRolesPartWayFault', () => {
  given('[case1] the step succeeds', () => {
    when('[t0] it runs', () => {
      then('its value passes through', async () => {
        const value = await withRolesPartWayFault(
          { slugs, faultAt: 1, step: 'init' },
          async () => 'ok',
        );
        expect(value).toEqual('ok');
      });
    });
  });

  given('[case2] the init of the second role faults', () => {
    when('[t0] it runs', () => {
      then('the faulted role counts as linked (F1)', async () => {
        const error = await getError(
          withRolesPartWayFault({ slugs, faultAt: 1, step: 'init' }, () => {
            throw new Error('init command failed');
          }),
        );
        expect(isRolesPartWayFaultError(error)).toBe(true);
        expect(error.message).toContain(
          'role init failed part-way, at repo=test/role=reviewer',
        );
        expect(error).toHaveProperty('metadata.linked', [
          'repo=test/role=tester',
          'repo=test/role=reviewer',
        ]);
        expect(error).toHaveProperty('metadata.notLinked', [
          'repo=test/role=scribe',
        ]);
      });
    });
  });

  given('[case3] the link of the second role faults', () => {
    when('[t0] it runs', () => {
      then('the faulted role counts as not linked', async () => {
        const error = await getError(
          withRolesPartWayFault({ slugs, faultAt: 1, step: 'link' }, () => {
            throw new Error('link failed');
          }),
        );
        expect(isRolesPartWayFaultError(error)).toBe(true);
        expect(error.message).toContain(
          'role link failed part-way, at repo=test/role=reviewer',
        );
        expect(error).toHaveProperty('metadata.linked', [
          'repo=test/role=tester',
        ]);
        expect(error).toHaveProperty('metadata.notLinked', [
          'repo=test/role=reviewer',
          'repo=test/role=scribe',
        ]);
      });
    });
  });
});
