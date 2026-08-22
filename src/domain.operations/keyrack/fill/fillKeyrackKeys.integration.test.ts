import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  createTestHomeWithSshKey,
  getTestSshAgeRecipient,
} from '@src/.test/infra';
import {
  genMockPromptHiddenInput,
  setMockPromptValues,
} from '@src/.test/infra/mockPromptHiddenInput';
import {
  clearMockPromptLineValues,
  genMockPromptLineInput,
  setMockPromptLineValues,
} from '@src/.test/infra/mockPromptLineInput';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pruneKeyrackDaemon } from '../daemon/sdk';
import { fillKeyrackKeys } from './fillKeyrackKeys';

/**
 * .mock = the two stdin prompt readers — `promptHiddenInput`, `promptLineInput`
 *
 * .why = these are the ONE boundary an integration test cannot cross, and the reason is
 *        physical rather than a matter of convenience. both read a human keystroke from a
 *        TTY, and a jest worker has no TTY: `process.stdin` is a pipe that no one writes
 *        to. a real prompt here does not fail — it **hangs**, until jest's timeout kills
 *        the worker. so there is no "run it for real" arm to choose; the choice is between
 *        a fake keystroke source and no coverage of `fill` at all.
 *
 * .what stays real = each piece the test actually asserts on. the age encryption, the
 *        on-disk host manifest, the os.direct vault files, the daemon socket, the unlock
 *        and the get roundtrip are all genuine — `createTestHomeWithSshKey` stands up a
 *        real ssh key and a real `$HOME`. what is faked is the SOURCE OF THE KEYSTROKES,
 *        never the system under test (`rule.forbid.unit.remote-boundaries`'s distinction
 *        between a fake dependency and a mocked subject).
 *
 * .real = the same journeys run against a GENUINE TTY one grain up, in
 *         `blackbox/cli/keyrack.fill.acceptance.test.ts`. it drives the built binary under
 *         `blackbox/.test/assets/pty-with-answers.js` — a real pseudo-terminal that
 *         watches stdout for each prompt pattern and answers on detection rather than on a
 *         timer. so the prompt reader this file fakes is exercised for real over there,
 *         with no mock at all, and the two grains cover complementary halves: the pty
 *         suite proves the prompts work; this file proves the branch logic behind them.
 *
 * .note = this exception is what `rule.forbid.integration.mocks` provides for — a mock
 *         that is clearly unavoidable, documented inline where it is declared, and paired
 *         with a real-boundary test elsewhere.
 */
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());
jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput());

/**
 * .what = writes a secret directly to os.direct vault storage
 * .why = enables integration tests to simulate "already set" state
 */
