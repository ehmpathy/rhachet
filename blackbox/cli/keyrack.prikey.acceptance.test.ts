import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { isAgeCLIAvailable } from '@src/infra/ssh';

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
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
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
        genTestTempRepo({ fixture: 'with-vault-os-secure', suffix: 'pubkey' }),
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
   *
   * .note = uses non-standard key path (.keys/robot_key) to avoid discovery
   * .note = per spec.prikey-discovery-behavior, discovery always runs; supplemental prikeys are merged
   * .note = if we used .ssh/id_ed25519, discovery would find it even with wrong prikey
   */
  given('[case2] set --prikey enables custom owner flow', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // setup: generate key at non-standard location (avoids discovery)
    // .note = must NOT use .ssh/ paths which are standard discovery locations
    // .note = useBeforeAll returns a proxy, so we wrap primitive in object
    const correctKey = useBeforeAll(async () => {
      const keyDir = join(repo.path, '.keys');
      mkdirSync(keyDir, { recursive: true });
      const keyPath = join(keyDir, 'robot_key');
      execSync(`ssh-keygen -t ed25519 -f ${keyPath} -N "" -q`);
      return { path: keyPath };
    });

    // setup: init robot owner with prikey at non-standard location
    useBeforeAll(async () => {
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'init',
          '--owner',
          'robot',
          '--prikey',
          correctKey.path,
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
            'os.secure',
            '--owner',
            'robot',
            '--prikey',
            correctKey.path,
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
        expect(parsed.vault).toEqual('os.secure');
      });

      then('vault file created in owner-namespaced path', () => {
        const vaultDir = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.secure',
          'owner=robot',
        );
        expect(existsSync(vaultDir)).toBe(true);
        // os.secure stores credentials as {hash}.age files
        const files = require('fs').readdirSync(vaultDir);
        expect(files.some((f: string) => f.endsWith('.age'))).toBe(true);
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
            'os.secure',
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
          fixture: 'with-vault-os-secure',
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
            'os.secure',
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
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
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
        // .note = use testorg from fixture, not @all (org validation rejects mismatch)
        const setResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ROUNDTRIP_KEY',
            '--env',
            'sudo',
            '--org',
            'testorg',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
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
            'testorg.sudo.ROUNDTRIP_KEY',
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
            'testorg.sudo.ROUNDTRIP_KEY',
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
          fixture: 'with-vault-os-secure',
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

        // .note = use testorg from fixture, not @all (org validation rejects mismatch)
        const setResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CUSTOM_LOC_KEY',
            '--env',
            'sudo',
            '--org',
            'testorg',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
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
            'testorg.sudo.CUSTOM_LOC_KEY',
          ],
          cwd: repo2.path,
          env: { HOME: repo2.path },
        });

        const getResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.CUSTOM_LOC_KEY',
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

  /**
   * [uc4] list --prikey with custom owner
   * list command decrypts manifest, needs --prikey for custom key locations
   */
  given('[case4] list --prikey with custom owner', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'list-prikey',
      });

      // generate keypair outside ~/.ssh/
      const customKeyDir = join(repo.path, 'custom-keys');
      mkdirSync(customKeyDir, { recursive: true });
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
      );

      const prikeyPath = join(customKeyDir, 'custom_key');

      // init with custom key path
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // set a key so list has something to show
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'LIST_TEST_KEY',
          '--env',
          'all',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.secure',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'list-test-secret\n',
      });

      return { repo, prikeyPath };
    });

    when('[t0] list without --prikey (discovery fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'robot'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions prikey or no match', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/prikey|no match|decrypt/i);
      });
    });

    when('[t1] list --owner robot --prikey /path/to/key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'list',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('lists keys from manifest', () => {
        // keyrack list --json returns hosts object (Record<slug, host>)
        const parsed = JSON.parse(result.stdout);
        const slugs = Object.keys(parsed);
        expect(slugs.length).toBeGreaterThan(0);
        expect(slugs.some((slug: string) => slug.includes('LIST_TEST_KEY'))).toBe(true);
      });
    });
  });

  /**
   * [uc5] del --prikey with custom owner
   * del command decrypts manifest, needs --prikey for custom key locations
   */
  given('[case5] del --prikey with custom owner', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'del-prikey',
      });

      // generate keypair outside ~/.ssh/
      const customKeyDir = join(repo.path, 'custom-keys');
      mkdirSync(customKeyDir, { recursive: true });
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
      );

      const prikeyPath = join(customKeyDir, 'custom_key');

      // init with custom key path
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // set a key so del has something to delete
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_TEST_KEY',
          '--env',
          'all',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.secure',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'del-test-secret\n',
      });

      return { repo, prikeyPath };
    });

    when('[t0] del without --prikey (discovery fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--owner',
            'robot',
            '--key',
            'DEL_TEST_KEY',
            '--env',
            'all',
            '--org',
            '@all',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions prikey or no match', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/prikey|no match|decrypt/i);
      });
    });

    when('[t1] del --owner robot --prikey /path/to/key --key TEST_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--key',
            'DEL_TEST_KEY',
            '--env',
            'all',
            '--org',
            '@all',
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key removed from manifest', () => {
        // keyrack del --json returns { slug, effect }
        const parsed = JSON.parse(result.stdout);
        expect(parsed.effect).toEqual('deleted');
      });
    });
  });

  /**
   * [uc6] recipient get --prikey with custom owner
   * recipient get decrypts manifest, needs --prikey for custom key locations
   */
  given('[case6] recipient get --prikey with custom owner', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'recipient-get-prikey',
      });

      // generate keypair outside ~/.ssh/
      const customKeyDir = join(repo.path, 'custom-keys');
      mkdirSync(customKeyDir, { recursive: true });
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
      );

      const prikeyPath = join(customKeyDir, 'custom_key');

      // init with custom key path
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      return { repo, prikeyPath };
    });

    when('[t0] recipient get without --prikey (discovery fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get', '--owner', 'robot'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions prikey or no match', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/prikey|no match|decrypt/i);
      });
    });

    when('[t1] recipient get --owner robot --prikey /path/to/key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'get',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('lists recipients', () => {
        // keyrack recipient get --json returns array of recipients
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThan(0);
      });
    });
  });

  /**
   * [uc7] recipient set --prikey with custom owner
   * recipient set decrypts manifest, needs --prikey for custom key locations
   */
  given('[case7] recipient set --prikey with custom owner', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'recipient-set-prikey',
      });

      // generate keypair outside ~/.ssh/
      const customKeyDir = join(repo.path, 'custom-keys');
      mkdirSync(customKeyDir, { recursive: true });
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
      );

      // generate a second keypair to add as recipient
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'backup_key')} -N "" -q`,
      );

      const prikeyPath = join(customKeyDir, 'custom_key');
      const backupPubkeyPath = join(customKeyDir, 'backup_key.pub');
      // read pubkey content (--pubkey expects content, not path)
      // strip comment to avoid shell split: "ssh-ed25519 AAAA... comment" → "ssh-ed25519 AAAA..."
      const backupPubkey = readFileSync(backupPubkeyPath, 'utf8')
        .trim()
        .split(' ')
        .slice(0, 2)
        .join(' ');

      // init with custom key path
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      return { repo, prikeyPath, backupPubkey };
    });

    when('[t0] recipient set without --prikey (discovery fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--owner',
            'robot',
            '--pubkey',
            scene.backupPubkey,
            '--label',
            'backup',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions prikey or no match', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/prikey|no match|decrypt/i);
      });
    });

    when('[t1] recipient set --owner robot --prikey /path/to/key --pubkey ... --label backup', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--pubkey',
            scene.backupPubkey,
            '--label',
            'backup',
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('exits with status 0', () => {
        // skip test if age CLI not available (required for ssh key recipients)
        if (!isAgeCLIAvailable()) {
          console.log('test skipped: age CLI not installed');
          return;
        }
        expect(result.status).toEqual(0);
      });

      then('recipient added', () => {
        // skip test if age CLI not available (required for ssh key recipients)
        if (!isAgeCLIAvailable()) {
          console.log('test skipped: age CLI not installed');
          return;
        }
        // keyrack recipient set --json returns the added recipient object
        const parsed = JSON.parse(result.stdout);
        expect(parsed.label).toEqual('backup');
      });
    });
  });

  /**
   * [uc8] recipient del --prikey with custom owner
   * recipient del decrypts manifest, needs --prikey for custom key locations
   */
  given('[case8] recipient del --prikey with custom owner', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'recipient-del-prikey',
      });

      // generate keypair outside ~/.ssh/
      const customKeyDir = join(repo.path, 'custom-keys');
      mkdirSync(customKeyDir, { recursive: true });
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
      );

      // generate a second keypair to add then delete as recipient
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'backup_key')} -N "" -q`,
      );

      const prikeyPath = join(customKeyDir, 'custom_key');
      const backupPubkeyPath = join(customKeyDir, 'backup_key.pub');
      // strip comment to avoid shell split: "ssh-ed25519 AAAA... comment" → "ssh-ed25519 AAAA..."
      const backupPubkey = readFileSync(backupPubkeyPath, 'utf8')
        .trim()
        .split(' ')
        .slice(0, 2)
        .join(' ');

      // init with custom key path
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // add backup recipient
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'recipient',
          'set',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
          '--pubkey',
          backupPubkey,
          '--label',
          'backup',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      return { repo, prikeyPath };
    });

    when('[t0] recipient del without --prikey (discovery fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'del',
            '--owner',
            'robot',
            '--label',
            'backup',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions prikey or no match', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/prikey|no match|decrypt/i);
      });
    });

    when('[t1] recipient del --owner robot --prikey /path/to/key --label backup', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'del',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--label',
            'backup',
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('exits with status 0', () => {
        // skip test if age CLI not available (required for ssh key recipients)
        if (!isAgeCLIAvailable()) {
          console.log('test skipped: age CLI not installed');
          return;
        }
        expect(result.status).toEqual(0);
      });

      then('recipient removed', () => {
        // skip test if age CLI not available (required for ssh key recipients)
        if (!isAgeCLIAvailable()) {
          console.log('test skipped: age CLI not installed');
          return;
        }
        // keyrack recipient del --json returns { deleted: label }
        const parsed = JSON.parse(result.stdout);
        expect(parsed.deleted).toEqual('backup');
      });
    });
  });

  /**
   * [uc9] set --vault os.secure --prikey with non-standard key location
   * tests that explicit prikey propagates identity for os.secure vault operations
   */
  given('[case9] set --vault os.secure --prikey with non-standard key', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'set-secure-prikey',
      });

      // generate keypair outside ~/.ssh/ (non-standard location)
      const customKeyDir = join(repo.path, 'custom-keys');
      mkdirSync(customKeyDir, { recursive: true });
      execSync(
        `ssh-keygen -t ed25519 -f ${join(customKeyDir, 'custom_key')} -N "" -q`,
      );

      const prikeyPath = join(customKeyDir, 'custom_key');

      // init with custom key path
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      return { repo, prikeyPath };
    });

    when('[t0] set --vault os.secure without --prikey (discovery fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SECURE_NO_PRIKEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--owner',
            'robot',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          stdin: 'should-fail\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions prikey or no match', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/prikey|no match|decrypt/i);
      });
    });

    when('[t1] set --vault os.secure --prikey (explicit key)', () => {
      // .note = use testorg from fixture, not @all (org validation rejects mismatch)
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SECURE_WITH_PRIKEY',
            '--env',
            'sudo',
            '--org',
            'testorg',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          stdin: 'secure-secret-value-789\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns key config with os.secure vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.sudo.SECURE_WITH_PRIKEY');
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t2] unlock + get after set --vault os.secure --prikey', () => {
      // set key first (duplicate from t1 to ensure isolation)
      // .note = use testorg from fixture, not @all (org validation rejects mismatch)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SECURE_ROUNDTRIP',
            '--env',
            'sudo',
            '--org',
            'testorg',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          stdin: 'roundtrip-secure-xyz\n',
        }),
      );

      // unlock with explicit prikey
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'robot',
            '--prikey',
            scene.prikeyPath,
            '--env',
            'sudo',
            '--key',
            'testorg.sudo.SECURE_ROUNDTRIP',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      // get from daemon
      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.SECURE_ROUNDTRIP',
            '--owner',
            'robot',
            '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('get returns correct secret', () => {
        expect(getResult.status).toEqual(0);
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('roundtrip-secure-xyz');
      });

      then('grant source vault is os.secure (preserves original vault)', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.source.vault).toEqual('os.secure');
      });
    });
  });
});
