import * as fs from 'fs/promises';
import * as path from 'path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack init', () => {
  /**
   * [uc1] init creates keyrack.yml in repo without one
   */
  given('[case1] repo without keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] keyrack init --org testorg --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows created status', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('created');
        expect(parsed.path).toContain('.agent/keyrack.yml');
      });

      then('creates .agent/keyrack.yml file', async () => {
        const manifestPath = path.join(repo.path, '.agent', 'keyrack.yml');
        const exists = await fs
          .access(manifestPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      });

      then('manifest contains org', async () => {
        const manifestPath = path.join(repo.path, '.agent', 'keyrack.yml');
        const content = await fs.readFile(manifestPath, 'utf-8');
        expect(content).toContain('org: testorg');
      });

      then('manifest contains env.prod section', async () => {
        const manifestPath = path.join(repo.path, '.agent', 'keyrack.yml');
        const content = await fs.readFile(manifestPath, 'utf-8');
        expect(content).toContain('env.prod:');
      });

      then('manifest contains env.test section', async () => {
        const manifestPath = path.join(repo.path, '.agent', 'keyrack.yml');
        const content = await fs.readFile(manifestPath, 'utf-8');
        expect(content).toContain('env.test:');
      });
    });

    when('[t1] keyrack init --org testorg (human readable)', () => {
      // use a fresh repo for this test
      const freshRepo = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'minimal' }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg'],
          cwd: freshRepo.path,
          env: { HOME: freshRepo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows created message', () => {
        expect(result.stdout).toContain('created:');
        expect(result.stdout).toContain('.agent/keyrack.yml');
      });

      then('output shows next steps', () => {
        expect(result.stdout).toContain('next steps:');
        expect(result.stdout).toContain('keyrack set');
      });
    });
  });

  /**
   * [uc2] init with manifest already present
   */
  given('[case2] repo with keyrack manifest already', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack init --org testorg --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows exists status', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('exists');
        expect(parsed.path).toContain('.agent/keyrack.yml');
      });
    });

    when('[t1] keyrack init --org testorg (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows manifest already exists', () => {
        expect(result.stdout).toContain('manifest already exists');
      });
    });
  });

  /**
   * [uc3] init requires --org
   */
  given('[case3] init without --org', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] keyrack init (no --org)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --org is required', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/required|org/i);
      });
    });
  });
});