const writeDirectVaultSecret = (input: {
  home: string;
  owner: string | null;
  slug: string;
  value: string;
}): void => {
  const ownerDir = `owner=${input.owner ?? 'default'}`;
  const storePath = join(
    input.home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.direct',
    ownerDir,
    'keyrack.direct.json',
  );

  // read extant store or create empty
  let store: Record<string, { value: string }> = {};
  if (existsSync(storePath)) {
    store = JSON.parse(require('fs').readFileSync(storePath, 'utf8'));
  }

  // add the secret
  store[input.slug] = { value: input.value };

  // write store
  const dir = dirname(storePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
};

describe('fillKeyrackKeys.integration', () => {
  // use test home with SSH key in ~/.ssh/id_ed25519
  // dao will discover this key naturally via default discovery
  const testHome = createTestHomeWithSshKey({
    name: 'fillKeyrackKeys-integration',
  });

  // isolate XDG_RUNTIME_DIR to prevent pruneKeyrackDaemon from kill of real daemons
  // .note = without this, pruneKeyrackDaemon({ owner: '@all' }) scans the REAL
  //         runtime dir and kills daemons outside this test's scope
  const testRuntimeDir = `/tmp/keyrack-fill-test-${process.pid}`;
  let originalXdgRuntimeDir: string | undefined;

  // capture emitted output via context.emit
  let emitSpy: jest.Mock;

  beforeAll(() => {
    // create isolated runtime dir
    if (!existsSync(testRuntimeDir)) mkdirSync(testRuntimeDir);
    originalXdgRuntimeDir = process.env['XDG_RUNTIME_DIR'];
    process.env['XDG_RUNTIME_DIR'] = testRuntimeDir;

    return testHome.setup();
  });
  afterAll(() => {
    // restore original XDG_RUNTIME_DIR
    if (originalXdgRuntimeDir !== undefined) {
      process.env['XDG_RUNTIME_DIR'] = originalXdgRuntimeDir;
    } else {
      delete process.env['XDG_RUNTIME_DIR'];
    }

    // restore the stdin.isTTY override this file's prompts opted into
    clearMockPromptLineValues();

    return testHome.teardown();
  });

  beforeEach(() => {
    emitSpy = jest.fn();
    // prune all daemons to ensure clean state between tests
    // .note = daemon persists keys in memory; without prune, keys from prior
    //         test runs would cause fill to skip (already granted)
    // .note = safe because XDG_RUNTIME_DIR is isolated to testRuntimeDir
    pruneKeyrackDaemon({ owner: '@all' });
  });

  given('[case1] repo with env=all key already set', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case1');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // create keyrack.yml with keys in env.test
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      // pre-set the key with env=all (fallback should recognize this)
      const now = new Date().toISOString();
      const manifestResult = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case1.age',
          owner: 'case1',
          recipients: [recipient],
          hosts: {
            'testorg.all.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.all.API_KEY',
              env: 'all',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              meta: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });

      // also write the secret to os.direct vault storage
      writeDirectVaultSecret({
        home: testHome.path,
        owner: 'case1',
        slug: 'testorg.all.API_KEY',
        value: 'test-api-key-value',
      });

      return manifestResult;
    });

    when('[t0] fill is called with env=test', () => {
      then('skips the key because env=all fallback finds it', async () => {
        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case1'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // verify skipped (env=all fallback found the key)
        expect(result.summary.set).toEqual(0);
        expect(result.summary.skipped).toEqual(1);

        // verify the skip message mentions the env=all slug
        const logCalls = emitSpy.mock.calls.map((c) => c[0]);
        const skipLog = logCalls.find(
          (l) => typeof l === 'string' && l.includes('found vaulted under'),
        );
        expect(skipLog).toContain('testorg.all.API_KEY');

        // snapshot the tree output for visual proof in PRs
        const treeOutput = logCalls
          .filter((l) => typeof l === 'string')
          .join('\n');
        expect(treeOutput).toMatchSnapshot();
      });
    });
  });

  given('[case2] fresh fill with 2+ keys (journey 1)', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case2-journey1');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // create keyrack.yml with 2 keys in env.test
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
  - SECRET_TOKEN
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      // empty host manifest (no keys set yet)
      const manifestResult = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case2j1.age',
          owner: 'case2j1',
          recipients: [recipient],
          hosts: {},
        }),
      });

      return manifestResult;
    });

    when('[t0] fill is called with env=test', () => {
      then('sets all 2 keys via prompts', async () => {
        // provide mock stdin values: mech selection (line) + secret (hidden)
        // '1' = PERMANENT_VIA_REPLICA (2 keys = 2 mech prompts)
        setMockPromptLineValues(['1', '1']);
        setMockPromptValues(['api-key-value-1', 'secret-token-value-2']);

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case2j1'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // verify both keys were set
        expect(result.summary.set).toEqual(2);
        expect(result.summary.skipped).toEqual(0);

        // verify tree output shows both keys
        const logCalls = emitSpy.mock.calls.map((c) => c[0]);
        const keyLogs = logCalls.filter(
          (l) => typeof l === 'string' && l.includes('key'),
        );
        expect(keyLogs.some((l) => l.includes('API_KEY'))).toBe(true);
        expect(keyLogs.some((l) => l.includes('SECRET_TOKEN'))).toBe(true);

        // snapshot the tree output for visual proof in PRs
        const treeOutput = logCalls
          .filter((l) => typeof l === 'string')
          .join('\n');
        expect(treeOutput).toMatchSnapshot();
      });
    });
  });

  given('[case3] multiple owners (journey 2)', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case3-journey2');
      mkdirSync(join(root, '.agent'), { recursive: true });

      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    const manifests = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      // create empty host manifests for both owners
      const ownerA = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case3ownerA.age',
          owner: 'case3ownerA',
          recipients: [recipient],
          hosts: {},
        }),
      });

      const ownerB = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case3ownerB.age',
          owner: 'case3ownerB',
          recipients: [recipient],
          hosts: {},
        }),
      });

      return { ownerA, ownerB };
    });

    when('[t0] fill is called with 2 owners', () => {
      then('sets the key for both owners', async () => {
        // provide mock stdin values: mech selection (line) + secret (hidden)
        // '1' = PERMANENT_VIA_REPLICA (2 owners = 2 mech prompts)
        setMockPromptLineValues(['1', '1']);
        setMockPromptValues(['api-key-for-ownerA', 'api-key-for-ownerB']);

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case3ownerA', 'case3ownerB'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // verify key was set for both owners (1 key × 2 owners = 2 total)
        expect(result.summary.set).toEqual(2);
        expect(result.summary.skipped).toEqual(0);

        // verify tree output shows both owners
        const logCalls = emitSpy.mock.calls.map((c) => c[0]);
        const ownerLogs = logCalls.filter(
          (l) => typeof l === 'string' && l.includes('owner'),
        );
        expect(ownerLogs.some((l) => l.includes('case3ownerA'))).toBe(true);
        expect(ownerLogs.some((l) => l.includes('case3ownerB'))).toBe(true);
      });
    });
  });

  given('[case4] refresh forces re-set of extant key', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case4');
      mkdirSync(join(root, '.agent'), { recursive: true });

      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      // pre-set the key
      const now = new Date().toISOString();
      const manifestResult = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case4.age',
          owner: 'case4',
          recipients: [recipient],
          hosts: {
            'testorg.test.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.test.API_KEY',
              env: 'test',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              meta: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });

      // write the secret to os.direct vault storage
      writeDirectVaultSecret({
        home: testHome.path,
        owner: 'case4',
        slug: 'testorg.test.API_KEY',
        value: 'old-api-key-value',
      });

      return manifestResult;
    });

    when('[t0] fill is called with --refresh', () => {
      then('re-sets the key despite already configured', async () => {
        // provide mock stdin values: mech selection (line) + secret (hidden)
        // '1' = PERMANENT_VIA_REPLICA
        setMockPromptLineValues('1');
        setMockPromptValues('new-api-key-value');

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case4'],
            prikeys: [],
            key: null,
            refresh: true,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // verify set (not skipped) due to refresh
        expect(result.summary.set).toEqual(1);
        expect(result.summary.skipped).toEqual(0);
      });
    });
  });

  given('[case5] --key filter with nonexistent key', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case5');
      mkdirSync(join(root, '.agent'), { recursive: true });

      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case5.age',
          owner: 'case5',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] fill is called with --key NONEXISTENT_KEY', () => {
      then('fails with key not found error', async () => {
        const error = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case5'],
            prikeys: [],
            key: 'NONEXISTENT_KEY',
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        ).catch((e) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('NONEXISTENT_KEY');
        expect(error.message).toContain('not found');
      });
    });
  });

  given('[case6] nonexistent owner (prikey fail-fast)', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case6');
      mkdirSync(join(root, '.agent'), { recursive: true });

      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    // no manifest setup for 'nonexistent' owner — prikey resolution will fail

    when('[t0] fill is called with --owner nonexistent', () => {
      then('fails with no available prikey error', async () => {
        const error = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['nonexistent'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        ).catch((e) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('nonexistent');
      });

      // .note = the CLASS carries the weight here. a mistyped `--owner` is caller-fixable
      //         (exit 2), and it surfaced as an `MalfunctionError` (exit 1) from deep
      //         inside `setKeyrackKeyHost` until the fail-fast guard landed — a defect code
      //         for a typo (`rule.require.exit-code-semantics`)
      then('it is caller-fixable, not a defect', async () => {
        const error = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['nonexistent'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        ).catch((e) => e);

        expect(error).toBeInstanceOf(ConstraintError);
      });

      // .note = a bare "no manifest" would leave the caller to guess whether they typoed the
      //         owner or never ran init. the hint answers that in one copy-paste line
      //         (`rule.require.errors-name-the-fix`)
      then('it names the fix', async () => {
        const error = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['nonexistent'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        ).catch((e) => e);

        expect(JSON.stringify(error.metadata)).toContain(
          'rhx keyrack init --owner nonexistent',
        );
      });
    });
  });

  given('[case7] refresh + multiple owners', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case7');
      mkdirSync(join(root, '.agent'), { recursive: true });

      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    const manifests = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const now = new Date().toISOString();

      // pre-set key for ownerA
      const ownerA = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case7ownerA.age',
          owner: 'case7ownerA',
          recipients: [recipient],
          hosts: {
            'testorg.test.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.test.API_KEY',
              env: 'test',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              meta: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });

      // pre-set key for ownerB
      const ownerB = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case7ownerB.age',
          owner: 'case7ownerB',
          recipients: [recipient],
          hosts: {
            'testorg.test.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.test.API_KEY',
              env: 'test',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              meta: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });

      // write secrets to os.direct vault storage for both owners
      writeDirectVaultSecret({
        home: testHome.path,
        owner: 'case7ownerA',
        slug: 'testorg.test.API_KEY',
        value: 'old-api-key-ownerA',
      });
      writeDirectVaultSecret({
        home: testHome.path,
        owner: 'case7ownerB',
        slug: 'testorg.test.API_KEY',
        value: 'old-api-key-ownerB',
      });

      return { ownerA, ownerB };
    });

    when('[t0] fill is called with --refresh and 2 owners', () => {
      then('re-sets the key for both owners', async () => {
        // provide mock stdin values: mech selection (line) + secret (hidden)
        // '1' = PERMANENT_VIA_REPLICA (2 owners = 2 mech prompts)
        setMockPromptLineValues(['1', '1']);
        setMockPromptValues(['new-api-key-ownerA', 'new-api-key-ownerB']);

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case7ownerA', 'case7ownerB'],
            prikeys: [],
            key: null,
            refresh: true,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // verify both owners were re-set (not skipped)
        expect(result.summary.set).toEqual(2);
        expect(result.summary.skipped).toEqual(0);

        // verify tree output shows both owners
        const logCalls = emitSpy.mock.calls.map((c) => c[0]);
        const ownerLogs = logCalls.filter(
          (l) => typeof l === 'string' && l.includes('owner'),
        );
        expect(ownerLogs.some((l) => l.includes('case7ownerA'))).toBe(true);
        expect(ownerLogs.some((l) => l.includes('case7ownerB'))).toBe(true);

        // verify "set the key" appears twice (once per owner)
        const setLogs = logCalls.filter(
          (l) => typeof l === 'string' && l.includes('set the key'),
        );
        expect(setLogs.length).toEqual(2);
      });
    });
  });

  given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case8-crossorg');

      // create extended keyrack (org: rhight)
      const roleDir = join(root, '.agent', 'repo=rhight', 'role=patenter');
      mkdirSync(roleDir, { recursive: true });
      writeFileSync(
        join(roleDir, 'keyrack.yml'),
        `org: rhight
env.prod:
  - USPTO_ODP_API_KEY
`,
        'utf8',
      );

      // create root keyrack (org: ahbode, extends rhight)
      // .note = extends paths are relative to gitroot
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: ahbode
extends:
  - .agent/repo=rhight/role=patenter/keyrack.yml
