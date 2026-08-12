import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getGhRepoVisibility } from './getGhRepoVisibility';
import type { GhRun } from './runGh';

describe('getGhRepoVisibility', () => {
  given('[case1] a private repo', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] its visibility is read', () => {
      then('it is private', () => {
        expect(
          getGhRepoVisibility({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        ).toBe('private');
      });
    });
  });

  given('[case2] a public repo', () => {
    const ghRun = genMockGhRun({ reposPublic: ['ehmpathy/keyrack-infra'] });

    when('[t0] its visibility is read', () => {
      then('it is public', () => {
        expect(
          getGhRepoVisibility({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        ).toBe('public');
      });
    });
  });

  given('[case3] a transient failure (non-zero exit)', () => {
    // stub a rate-limit / server failure
    const ghRun: GhRun = () => ({
      status: 1,
      stdout: '',
      stderr: 'HTTP 500: internal server error',
    });

    when('[t0] its visibility is read', () => {
      then('it fails loud (never assumes a visibility)', async () => {
        const error = await getError(() =>
          getGhRepoVisibility({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('gh repo view (visibility) failed');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
