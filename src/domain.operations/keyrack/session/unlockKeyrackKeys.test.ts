import {
  BadRequestError,
  ConstraintError,
  MalfunctionError,
} from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import type { KeyrackAwsParamIdentity } from '@src/domain.operations/keyrack/adapters/vaults/aws.params/asKeyrackAwsParamIdentity';
import { getOneKeyrackAwsParamIdentity } from '@src/domain.operations/keyrack/adapters/vaults/aws.params/getOneKeyrackAwsParamIdentity';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

import { unlockKeyrackKeys } from './unlockKeyrackKeys';

// mock the daemon interactions to avoid socket access in unit tests
jest.mock('../daemon/sdk', () => ({
  daemonAccessUnlock: jest.fn().mockResolvedValue({ unlocked: [] }),
  findsertKeyrackDaemon: jest.fn().mockResolvedValue(undefined),
}));

// mock the daemon socket path
jest.mock('../daemon/infra/getKeyrackDaemonSocketPath', () => ({
  getKeyrackDaemonSocketPath: jest
    .fn()
    .mockReturnValue('/tmp/keyrack.test.sock'),
}));

describe('unlockKeyrackKeys', () => {
  given('[case1] env=sudo without key', () => {
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.sudo.SECRET_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: null,
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called without --key', () => {
      then('throws ConstraintError', async () => {
        const error = await getError(
          unlockKeyrackKeys({ env: 'sudo' }, context),
        );
        expect(error.message).toContain('sudo credentials require --key flag');
      });
    });
  });

  given('[case2] env=sudo with key', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'ehmpathy.sudo.SECRET_KEY': 'test-secret-value' },
    });
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.sudo.SECRET_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called with --key', () => {
      then('uses 30min default TTL', async () => {
        const result = await unlockKeyrackKeys(
          { env: 'sudo', key: 'SECRET_KEY' },
          context,
        );
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('ehmpathy.sudo.SECRET_KEY');
        expect(key.env).toEqual('sudo');

        // verify TTL is approximately 30 minutes (allow 5s tolerance)
        const thirtyMinMs = 30 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(thirtyMinMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(thirtyMinMs);
      });
    });
  });

  given('[case3] env=all (regular keys)', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'ehmpathy.all.API_KEY': 'test-api-key' },
    });
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.all.API_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'all',
            org: 'ehmpathy',
          },
        },
      }),
      repoManifest: genMockKeyrackRepoManifest({
        org: 'ehmpathy',
        keys: {
          'ehmpathy.all.API_KEY': { env: 'all', name: 'API_KEY' },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called without --env (defaults to all)', () => {
      then('uses 9h default TTL', async () => {
        const result = await unlockKeyrackKeys({}, context);
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('ehmpathy.all.API_KEY');

        // verify TTL is approximately 9 hours (allow 5s tolerance)
        const nineHoursMs = 9 * 60 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(nineHoursMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(nineHoursMs);
      });
    });
  });

  given('[case4] duration exceeds maxDuration', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'ehmpathy.sudo.SENSITIVE_KEY': 'sensitive-value' },
    });
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          'ehmpathy.sudo.SENSITIVE_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: 'ehmpathy',
            maxDuration: '5m',
          },
        },
      }),
      repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called with duration=1h (exceeds 5m maxDuration)', () => {
      then('caps to maxDuration', async () => {
        // capture console.warn
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await unlockKeyrackKeys(
          { env: 'sudo', key: 'SENSITIVE_KEY', duration: '1h' },
          context,
        );
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;

        // verify TTL is approximately 5 minutes (capped), not 1 hour
        const fiveMinMs = 5 * 60 * 1000;
        const oneHourMs = 60 * 60 * 1000;
        expect(key.expiresAt).toBeDefined();
        const expiresAtMs = key.expiresAt
          ? new Date(key.expiresAt).getTime()
          : 0;
        const expiresIn = expiresAtMs - Date.now();
        expect(expiresIn).toBeGreaterThan(fiveMinMs - 5000);
        expect(expiresIn).toBeLessThanOrEqual(fiveMinMs);
        expect(expiresIn).toBeLessThan(oneHourMs);

        // verify warn was logged
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('duration capped to 5m'),
        );

        warnSpy.mockRestore();
      });
    });
  });

  given(
    '[case5] repoManifest absent — machine-wide @all keys unlock without a repo manifest',
    () => {
      const identity = {
        getOne: async () => 'test-identity',
        getAll: {
          discovered: async () => ['test-identity'],
          prescribed: [],
        },
      };
      const vaultAdaptersEmpty = {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      };

      when('[t0] no @all keys in the host manifest, env=prod', () => {
        then(
          'unlocks no keys (empty result), never throws — a missing manifest is not an error',
          async () => {
            const context: ContextKeyrack = {
              owner: null,
              identity,
              hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
              repoManifest: null,
              vaultAdapters: vaultAdaptersEmpty,
            };
            const result = await unlockKeyrackKeys({ env: 'prod' }, context);
            expect(result.unlocked.length).toBe(0);
            expect(result.omitted.length).toBe(0);
          },
        );
      });

      when('[t1] a machine-wide @all key exists for env=prod', () => {
        then('unlocks it without any repo manifest', async () => {
          const context: ContextKeyrack = {
            owner: null,
            identity,
            hostManifest: genMockKeyrackHostManifest({
              hosts: {
                '@all.prod.BOOTSTRAP_TOKEN': {
                  mech: 'PERMANENT_VIA_REPLICA',
                  vault: 'os.direct',
                  env: 'prod',
                  org: '@all',
                },
              },
            }),
            repoManifest: null,
            vaultAdapters: {
              ...vaultAdaptersEmpty,
              'os.direct': genMockVaultAdapter({
                storage: {
                  '@all.prod.BOOTSTRAP_TOKEN': 'bootstrap-token-value',
                },
              }),
            },
          };
          const result = await unlockKeyrackKeys({ env: 'prod' }, context);
          expect(result.unlocked.length).toBe(1);
          const key = result.unlocked[0]!;
          expect(key.slug).toEqual('@all.prod.BOOTSTRAP_TOKEN');
          expect(key.key.secret).toEqual('bootstrap-token-value');
          expect(result.omitted.length).toBe(0);
        });
      });

      when('[t2] unlock called with no env and no repo manifest', () => {
        then('throws BadRequestError naming --env as the fix', async () => {
          const context: ContextKeyrack = {
            owner: null,
            identity,
            hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
            repoManifest: null,
            vaultAdapters: vaultAdaptersEmpty,
          };
          const error = await getError(unlockKeyrackKeys({}, context));
          expect(error).toBeInstanceOf(BadRequestError);
          expect(error.message).toContain('--env');
        });
      });

      when('[t3] a --key is asked but absent from the host manifest', () => {
        then('throws BadRequestError naming the machine-wide key', async () => {
          const context: ContextKeyrack = {
            owner: null,
            identity,
            hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
            repoManifest: null,
            vaultAdapters: vaultAdaptersEmpty,
          };
          const error = await getError(
            unlockKeyrackKeys({ env: 'prod', key: 'BOOTSTRAP_TOKEN' }, context),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect(error.message).toContain('machine-wide key not found');
        });
      });
    },
  );

  /**
   * [case6] env=all fallback when key set with env=all but unlocked for specific env
   *
   * .scenario:
   *   - repo manifest has `testorg.test.API_KEY` (expanded from env.all declaration)
   *   - host manifest has only `testorg.all.API_KEY` (key was SET with env=all)
   *   - unlock for env=test should find env=all fallback
   */
  given('[case6] env=all fallback for specific env unlock', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'testorg.all.API_KEY': 'all-env-api-key-value' },
    });
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          // key was SET with env=all — only .all. slug in hostManifest
          'testorg.all.API_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'all',
            org: 'testorg',
          },
        },
      }),
      repoManifest: genMockKeyrackRepoManifest({
        org: 'testorg',
        envs: ['test', 'prod'],
        keys: {
          // repo manifest has env=all key expanded for each declared env
          'testorg.all.API_KEY': { env: 'all', name: 'API_KEY' },
          'testorg.test.API_KEY': { env: 'test', name: 'API_KEY' },
          'testorg.prod.API_KEY': { env: 'prod', name: 'API_KEY' },
        },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called with env=test (fallback to env=all)', () => {
      then('finds env=all key via fallback', async () => {
        const result = await unlockKeyrackKeys({ env: 'test' }, context);

        // should unlock the env=all key (fallback)
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('testorg.all.API_KEY');
        expect(key.env).toEqual('all');
        expect(key.key.secret).toEqual('all-env-api-key-value');

        // .note = env=all fallback handled at daemon lookup time, not storage time

        // should NOT have omitted keys (fallback succeeded)
        expect(result.omitted.length).toBe(0);
      });
    });

    when('[t1] unlock called with env=prod (fallback to env=all)', () => {
      then('finds env=all key via fallback', async () => {
        const result = await unlockKeyrackKeys({ env: 'prod' }, context);

        // should unlock the env=all key (fallback)
        expect(result.unlocked.length).toBe(1);
        const key = result.unlocked[0]!;
        expect(key.slug).toEqual('testorg.all.API_KEY');
        expect(key.env).toEqual('all');

        // .note = env=all fallback handled at daemon lookup time, not storage time

        // should NOT have omitted keys (fallback succeeded)
        expect(result.omitted.length).toBe(0);
      });
    });
  });

  given('[case7] sudo key not found', () => {
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({ hosts: {} }),
      repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': genMockVaultAdapter(),
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called with --key that does not exist', () => {
      then('throws ConstraintError', async () => {
        const error = await getError(
          unlockKeyrackKeys({ env: 'sudo', key: 'NONEXISTENT_KEY' }, context),
        );
        expect(error.message).toContain('sudo key not found: NONEXISTENT_KEY');
      });
    });
  });

  // G5: per-key fault isolation — a vault whose get throws on a LIVE fault (an SSM throttle)
  // must NOT abort the whole batch and take down co-batched healthy credentials
  given(
    '[case8] one key throws a live fault, co-batched with a healthy key',
    () => {
      const healthyAdapter = genMockVaultAdapter({
        storage: { 'testorg.all.HEALTHY_KEY': 'healthy-secret' },
      });
      // a vault whose get throws a transient MalfunctionError (the aws.params throttle class)
      const flakyAdapter = {
        ...genMockVaultAdapter(),
        isUnlocked: async () => false,
        unlock: async () => undefined,
        get: async () => {
          throw new MalfunctionError(
            'aws.params SSM read hit a transient throttle',
            {
              hint: 'transient — retry the unlock',
            },
          );
        },
      };
      const context: ContextKeyrack = {
        owner: null,
        identity: {
          getOne: async () => 'test-identity',
          getAll: { discovered: async () => ['test-identity'], prescribed: [] },
        },
        hostManifest: genMockKeyrackHostManifest({
          hosts: {
            'testorg.all.HEALTHY_KEY': {
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              env: 'all',
              org: 'testorg',
            },
            'testorg.all.FLAKY_KEY': {
              mech: 'PERMANENT_VIA_REFERENCE',
              vault: 'aws.params',
              env: 'all',
              org: 'testorg',
            },
          },
        }),
        repoManifest: genMockKeyrackRepoManifest({
          org: 'testorg',
          keys: {
            'testorg.all.HEALTHY_KEY': { env: 'all', name: 'HEALTHY_KEY' },
            'testorg.all.FLAKY_KEY': { env: 'all', name: 'FLAKY_KEY' },
          },
        }),
        vaultAdapters: {
          'os.envvar': genMockVaultAdapter(),
          'os.direct': healthyAdapter,
          'os.secure': genMockVaultAdapter(),
          'os.daemon': genMockVaultAdapter(),
          '1password': genMockVaultAdapter(),
          'aws.config': genMockVaultAdapter(),
          'aws.params': flakyAdapter,
          'github.secrets': genMockVaultAdapter(),
        },
      };

      when('[t0] unlock is called for the whole batch', () => {
        then(
          'the batch does NOT abort — the healthy key still unlocks',
          async () => {
            const result = await unlockKeyrackKeys({}, context);
            const healthy = result.unlocked.find(
              (k) => k.slug === 'testorg.all.HEALTHY_KEY',
            );
            expect(healthy).toBeDefined();
            expect(healthy?.key.secret).toEqual('healthy-secret');
          },
        );

        then(
          'the flaky key is omitted with reason errored and its cause',
          async () => {
            const result = await unlockKeyrackKeys({}, context);
            const flaky = result.omitted.find(
              (o) => o.slug === 'testorg.all.FLAKY_KEY',
            );
            expect(flaky?.reason).toEqual('errored');
            expect(flaky?.cause).toBeInstanceOf(MalfunctionError);
          },
        );
      });
    },
  );

  // G5 clamp (rule.forbid.failhide): the per-key isolation is an ALLOWLIST, not a catch-all — it
  // isolates only the classed operational faults a vault raises (ConstraintError/MalfunctionError).
  // a NATIVE code bug (a TypeError in our own overlay/slug code) is NOT an operational fault, so it
  // must PROPAGATE with its own stack, never be absorbed into an 'errored' omission. this clamp
  // bites if the allowlist is dropped back to a bare catch-all — then the TypeError would be
  // isolated instead of thrown
  given(
    '[case8b] one key throws a NATIVE code bug (not an operational fault)',
    () => {
      const healthyAdapter = genMockVaultAdapter({
        storage: { 'testorg.all.HEALTHY_KEY': 'healthy-secret' },
      });
      // a vault whose get throws a raw TypeError — a real defect in our code, never a live fault
      const buggyAdapter = {
        ...genMockVaultAdapter(),
        isUnlocked: async () => false,
        unlock: async () => undefined,
        get: async () => {
          throw new TypeError('cannot read property x of undefined');
        },
      };
      const context: ContextKeyrack = {
        owner: null,
        identity: {
          getOne: async () => 'test-identity',
          getAll: { discovered: async () => ['test-identity'], prescribed: [] },
        },
        hostManifest: genMockKeyrackHostManifest({
          hosts: {
            'testorg.all.HEALTHY_KEY': {
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              env: 'all',
              org: 'testorg',
            },
            'testorg.all.BUGGY_KEY': {
              mech: 'PERMANENT_VIA_REFERENCE',
              vault: 'aws.params',
              env: 'all',
              org: 'testorg',
            },
          },
        }),
        repoManifest: genMockKeyrackRepoManifest({
          org: 'testorg',
          keys: {
            'testorg.all.HEALTHY_KEY': { env: 'all', name: 'HEALTHY_KEY' },
            'testorg.all.BUGGY_KEY': { env: 'all', name: 'BUGGY_KEY' },
          },
        }),
        vaultAdapters: {
          'os.envvar': genMockVaultAdapter(),
          'os.direct': healthyAdapter,
          'os.secure': genMockVaultAdapter(),
          'os.daemon': genMockVaultAdapter(),
          '1password': genMockVaultAdapter(),
          'aws.config': genMockVaultAdapter(),
          'aws.params': buggyAdapter,
          'github.secrets': genMockVaultAdapter(),
        },
      };

      when('[t0] unlock is called for the whole batch', () => {
        then(
          'the native bug PROPAGATES unchanged (never absorbed as an omission)',
          async () => {
            const error = await getError(unlockKeyrackKeys({}, context));
            expect(error).toBeInstanceOf(TypeError);
            expect(error.message).toContain('cannot read property x');
          },
        );
      });
    },
  );

  // G8 (c65): the org-scope hardcut's handoff — the batch threads the host manifest into
  // adapter.get(), and aws.params decides its --org identity at its own boundary: a specific-org
  // key resolves the peer `{org}.{env}.AWS_PROFILE` exid to a `profile` identity; an @all key
  // resolves to the `imds` identity (the grove role). this proves the end-to-end: manifest in →
  // correct KeyrackAwsParamIdentity out (via the real getOneKeyrackAwsParamIdentity)
  given(
    '[case9] aws.params key threads the org-scope identity into get()',
    () => {
      // an aws.params adapter that decides its identity from the manifest get() hands it — exactly
      // as the real vault adapter does — and records the resolved KeyrackAwsParamIdentity
      const genCaptureAwsParamsAdapter = () => {
        const captured: { identity?: KeyrackAwsParamIdentity } = {};
        const adapter = {
          ...genMockVaultAdapter(),
          isUnlocked: async () => false,
          unlock: async () => undefined,
          get: async (input: {
            slug: string;
            hostManifest?: KeyrackHostManifest | null;
          }) => {
            captured.identity = getOneKeyrackAwsParamIdentity({
              slug: input.slug,
              hostManifest: input.hostManifest ?? null,
            });
            return new KeyrackKeyGrant({
              slug: input.slug,
              key: {
                secret: 'from-aws-params',
                grade: { protection: 'reference', duration: 'permanent' },
              },
              source: { vault: 'aws.params', mech: 'PERMANENT_VIA_REFERENCE' },
              env: 'prod',
              org: input.slug.split('.')[0]!,
            });
          },
        };
        return { adapter, captured };
      };

      when('[t0] the aws.params key is for a specific org', () => {
        then(
          'get() resolves the peer AWS_PROFILE into a profile identity',
          async () => {
            const { adapter, captured } = genCaptureAwsParamsAdapter();
            const context: ContextKeyrack = {
              owner: null,
              identity: {
                getOne: async () => 'test-identity',
                getAll: {
                  discovered: async () => ['test-identity'],
                  prescribed: [],
                },
              },
              hostManifest: genMockKeyrackHostManifest({
                hosts: {
                  'ehmpathy.prod.ANTHROPIC_API_KEY': {
                    mech: 'PERMANENT_VIA_REFERENCE',
                    vault: 'aws.params',
                    env: 'prod',
                    org: 'ehmpathy',
                    exid: '/keyrack/anthropic',
                  },
                  // the peer AWS_PROFILE key whose exid IS the org's profile name
                  'ehmpathy.prod.AWS_PROFILE': {
                    mech: 'PERMANENT_VIA_REPLICA',
                    vault: 'aws.config',
                    env: 'prod',
                    org: 'ehmpathy',
                    exid: 'ehmpathy-prod',
                  },
                },
              }),
              repoManifest: genMockKeyrackRepoManifest({
                org: 'ehmpathy',
                keys: {
                  'ehmpathy.prod.ANTHROPIC_API_KEY': {
                    env: 'prod',
                    name: 'ANTHROPIC_API_KEY',
                  },
                },
              }),
              vaultAdapters: {
                'os.envvar': genMockVaultAdapter(),
                'os.direct': genMockVaultAdapter(),
                'os.secure': genMockVaultAdapter(),
                'os.daemon': genMockVaultAdapter(),
                '1password': genMockVaultAdapter(),
                'aws.config': genMockVaultAdapter(),
                'aws.params': adapter,
                'github.secrets': genMockVaultAdapter(),
              },
            };

            const result = await unlockKeyrackKeys({ env: 'prod' }, context);
            const unlocked = result.unlocked.find(
              (k) => k.slug === 'ehmpathy.prod.ANTHROPIC_API_KEY',
            );
            expect(unlocked).toBeDefined();
            expect(captured.identity).toEqual({
              source: 'profile',
              profile: 'ehmpathy-prod',
            });
          },
        );
      });

      when('[t1] the aws.params key is @all (grove-wide)', () => {
        then(
          'get() resolves the imds identity (the grove IMDS role)',
          async () => {
            const { adapter, captured } = genCaptureAwsParamsAdapter();
            const context: ContextKeyrack = {
              owner: null,
              identity: {
                getOne: async () => 'test-identity',
                getAll: {
                  discovered: async () => ['test-identity'],
                  prescribed: [],
                },
              },
              hostManifest: genMockKeyrackHostManifest({
                hosts: {
                  '@all.prod.ANTHROPIC_API_KEY': {
                    mech: 'PERMANENT_VIA_REFERENCE',
                    vault: 'aws.params',
                    env: 'prod',
                    org: '@all',
                    exid: '/keyrack/anthropic',
                  },
                },
              }),
              repoManifest: genMockKeyrackRepoManifest({
                org: 'ehmpathy',
                keys: {
                  '@all.prod.ANTHROPIC_API_KEY': {
                    env: 'prod',
                    name: 'ANTHROPIC_API_KEY',
                  },
                },
              }),
              vaultAdapters: {
                'os.envvar': genMockVaultAdapter(),
                'os.direct': genMockVaultAdapter(),
                'os.secure': genMockVaultAdapter(),
                'os.daemon': genMockVaultAdapter(),
                '1password': genMockVaultAdapter(),
                'aws.config': genMockVaultAdapter(),
                'aws.params': adapter,
                'github.secrets': genMockVaultAdapter(),
              },
            };

            const result = await unlockKeyrackKeys({ env: 'prod' }, context);
            const unlocked = result.unlocked.find(
              (k) => k.slug === '@all.prod.ANTHROPIC_API_KEY',
            );
            expect(unlocked).toBeDefined();
            expect(captured.identity).toEqual({ source: 'imds' });
          },
        );
      });
    },
  );

  // G5 (c56): the per-key fault isolation is VAULT-AGNOSTIC shared-driver infra — aws.params merely
  // motivated it (case8), but a NON-aws vault must be isolated too. here os.secure throws a classed
  // operational fault on unlock; the batch must isolate it and keep the co-batched healthy os.direct
  // key. this locks that the G5 behavior change did NOT silently regress any other vault's
  // failure-isolation — a fix scoped to aws.params alone would leave every peer vault batch-aborting
  given(
    '[case10] a NON-aws vault (os.secure) throws a live fault in a batch',
    () => {
      const healthyAdapter = genMockVaultAdapter({
        storage: { 'testorg.all.HEALTHY_KEY': 'healthy-secret' },
      });
      // an os.secure adapter whose unlock throws a classed operational fault (e.g. a locked
      // keychain / absent age key) — the class of fault the allowlist isolates, for ANY vault
      const flakyOsSecure = {
        ...genMockVaultAdapter(),
        isUnlocked: async () => false,
        unlock: async () => {
          throw new ConstraintError(
            'os.secure could not decrypt the manifest',
            {
              hint: 'unlock the host manifest first',
            },
          );
        },
      };
      const context: ContextKeyrack = {
        owner: null,
        identity: {
          getOne: async () => 'test-identity',
          getAll: { discovered: async () => ['test-identity'], prescribed: [] },
        },
        hostManifest: genMockKeyrackHostManifest({
          hosts: {
            'testorg.all.HEALTHY_KEY': {
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              env: 'all',
              org: 'testorg',
            },
            'testorg.all.SECURE_KEY': {
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.secure',
              env: 'all',
              org: 'testorg',
            },
          },
        }),
        repoManifest: genMockKeyrackRepoManifest({
          org: 'testorg',
          keys: {
            'testorg.all.HEALTHY_KEY': { env: 'all', name: 'HEALTHY_KEY' },
            'testorg.all.SECURE_KEY': { env: 'all', name: 'SECURE_KEY' },
          },
        }),
        vaultAdapters: {
          'os.envvar': genMockVaultAdapter(),
          'os.direct': healthyAdapter,
          'os.secure': flakyOsSecure,
          'os.daemon': genMockVaultAdapter(),
          '1password': genMockVaultAdapter(),
          'aws.config': genMockVaultAdapter(),
          'aws.params': genMockVaultAdapter(),
          'github.secrets': genMockVaultAdapter(),
        },
      };

      when('[t0] unlock is called for the whole batch', () => {
        then(
          'the batch does NOT abort — the healthy os.direct key still unlocks',
          async () => {
            const result = await unlockKeyrackKeys({}, context);
            const healthy = result.unlocked.find(
              (k) => k.slug === 'testorg.all.HEALTHY_KEY',
            );
            expect(healthy).toBeDefined();
            expect(healthy?.key.secret).toEqual('healthy-secret');
          },
        );

        then(
          'the os.secure key is omitted with reason errored, never batch-aborting',
          async () => {
            const result = await unlockKeyrackKeys({}, context);
            const secure = result.omitted.find(
              (o) => o.slug === 'testorg.all.SECURE_KEY',
            );
            expect(secure?.reason).toEqual('errored');
            expect(secure?.cause).toBeInstanceOf(ConstraintError);
          },
        );
      });
    },
  );

  given('[case9] a reach asked for with no --key', () => {
    // .note = never read — the guard under test fires before any context access
    const context = {} as ContextKeyrack;

    when('[t0] unlock called for a whole env', () => {
      then(
        'e14: it throws rather than scope every key in the env',
        async () => {
          const error = await getError(
            unlockKeyrackKeys(
              {
                owner: 'ehmpath',
                env: 'prep',
                reach: { exid: 'github://org=ehmpathy' },
              },
              context,
            ),
          );
          expect(error.message).toContain('--reach requires a key');
        },
      );

      then('e14: the error names the fix, reach echoed back', async () => {
        const error = await getError(
          unlockKeyrackKeys(
            {
              owner: 'ehmpath',
              env: 'prep',
              reach: { exid: 'github://org=ehmpathy' },
            },
            context,
          ),
        );
        expect(error.message).toContain('--env prep --key $KEY');
        expect(error.message).toContain('--reach github://org=ehmpathy');
      });
    });
  });

  given('[case10] a reachless key is set, and a reach is asked for', () => {
    const vaultAdapter = genMockVaultAdapter({
      storage: { 'testorg.test.API_KEY': 'the-reachless-secret' },
    });
    const context: ContextKeyrack = {
      owner: null,
      identity: {
        getOne: async () => 'test-identity',
        getAll: { discovered: async () => ['test-identity'], prescribed: [] },
      },
      hostManifest: genMockKeyrackHostManifest({
        hosts: {
          // ONLY the reachless key is held on this host
          'testorg.test.API_KEY': {
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'test',
            org: 'testorg',
          },
        },
      }),
      repoManifest: genMockKeyrackRepoManifest({
        org: 'testorg',
        envs: ['test'],
        keys: { 'testorg.test.API_KEY': { env: 'test', name: 'API_KEY' } },
      }),
      vaultAdapters: {
        'os.envvar': genMockVaultAdapter(),
        'os.direct': vaultAdapter,
        'os.secure': genMockVaultAdapter(),
        'os.daemon': genMockVaultAdapter(),
        '1password': genMockVaultAdapter(),
        'aws.config': genMockVaultAdapter(),
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    };

    when('[t0] unlock called at a reach no key was cut for', () => {
      then(
        'e6: it throws rather than hand back the reachless key',
        async () => {
          const error = await getError(
            unlockKeyrackKeys(
              {
                env: 'test',
                key: 'API_KEY',
                reach: { exid: 'github://org=ehmpathy' },
              },
              context,
            ),
          );
          expect(error.message).toContain(
            "no key is set for reach 'github://org=ehmpathy'",
          );
        },
      );

      then('e6: the error names the `set` that would cut the key', async () => {
        const error = await getError(
          unlockKeyrackKeys(
            {
              env: 'test',
              key: 'API_KEY',
              reach: { exid: 'github://org=ehmpathy' },
            },
            context,
          ),
        );
        expect(error.message).toContain(
          'rhx keyrack set --env test --key API_KEY --reach github://org=ehmpathy',
        );
      });

      /**
       * .what = clamps the phrase `fillKeyrackKeys` matches this error on
       * .why = fill's expected-error allowlist reads the MESSAGE, never the class
       *        (raw age errors are plain Errors, so the extant allowlist has to read
       *        text). so this exact phrase is a contract between two files that the
       *        compiler cannot link — reword it and `fill` no longer recognizes a
       *        legitimately-absent reach-key, then rethrows instead of it being set
       * .note = the other end of the pair lives at fillKeyrackKeys.ts, in isExpectedError
       */
      then('the message keeps the phrase `fill` matches on', async () => {
        const error = await getError(
          unlockKeyrackKeys(
            {
              env: 'test',
              key: 'API_KEY',
              reach: { exid: 'github://org=ehmpathy' },
            },
            context,
          ),
        );
        expect(error.message).toContain('no key is set for reach');
      });
    });

    when('[t1] unlock called with no reach', () => {
      then(
        'e1: the reachless key unlocks exactly as it does today',
        async () => {
          const result = await unlockKeyrackKeys(
            { env: 'test', key: 'API_KEY' },
            context,
          );
          expect(result.unlocked.length).toBe(1);
          expect(result.unlocked[0]!.key.secret).toEqual(
            'the-reachless-secret',
          );
          expect(result.unlocked[0]!.reach).toBeUndefined();
        },
      );
    });
  });
});
