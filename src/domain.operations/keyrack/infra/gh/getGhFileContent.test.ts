import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getGhFileContent } from './getGhFileContent';
import type { GhRun } from './runGh';

describe('getGhFileContent', () => {
  given('[case1] a file that exists', () => {
    const ghRun = genMockGhRun({
      files: [
        {
          repo: 'ehmpathy/keyrack-infra',
          path: 'registry/github-apps.json',
          content: '[]\n',
        },
      ],
    });

    when('[t0] read', () => {
      const result = getGhFileContent(
        { repo: 'ehmpathy/keyrack-infra', path: 'registry/github-apps.json' },
        { ghRun },
      );

      then('it returns the decoded content', () => {
        expect(result?.content).toBe('[]\n');
      });

      then('it returns a sha (needed for later updates)', () => {
        expect(result?.sha).toBeTruthy();
      });
    });
  });

  given('[case2] a file that is absent (genuine 404)', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] read', () => {
      then('it returns null', () => {
        expect(
          getGhFileContent(
            {
              repo: 'ehmpathy/keyrack-infra',
              path: 'registry/github-apps.json',
            },
            { ghRun },
          ),
        ).toBe(null);
      });
    });
  });

  given('[case3] a transient failure (non-404)', () => {
    const ghRun: GhRun = () => ({
      status: 1,
      stdout: '',
      stderr: 'HTTP 429: rate limit exceeded',
    });

    when('[t0] read', () => {
      then('it fails loud (never mistaken for an absent file)', async () => {
        const error = await getError(() =>
          getGhFileContent(
            {
              repo: 'ehmpathy/keyrack-infra',
              path: 'registry/github-apps.json',
            },
            { ghRun },
          ),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('gh contents read failed');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
