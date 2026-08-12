import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { genGhRepo } from './genGhRepo';
import { getGhRepoExists } from './getGhRepoExists';
import type { GhRun } from './runGh';

describe('genGhRepo', () => {
  given('[case1] a repo that does not exist yet', () => {
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] genned', () => {
      const result = genGhRepo({ slug: 'ehmpathy/keyrack-infra' }, { ghRun });

      then('it reports created', () => {
        expect(result.effect).toBe('created');
      });

      then('the repo now exists', () => {
        expect(
          getGhRepoExists({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        ).toBe(true);
      });
    });
  });

  given('[case2] a repo that already exists', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] genned', () => {
      then('it reports found (idempotent, no create)', () => {
        expect(
          genGhRepo({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }).effect,
        ).toBe('found');
      });
    });
  });

  given('[case3] a create failure (non-404 error on create)', () => {
    // repo view says absent (404), but create then fails with a permission error
    const ghRun: GhRun = ({ args }) =>
      args[1] === 'view'
        ? { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
        : { status: 1, stdout: '', stderr: 'HTTP 403: forbidden' };

    when('[t0] genned', () => {
      then('it fails loud with an actionable hint', async () => {
        const error = await getError(() =>
          genGhRepo({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('gh repo create failed');
        expect(error.message).toContain('gh auth status');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case5] a repo that exists but is public', () => {
    const ghRun = genMockGhRun({ reposPublic: ['ehmpathy/keyrack-infra'] });

    when('[t0] genned', () => {
      then('it fails loud (the lock is private access)', async () => {
        const error = await getError(() =>
          genGhRepo({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'keyrack-infra repo exists but is not private',
        );
        expect(error.message).toContain('--visibility private');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] a toctou race (create loses to a concurrent create)', () => {
    // repo view says absent (404), but create then loses the race with a 422
    const ghRun: GhRun = ({ args }) =>
      args[1] === 'view'
        ? { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
        : { status: 1, stdout: '', stderr: 'HTTP 422: name already exists' };

    when('[t0] genned', () => {
      then('it converges to found (idempotent, no throw)', () => {
        expect(
          genGhRepo({ slug: 'ehmpathy/keyrack-infra' }, { ghRun }).effect,
        ).toBe('found');
      });
    });
  });
});
