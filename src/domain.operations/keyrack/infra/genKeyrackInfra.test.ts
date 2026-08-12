import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { genKeyrackInfra } from './genKeyrackInfra';
import type { GhRun } from './gh/runGh';

describe('genKeyrackInfra', () => {
  given('[case1] a fresh org (no keyrack-infra yet)', () => {
    when('[t0] genned', () => {
      const result = genKeyrackInfra(
        { org: 'ehmpathy' },
        { ghRun: genMockGhRun({ repos: [] }) },
      );

      then('it creates the repo', () => {
        expect(result.repoEffect).toBe('created');
      });

      then('it scaffolds the readme', () => {
        expect(result.readmeEffect).toBe('created');
      });

      then('it scaffolds the registry', () => {
        expect(result.registryEffect).toBe('created');
      });

      then('the repo slug is the fixed convention', () => {
        expect(result.repo).toBe('ehmpathy/keyrack-infra');
      });

      then('the --json output shape matches the snapshot', () => {
        // this is exactly what `keyrack infra init --json` serializes
        expect(JSON.stringify(result, null, 2)).toMatchSnapshot();
      });
    });
  });

  given('[case2] an org already fully set up', () => {
    when('[t0] re-genned', () => {
      const result = genKeyrackInfra(
        { org: 'ehmpathy' },
        {
          ghRun: genMockGhRun({
            repos: ['ehmpathy/keyrack-infra'],
            files: [
              {
                repo: 'ehmpathy/keyrack-infra',
                path: 'readme.md',
                content: '# keyrack-infra\n',
              },
              {
                repo: 'ehmpathy/keyrack-infra',
                path: 'registry/github-apps.json',
                content: '[]\n',
              },
            ],
          }),
        },
      );

      then('every part reports found (idempotent no-op)', () => {
        expect(result).toEqual({
          repo: 'ehmpathy/keyrack-infra',
          repoEffect: 'found',
          readmeEffect: 'found',
          registryEffect: 'found',
        });
      });
    });
  });

  given('[case3] repo creation fails with a non-404 gh error', () => {
    // repo view says absent (404), but create then fails with a permission error
    const ghRun: GhRun = ({ args }) =>
      args[1] === 'view'
        ? { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' }
        : { status: 1, stdout: '', stderr: 'HTTP 403: forbidden' };

    when('[t0] genned', () => {
      then('it fails loud with an actionable hint', async () => {
        const error = await getError(() =>
          genKeyrackInfra({ org: 'ehmpathy' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] a concurrent caller scaffolds the files first', () => {
    // repo exists; each file reads absent but the scaffold PUT loses the race (409).
    // the concurrent-scaffold path must converge to found instead of a throw
    const ghRun: GhRun = ({ args }) => {
      if (args[0] === 'repo' && args[1] === 'view')
        return {
          status: 0,
          stdout: '{"name":"keyrack-infra","visibility":"PRIVATE"}',
          stderr: '',
        };
      if (args[1] === '--method' && args[2] === 'PUT')
        return {
          status: 1,
          stdout: '',
          stderr: 'HTTP 409: sha does not match',
        };
      return { status: 1, stdout: '', stderr: 'HTTP 404: Not Found' };
    };

    when('[t0] genned', () => {
      then('every part converges to found (no throw)', () => {
        expect(genKeyrackInfra({ org: 'ehmpathy' }, { ghRun })).toEqual({
          repo: 'ehmpathy/keyrack-infra',
          repoEffect: 'found',
          readmeEffect: 'found',
          registryEffect: 'found',
        });
      });
    });
  });

  given('[case5] a keyrack-infra repo that exists but is public', () => {
    const ghRun = genMockGhRun({ reposPublic: ['ehmpathy/keyrack-infra'] });

    when('[t0] genned', () => {
      then('it fails loud before any registry write', async () => {
        const error = await getError(() =>
          genKeyrackInfra({ org: 'ehmpathy' }, { ghRun }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'keyrack-infra repo exists but is not private',
        );
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