env.prod:
  - DB_PASSWORD
`,
        'utf8',
      );

      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      // empty host manifest (no keys set yet)
      const manifestResult = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case8.age',
          owner: 'case8',
          recipients: [recipient],
          hosts: {},
        }),
      });

      return manifestResult;
    });

    when('[t0] fill is called with env=prod', () => {
      then('stores both keys under root org (ahbode)', async () => {
        // provide mock stdin values: mech selection (line) + secret (hidden)
        // '1' = PERMANENT_VIA_REPLICA (2 keys = 2 mech prompts)
        setMockPromptLineValues(['1', '1']);
        setMockPromptValues(['db-password-value', 'uspto-key-value']);

        const result = await fillKeyrackKeys(
          {
            env: 'prod',
            owners: ['case8'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // verify both keys set
        expect(result.summary.set).toEqual(2);

        // verify slugs in results show correct orgs
        const slugs = result.results.map((r) => r.slug);

        // USPTO_ODP_API_KEY from extended manifest RE-SLUGGED to root org
        expect(slugs).toContain('ahbode.prod.USPTO_ODP_API_KEY');

        // DB_PASSWORD from root manifest should be under ahbode org
        expect(slugs).toContain('ahbode.prod.DB_PASSWORD');

        // extended org should NOT be present
        expect(slugs).not.toContain('rhight.prod.USPTO_ODP_API_KEY');
      });
    });
  });

  /**
   * [case9] a repo manifest that DECLARES reaches — the q8/q10 journey, end to end
   *
   * .what = drives the real `fillKeyrackKeys` against a manifest whose key declares two
   *         reaches, and clamps that fill provisions BOTH beside the reachless key
   * .why = this is the headline behavior of the whole reach axis: a repo states the FLOOR of
   *        reaches every developer must hold, and `fill` walks a human to that floor. it
   *        was the one journey with no coverage at any grain above the pure transformers
   *
   * .note = ⚠️ this case exists because an earlier attempt at the BLACKBOX grain kept red:
   *         the built cli halts on key 1's interactive secret prompt, so the walk never
   *         reached the key that carries the reaches. that is a harness wall, not a `fill`
   *         defect — and it does not exist here, because this suite already mocks both
   *         prompt modules at the top of the file. the reach journey was reachable one grain
   *         down the whole time
   * .note = the manifest shape mirrors `blackbox/.test/assets/with-keyrack-reaches`, so the
   *         fixture and this case stay one declaration, read two ways
   */
  given('[case9] a manifest that declares reaches (q8/q10)', () => {
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case9-reaches');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // a `reaches:` line is hand-authored by a human; no keyrack command writes it (q8)
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - PLAIN_KEY
  - MULTI_REACH_KEY:
      reaches:
        - beav@ehmpathy.com
        - vlad@ehmpathy.com
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await getTestSshAgeRecipient(),
        label: 'test-key',
        addedAt: new Date().toJSON(),
      });

      // empty host manifest — every reach below is cut fresh by this fill
      return await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case9.age',
          owner: 'case9',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] fill is called with env=test', () => {
      then('it provisions the reachless key AND both reaches', async () => {
        // 4 targets => 4 mech prompts + 4 secrets. each reach is its OWN key, so it
        // gets its OWN secret — that is the whole claim of the axis, made concrete here
        //
        // .note = the count is 4, not 3, and the extra one is easy to miss:
        //         `getAllKeyrackFillTargets` emits the reachless target
        //         **unconditionally**, then adds one beside it per declared reach. so
        //         MULTI_REACH_KEY has THREE targets (reachless + beav + vlad), not two.
        //         the rule it encodes: "a repo declares a MINIMUM, never a maximum — it
        //         can add a reach to fill, never take one away"
        setMockPromptLineValues(['1', '1', '1', '1']);
        setMockPromptValues([
          'plain-value',
          'multi-reachless-value',
          'value-for-beav',
          'value-for-vlad',
        ]);

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case9'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: false,
          },
          { gitroot: repo.path, emit: emitSpy },
        );

        // PLAIN_KEY (1) + MULTI_REACH_KEY reachless, beav, vlad (3)
        expect(result.summary.set).toEqual(4);

        const slugs = result.results.map((r) => r.slug);
        expect(slugs).toContain('testorg.test.PLAIN_KEY');
        expect(slugs).toContain('testorg.test.MULTI_REACH_KEY');

        // THE clamp: one declared name yields THREE fill targets. a fill that dropped the
        // declared reaches would still set a `MULTI_REACH_KEY` and still read green on the
        // slug assertion above — only the count of its occurrences tells them apart. 3 =
        // the unconditional reachless target + one per declared reach, which is the
        // contract `getAllKeyrackFillTargets` states, not a number read off a run
        //
        // .note = ⚠️ this clamps the ENUMERATION, not the ADDRESSING. `results` carries one
        //         entry per target, so a fill that walked all 3 targets and wrote them to
        //         ONE address would pass this line. that hazard is clamped where it is
        //         observable — `keyrack.set` `[case7]` reads `list` back and proves both
        //         addresses coexist, and `keyrack.del` `[case-reach]` proves one can be
        //         destroyed with its peer left whole. said plainly here so the next reader
        //         does not credit this case with a guarantee it does not carry
        const reachSlugs = slugs.filter(
          (slug) => slug === 'testorg.test.MULTI_REACH_KEY',
        );
        expect(reachSlugs).toHaveLength(3);

        // and PLAIN_KEY declares no reach, so it takes exactly one target — the e1 promise
        // that a reachless key gains no new branch from this feature
        const plainSlugs = slugs.filter(
          (slug) => slug === 'testorg.test.PLAIN_KEY',
        );
        expect(plainSlugs).toHaveLength(1);

        // the human must be able to SEE which reaches were filled
        const logCalls = emitSpy.mock.calls.map((c) => c[0]);
        const treeOutput = logCalls
          .filter((l) => typeof l === 'string')
          .join('\n');
        expect(treeOutput).toContain('beav@ehmpathy.com');
        expect(treeOutput).toContain('vlad@ehmpathy.com');

        expect(treeOutput).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a DANGEROUS credential held at every declared reach, met by each of the two
   *         opt-ins the blocked path offers — `--allow-dangerous` and `--repair`
   * .why = the blocked-key branch and the reach axis were each proven alone and never
   *         together. they intersect at a place that carries weight: the branch decides per
   *         `checkGrant`, and `checkGrant` is now asked PER TARGET — so a reach dropped there
   *         would make one target's verdict govern all three, and a human who repaired
   *         "the key" would silently leave two reaches dangerous
   *
   * .note = the seed writes the vault DIRECTLY rather than through a fill, because a fill
   *         cannot produce this state: its roundtrip `get` returns `blocked` for a dangerous
   *         value and `assertKeyrackFillRoundtrip` throws. so the only way to reach the
   *         branch under test is to arrive with the state already there — which is also how
   *         a human reaches it (a token that was safe when stored, later reclassified)
   * .note = `ghp_` is the tell `mechAdapterReplica.validate` reads — a github classic PAT,
   *         one of the long-lived patterns the firewall names
   * .note = ⚠️ the two cases DO NOT bite the same defect, and the difference is worth stating
   *         rather than left for the next author to rediscover. dogfooded, both directions:
   *          - drop the reach from the per-target `getKeyrackKeyGrant` → `[case11]` goes red
   *            (each reach reads the reachless verdict, so only one repair fires), while
   *            `[case10]` stays GREEN — every target reads the same blocked verdict, and
   *            `--allow-dangerous` skips all three either way, so the case cannot see it
   *          - drop the declared reaches from `getAllKeyrackFillTargets` → `[case9]`,
   *            `[case10]`, and `[case11]` all go red
   *         so `[case10]` clamps the ENUMERATION and `[case11]` clamps the ADDRESSING. read
   *         as a pair they cover the branch; read alone, neither does
   */
  const genDangerScene = (input: { caseName: string }) => {
    const dangerReaches = [
      { exid: null, address: 'testorg.test.DANGER_KEY' },
      {
        exid: 'beav@ehmpathy.com',
        address: 'testorg.test.DANGER_KEY@beav@ehmpathy.com',
      },
      {
        exid: 'vlad@ehmpathy.com',
        address: 'testorg.test.DANGER_KEY@vlad@ehmpathy.com',
      },
    ];

    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, `repo-${input.caseName}`);
      mkdirSync(join(root, '.agent'), { recursive: true });
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - DANGER_KEY:
      reaches:
        - beav@ehmpathy.com
        - vlad@ehmpathy.com
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const now = new Date().toJSON();
      const hosts: Record<string, KeyrackKeyHost> = {};
      for (const target of dangerReaches)
        hosts[target.address] = new KeyrackKeyHost({
          slug: 'testorg.test.DANGER_KEY',
          env: 'test',
          org: 'testorg',
          vault: 'os.direct',
          mech: 'PERMANENT_VIA_REPLICA',
          exid: null,
          meta: null,
          maxDuration: null,
          // e16: the field is OMITTED for the reachless entry, never written as null
          ...(target.exid ? { reach: { exid: target.exid } } : {}),
          createdAt: now,
          updatedAt: now,
        });

      const manifestResult = await daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: `~/.rhachet/keyrack/keyrack.host.${input.caseName}.age`,
          owner: input.caseName,
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: await getTestSshAgeRecipient(),
              label: 'test-key',
              addedAt: now,
            }),
          ],
          hosts,
        }),
      });

      // a DISTINCT dangerous value per reach, so an assertion can tell which one a
      // verdict came from rather than merely that some dangerous value was present
      for (const target of dangerReaches)
        writeDirectVaultSecret({
          home: testHome.path,
          owner: input.caseName,
          slug: target.address,
          value: `ghp_dangerous_${target.exid ?? 'reachless'}`,
        });

      return manifestResult;
    });

    return { repo, manifest, dangerReaches };
  };

  given('[case10] a dangerous credential at every declared reach', () => {
    const scene = genDangerScene({ caseName: 'case10' });

    when('[t0] fill runs with --allow-dangerous', () => {
      then('every reach is accepted as-is, none is re-set', async () => {
        // the manifest must exist before fill reads it
        expect(scene.manifest).toBeDefined();

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case10'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: false,
            allowDangerous: true,
          },
          { gitroot: scene.repo.path, emit: emitSpy },
        );

        // ⚠️ THE clamp: THREE skips, not one. the blocked branch is evaluated per TARGET, so
        //    a reach dropped at the `checkGrant` would let one target's verdict answer for
        //    all three — and the two reaches would go unaccounted for entirely
        expect(result.summary.skipped).toEqual(3);
        expect(result.summary.set).toEqual(0);

        // and each skip is attributed to its own reach, not to a shared slug
        // .note = the reachless entry maps to a WORD rather than to `null`, so the sort is a
        //         plain string sort with one obvious order. a mixed string/null array sorts
        //         by `String(null)`, which lands 'null' between 'beav' and 'vlad' — a
        //         correct result that reads as a defect on the diff
        const reaches = result.results
          .map((r) => r.reach?.exid ?? 'reachless')
          .sort();
        expect(reaches).toEqual([
          'beav@ehmpathy.com',
          'reachless',
          'vlad@ehmpathy.com',
        ]);

        const treeOutput = emitSpy.mock.calls
          .map((c) => c[0])
          .filter((l) => typeof l === 'string')
          .join('\n');
        expect(treeOutput).toContain('--allow-dangerous');
        expect(treeOutput).toMatchSnapshot();
      });
    });
  });

  given('[case11] a dangerous credential repaired at every reach', () => {
    const scene = genDangerScene({ caseName: 'case11' });

    when('[t0] fill runs with --repair', () => {
      then('every reach is overwritten with its own new secret', async () => {
        expect(scene.manifest).toBeDefined();

        // one mech choice + one secret per target — the same 1:1 the axis promises
        setMockPromptLineValues(['1', '1', '1']);
        setMockPromptValues([
          'repaired-reachless',
          'repaired-for-beav',
          'repaired-for-vlad',
        ]);

        const result = await fillKeyrackKeys(
          {
            env: 'test',
            owners: ['case11'],
            prikeys: [],
            key: null,
            refresh: false,
            repair: true,
            allowDangerous: false,
          },
          { gitroot: scene.repo.path, emit: emitSpy },
        );

        // ⚠️ THE clamp, and the mirror of `[case10]`'s: a repair that saw one verdict for
        //    the slug would fix ONE reach and leave two dangerous — the worst outcome
        //    available here, because the human would read a green fill and believe it
        expect(result.summary.set).toEqual(3);
        expect(result.summary.skipped).toEqual(0);

        // .note = the reachless entry maps to a WORD rather than to `null`, so the sort is
        //         a plain string sort with one obvious order. a mixed string/null array
        //         sorts by `String(null)`, which lands 'null' between 'beav' and 'vlad' —
        //         a correct result that reads as a defect on the diff
        const reaches = result.results
          .map((r) => r.reach?.exid ?? 'reachless')
          .sort();
        expect(reaches).toEqual([
          'beav@ehmpathy.com',
          'reachless',
          'vlad@ehmpathy.com',
        ]);

        const treeOutput = emitSpy.mock.calls
          .map((c) => c[0])
          .filter((l) => typeof l === 'string')
          .join('\n');
        expect(treeOutput).toContain('blocked (dangerous), will repair');
        expect(treeOutput).toMatchSnapshot();
      });
    });
  });
});
