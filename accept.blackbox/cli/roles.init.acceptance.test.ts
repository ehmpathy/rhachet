import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet roles init', () => {
  given('[case1] repo with inits after roles link', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-inits' });

      // link role to create .agent/ directory (like a real project would)
      const linkResult = invokeRhachetCliBinary({
        args: ['roles', 'link', '--repo', 'test-repo', '--role', 'tester'],
        cwd: tempRepo.path,
      });

      if (linkResult.status !== 0) {
        throw new Error(
          `roles link failed: ${linkResult.stderr}\n${linkResult.stdout}`,
        );
      }

      return tempRepo;
    });

    when('[t0] roles init --command touch-marker', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--command', 'touch-marker'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('init script executes and creates marker file', () => {
        const markerPath = resolve(repo.path, 'marker-file-created.txt');
        expect(existsSync(markerPath)).toBe(true);
      });

      then('stdout contains success message', () => {
        expect(result.stdout).toContain('init executed successfully');
      });
    });

    when('[t1] roles init --command nonexistent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--command', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about init not found', () => {
        expect(result.stderr).toContain('nonexistent');
      });
    });
  });

  given('[case2] repo with inits and piped stdin (Claude Code hook scenario)', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({
        fixture: 'with-inits',
        suffix: 'stdin-test',
      });

      // link role to create .agent/ directory
      const linkResult = invokeRhachetCliBinary({
        args: ['roles', 'link', '--repo', 'test-repo', '--role', 'tester'],
        cwd: tempRepo.path,
      });

      if (linkResult.status !== 0) {
        throw new Error(
          `roles link failed: ${linkResult.stderr}\n${linkResult.stdout}`,
        );
      }

      return tempRepo;
    });

    when('[t0] roles init --command claude.hooks/pretooluse.read-stdin with piped stdin', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'echo hello' },
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.read-stdin',
          ],
          cwd: repo.path,
          stdin: stdinData,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('init script receives piped stdin data', () => {
        const receivedPath = resolve(repo.path, 'stdin-received.txt');
        expect(existsSync(receivedPath)).toBe(true);

        const receivedData = readFileSync(receivedPath, 'utf-8').trim();
        expect(receivedData).toEqual(stdinData);
      });
    });

    when('[t1] roles init --command claude.hooks/pretooluse.check-and-allow with allowed input', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.ts' },
        blocked: false,
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.check-and-allow',
          ],
          cwd: repo.path,
          stdin: stdinData,
        }),
      );

      then('exits with status 0 (allowed)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains ALLOWED message', () => {
        expect(result.stdout).toContain('ALLOWED');
      });

      then('init script receives the stdin data', () => {
        const receivedPath = resolve(repo.path, 'stdin-check-received.txt');
        expect(existsSync(receivedPath)).toBe(true);

        const receivedData = readFileSync(receivedPath, 'utf-8').trim();
        expect(receivedData).toEqual(stdinData);
      });
    });

    when('[t2] roles init --command claude.hooks/pretooluse.check-and-allow with blocked input', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf /' },
        blocked: true,
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.check-and-allow',
          ],
          cwd: repo.path,
          stdin: stdinData,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (blocked)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains BLOCKED message', () => {
        expect(result.stderr).toContain('BLOCKED');
      });
    });
  });

  given('[case3] minimal repo without inits', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] roles init --command any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--command', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (no inits found)', () => {
        expect(result.status).not.toEqual(0);
      });
    });
  });

  given('[case4] repo with forbid-gerunds init (Claude Code hook scenario)', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({
        fixture: 'with-inits',
        suffix: 'forbid-gerunds-test',
      });

      // link role to create .agent/ directory
      const linkResult = invokeRhachetCliBinary({
        args: ['roles', 'link', '--repo', 'test-repo', '--role', 'tester'],
        cwd: tempRepo.path,
      });

      if (linkResult.status !== 0) {
        throw new Error(
          `roles link failed: ${linkResult.stderr}\n${linkResult.stdout}`,
        );
      }

      return tempRepo;
    });

    when('[t0] Write tool with clean content (no gerunds)', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Write',
        tool_input: {
          file_path: '/some/file.ts',
          content: 'const userFound = await findUser();',
        },
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.forbid-gerunds',
          ],
          cwd: repo.path,
          stdin: stdinData,
        }),
      );

      then('exits with status 0 (allowed)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains ALLOWED message', () => {
        expect(result.stdout).toContain('ALLOWED');
      });

      then('init script receives the stdin data', () => {
        const receivedPath = resolve(repo.path, 'gerunds-stdin-received.txt');
        expect(existsSync(receivedPath)).toBe(true);

        const receivedData = readFileSync(receivedPath, 'utf-8').trim();
        expect(receivedData).toEqual(stdinData);
      });
    });

    when('[t1] Write tool with gerunds in content', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Write',
        tool_input: {
          file_path: '/some/file.ts',
          content: 'const existingUser = await loadingData();',
        },
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.forbid-gerunds',
          ],
          cwd: repo.path,
          stdin: stdinData,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (blocked)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains BLOCKED message', () => {
        expect(result.stderr).toContain('BLOCKED');
      });

      then('detected gerunds file lists the violations', () => {
        const detectedPath = resolve(repo.path, 'gerunds-detected.txt');
        expect(existsSync(detectedPath)).toBe(true);

        const detectedData = readFileSync(detectedPath, 'utf-8');
        expect(detectedData).toContain('existing');
        expect(detectedData).toContain('loading');
      });
    });

    when('[t2] Edit tool with gerunds in new_string', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Edit',
        tool_input: {
          file_path: '/some/file.ts',
          old_string: 'const user = null;',
          new_string: 'const processingUser = await fetchingData();',
        },
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.forbid-gerunds',
          ],
          cwd: repo.path,
          stdin: stdinData,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (blocked)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains BLOCKED message', () => {
        expect(result.stderr).toContain('BLOCKED');
      });
    });

    when('[t3] Read tool (should be skipped)', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Read',
        tool_input: {
          file_path: '/some/file.ts',
        },
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.forbid-gerunds',
          ],
          cwd: repo.path,
          stdin: stdinData,
        }),
      );

      then('exits with status 0 (skipped)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains SKIPPED message', () => {
        expect(result.stdout).toContain('SKIPPED');
      });
    });

    when('[t4] Write tool with allowlisted -ing words', () => {
      const stdinData = JSON.stringify({
        tool_name: 'Write',
        tool_input: {
          file_path: '/some/file.ts',
          content: 'const str: string = something ?? nothing;',
        },
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'init',
            '--command',
            'claude.hooks/pretooluse.forbid-gerunds',
          ],
          cwd: repo.path,
          stdin: stdinData,
        }),
      );

      then('exits with status 0 (allowed - words in allowlist)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains ALLOWED message', () => {
        expect(result.stdout).toContain('ALLOWED');
      });
    });
  });
});
