import { UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getGhOrgInstalls } from './getGhOrgInstalls';
import type { GhRun } from './runGh';

describe('getGhOrgInstalls', () => {
  given('[case1] a member (403 forbidden)', () => {
    const ghRun = genMockGhRun({ orgInstalls: { forbidden: true } });

    when('[t0] listed', () => {
      then('it reports forbidden (the member signal)', () => {
        expect(getGhOrgInstalls({ org: 'ehmpathy' }, { ghRun })).toEqual({
          forbidden: true,
        });
      });
    });
  });

  given('[case2] an admin with installs', () => {
    const ghRun = genMockGhRun({
      orgInstalls: {
        forbidden: false,
        installs: [
          { appId: '123456', installationId: '78901234', slug: 'ehmpathy-bot' },
        ],
      },
    });

    when('[t0] listed', () => {
      const result = getGhOrgInstalls({ org: 'ehmpathy' }, { ghRun });

      then('it is not forbidden', () => {
        expect(result.forbidden).toBe(false);
      });

      then('it maps the installs to registry-entry shape', () => {
        expect(result.forbidden === false && result.installs).toEqual([
          { appId: '123456', installationId: '78901234', slug: 'ehmpathy-bot' },
        ]);
      });
    });
  });

  given('[case3] a transient failure (non-403)', () => {
    const ghRun: GhRun = () => ({
      status: 1,
      stdout: '',
      stderr: 'HTTP 500: internal server error',
    });

    when('[t0] listed', () => {
      then('it fails loud (does not masquerade as a member)', async () => {
        const error = await getError(() =>
          getGhOrgInstalls({ org: 'ehmpathy' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(UnexpectedCodePathError);
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
