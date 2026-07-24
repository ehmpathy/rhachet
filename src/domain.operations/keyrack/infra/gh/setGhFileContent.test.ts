import { UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { getGhFileContent } from './getGhFileContent';
import type { GhRun } from './runGh';
import { setGhFileContent } from './setGhFileContent';

describe('setGhFileContent', () => {
  given('[case1] a new file in an extant repo', () => {
    const ghRun = genMockGhRun({ repos: ['ehmpathy/keyrack-infra'] });

    when('[t0] written', () => {
      then('a later read returns the written content', () => {
        setGhFileContent(
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
            message: 'scaffold registry',
            sha: null,
          },
          { ghRun },
        );

        const readBack = getGhFileContent(
          { repo: 'ehmpathy/keyrack-infra', path: 'registry/github-apps.json' },
          { ghRun },
        );
        expect(readBack?.content).toBe('[]\n');
      });
    });
  });

  given('[case2] a gh failure', () => {
    const ghRun: GhRun = () => ({
      status: 1,
      stdout: '',
      stderr: 'HTTP 403: forbidden',
    });

    when('[t0] written', () => {
      then('it fails loud', async () => {
        const error = await getError(() =>
          setGhFileContent(
            {
              repo: 'ehmpathy/keyrack-infra',
              path: 'registry/github-apps.json',
              content: '[]\n',
              message: 'scaffold registry',
              sha: null,
            },
            { ghRun },
          ),
        );
        expect(error).toBeInstanceOf(UnexpectedCodePathError);
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case3] an optimistic-lock conflict (concurrent writer won)', () => {
    const ghRun: GhRun = () => ({
      status: 1,
      stdout: '',
      stderr: 'HTTP 409: sha does not match',
    });

    when('[t0] written', () => {
      then('it reports a conflict effect (does not throw)', () => {
        const result = setGhFileContent(
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
            message: 'scaffold registry',
            sha: 'sha-stale',
          },
          { ghRun },
        );
        expect(result).toEqual({ effect: 'conflict' });
      });
    });
  });
});
