import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack --prikey', () => {
  // kill daemons from prior test runs to prevent state leakage
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
    killKeyrackDaemonForTests({ owner: 'robot' });
  });

  /**
   * [uc1] init --prikey creates manifest
   * prikey flag derives pubkey and creates manifest
   */
  given('[case1] init --prikey creates manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] init --prikey /path/to/key (no manifest)', () => {
      // use the test key at .ssh/id_ed25519 (setup by genTestTempRepo)
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--owner',
            'robot',
            '--prikey',
            join(repo.path, '.ssh', 'id_ed25519'),
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions freshly minted', () => {
        expect(result.stdout).toContain('freshly minted');
      });

      then('manifest file created', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.robot.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
      });
    });

    when('[t1] init --prikey vs init --pubkey (same behavior)', () => {
      const repo2 = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-vault-os-direct', suffix: 'pubkey' }),
      );

      // init with --pubkey
      const resultPubkey = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--owner',
            'via-pubkey',
            '--pubkey',
            join(repo2.path, '.ssh', 'id_ed25519'),
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        }),
      );

      // init with --prikey
      const resultPrikey = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--owner',
            'via-prikey',
            '--prikey',
            join(repo2.path, '.ssh', 'id_ed25519'),
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        }),
      );

      then('both exit with status 0', () => {
        expect(resultPubkey.status).toEqual(0);
        expect(resultPrikey.status).toEqual(0);
      });

      then('both create manifest', () => {
        const pubkeyManifest = join(
          repo2.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.via-pubkey.age',
        );
        const prikeyManifest = join(
          repo2.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.via-prikey.age',
        );
        expect(existsSync(pubkeyManifest)).toBe(true);
        expect(existsSync(prikeyManifest)).toBe(true);
      });
    });
  });

  /**
   * [uc2] set --prikey enables custom owner flow
   * can set keys to custom owner with explicit prikey
   */
  given('[case2] set --prikey enables custom owner flow', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: init robot owner with prikey
    useBeforeAll(async () => {
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'init',
          '--owner',
          'robot',
          '--prikey',
          join(repo.path, '.ssh', 'id_ed25519'),
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
      });
      return {};
    });

    when('[t0] init --prikey then set --prikey (same key)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ROBOT_API_KEY',
            '--env',
            'all',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'robot',
            '--prikey',
            join(repo.path, '.ssh', 'id_ed25519'),
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'robot-secret-value-123\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns key config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('@all.all.ROBOT_API_KEY');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('vault file created in owner-namespaced path', () => {
        const vaultPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=robot',
          'keyrack.direct.json',
        );
        expect(existsSync(vaultPath)).toBe(true);
      });
    });

    when('[t1] set --prikey with wrong key (error)', () => {
      // generate a different keypair and attempt set
      const result = useBeforeAll(async () => {
        const wrongKeyDir = join(repo.path, '.ssh-wrong');
        mkdirSync(wrongKeyDir, { recursive: true });
        execSync(
          `ssh-keygen -t ed25519 -f ${join(wrongKeyDir, 'wrong_key')} -N "" -q`,
        );

        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'WRONG_KEY_TEST',
            '--env',
            'all',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'robot',
            '--prikey',
            join(wrongKeyDir, 'wrong_key'),
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'some-value\n',
          logOnError: false,
        });
      });

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions decryption failure', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/decrypt|no match/i);
      });
    });

    when('[t2] set without --prikey when discovery fails (error + tip)', () => {
      // setup: create repo with custom key location and init, then attempt set without prikey
      const scene = useBeforeAll(async () => {
        // create a repo where the owner manifest is encrypted to a key
        // that is NOT at the default .ssh/ location
        const repo2 = await genTestTempRepo({
          fixture: 'with-vault-os-direct',
          suffix: 'no-discovery',
        });

        // generate a non-standard keypair outside .ssh/
        const customKeyDir = join(repo2.path, 'custom-keys');
        mkdirSync(customKeyDir, { recursive: true });
        execSync(
          `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
        );

        // init with custom key path (not in .ssh/)
        await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--owner',
            'custom',
            '--prikey',
            join(customKeyDir, 'custom_key'),
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        });

        // attempt set WITHOUT --prikey (discovery should fail)
        const result = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CUSTOM_KEY',
            '--env',
            'all',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'custom',
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
          stdin: 'some-value\n',
          logOnError: false,
        });

        return { result };
      });

      then('exits with non-zero status', () => {
        expect(scene.result.status).not.toEqual(0);
      });

      then('error suggests --prikey', () => {
        const output = scene.result.stdout + scene.result.stderr;
        expect(output).toMatch(/prikey|no match/i);
      });
    });
  });

  /**
   * [uc3] full roundtrip: init -> set -> unlock -> get
   * all operations use same --prikey path
   */
  given('[case3] full roundtrip: init -> set -> unlock -> get', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] all operations use same --prikey path', () => {
      const scene = useBeforeAll(async () => {
        const prikeyPath = join(repo.path, '.ssh', 'id_ed25519');

        // step 1: init
        const initResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--owner',
            'robot',
            '--prikey',
            prikeyPath,
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });

        // step 2: set with sudo env (enables unlock without repoManifest)
        const setResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ROUNDTRIP_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'robot',
            '--prikey',
            prikeyPath,
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'roundtrip-secret-456\n',
        });

        // step 3: unlock (unlock the sudo key for this owner)
        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'robot',
            '--prikey',
            prikeyPath,
            '--env',
            'sudo',
            '--key',
            '@all.sudo.ROUNDTRIP_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });

        // step 4: get
        const getResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.sudo.ROUNDTRIP_KEY',
            '--owner',
            'robot',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });

        return { initResult, setResult, unlockResult, getResult };
      });

      then('init succeeds', () => {
        expect(scene.initResult.status).toEqual(0);
      });

      then('set succeeds', () => {
        expect(scene.setResult.status).toEqual(0);
      });

      then('unlock succeeds', () => {
        expect(scene.unlockResult.status).toEqual(0);
      });

      then('get returns correct value', () => {
        expect(scene.getResult.status).toEqual(0);
        const parsed = JSON.parse(scene.getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('roundtrip-secret-456');
      });
    });

    when('[t1] works with non-standard key location', () => {
      const scene = useBeforeAll(async () => {
        const repo2 = await genTestTempRepo({
          fixture: 'with-vault-os-direct',
          suffix: 'custom-loc',
        });

        // generate keypair outside ~/.ssh/
        const customKeyDir = join(repo2.path, 'opt', 'robot', 'keys');
        mkdirSync(customKeyDir, { recursive: true });
        execSync(
          `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'robot_key')} -N "" -q`,
        );

        const prikeyPath = join(customKeyDir, 'robot_key');

        // full flow
        const initResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'robot2', '--prikey', prikeyPath],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        });

        const setResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CUSTOM_LOC_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'robot2',
            '--prikey',
            prikeyPath,
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
          stdin: 'custom-loc-secret\n',
        });

        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'robot2',
            '--prikey',
            prikeyPath,
            '--env',
            'sudo',
            '--key',
            '@all.sudo.CUSTOM_LOC_KEY',
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        });

        const getResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.sudo.CUSTOM_LOC_KEY',
            '--owner',
            'robot2',
            '--json',
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        });

        return { initResult, setResult, unlockResult, getResult };
      });

      then('all operations succeed with non-standard key location', () => {
        expect(scene.initResult.status).toEqual(0);
        expect(scene.setResult.status).toEqual(0);
        expect(scene.unlockResult.status).toEqual(0);
        expect(scene.getResult.status).toEqual(0);
      });

      then('get returns correct value', () => {
        const parsed = JSON.parse(scene.getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('custom-loc-secret');
      });
    });
  });
});
