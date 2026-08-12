import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getGhRepoExists } from './getGhRepoExists';
import type { GhRun } from './runGh';

describe('getGhRepoExists', () => {
  given('[case1] a repo that exists', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] checked', () => {
      then('it is true', () => {
        expect(
          getGhRepoExists({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        ).toBe(true);
      });
    });
  });

  given('[case2] a repo that is absent (genuine 404)', () => {
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] checked', () => {
      then('it is false', () => {
        expect(
          getGhRepoExists({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        ).toBe(false);
      });
    });
  });

  given('[case3] a transient failure (non-404)', () => {
    // stub a rate-limit / server failure that is NOT a 404
    const ghRun: GhRun = () => ({
      status: 1,
      stdout: '',
      stderr: 'HTTP 500: internal server error',
    });

    when('[t0] checked', () => {
      then('it fails loud (does not masquerade as absent)', async () => {
        const error = await getError(() =>
          getGhRepoExists({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
