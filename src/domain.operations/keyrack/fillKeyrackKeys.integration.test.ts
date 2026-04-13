import { given, then, useBeforeAll, when } from 'test-fns';

import {
  createTestHomeWithSshKey,
  TEST_SSH_AGE_RECIPIENT,
} from '@src/.test/infra';
import {
  genMockPromptHiddenInput,
  setMockPromptValues,
} from '@src/.test/infra/mockPromptHiddenInput';
import {
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
import { pruneKeyrackDaemon } from './daemon/sdk';
import { fillKeyrackKeys } from './fillKeyrackKeys';

// mock stdin prompts for vault adapters
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());
// mock stdin prompts for mech selection
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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
              vaultRecipient: null,
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
        expect(result.summary.failed).toEqual(0);

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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
        expect(result.summary.failed).toEqual(0);

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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
        expect(result.summary.failed).toEqual(0);

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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
              vaultRecipient: null,
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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
              vaultRecipient: null,
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
              vaultRecipient: null,
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
        expect(result.summary.failed).toEqual(0);

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
        pubkey: TEST_SSH_AGE_RECIPIENT,
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
      then('stores USPTO_ODP_API_KEY under rhight org', async () => {
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
        expect(result.summary.failed).toEqual(0);

        // verify slugs in results show correct orgs
        const slugs = result.results.map((r) => r.slug);

        // USPTO_ODP_API_KEY from extended manifest should be under rhight org
        expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');

        // DB_PASSWORD from root manifest should be under ahbode org
        expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
      });
    });
  });
});
