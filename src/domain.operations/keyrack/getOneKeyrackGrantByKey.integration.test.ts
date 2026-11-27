import { given, then, useThen, when } from 'test-fns';

import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';
import { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getOneKeyrackGrantByKey } from './getOneKeyrackGrantByKey';

/**
 * .what = integration tests for getOneKeyrackGrantByKey under an org allowlist
 * .why = a member read reaches the real daemon probe (`daemonAccessGet`), a unix socket
 *        keyed off HOME. so it runs here, unmocked, against a temp HOME whose socket
 *        path no live daemon holds — the probe is real and honestly answers "no daemon"
 */
describe('getOneKeyrackGrantByKey.integration', () => {
  const tempHome = {
    path: genTempDirPhysical({
      slug: 'home-getOneKeyrackGrantByKey-integration',
    }),
  };
  const homeOriginal = process.env.HOME;

  beforeAll(() => {
    process.env.HOME = tempHome.path;
  });
  afterAll(() => {
    process.env.HOME = homeOriginal;
  });

  // the grant context, with no vault reach: the daemon probe is the one boundary here
  const genContext = (manifest: KeyrackRepoManifest): ContextKeyrackGrantGet =>
    ({
      repoManifest: manifest,
      owner: null,
      envvarAdapter: { get: async () => null },
      mechAdapters: {},
    }) as unknown as ContextKeyrackGrantGet;

  given('[case1] a manifest whose org: is [ahbode, bhanya]', () => {
    const manifest = new KeyrackRepoManifest({
      org: 'ahbode',
      orgs: ['ahbode', 'bhanya'],
      envs: ['camp'],
      keys: {},
    });

    when(
      '[t0] a bare key is read with the non-default member --org bhanya',
      () => {
        const result = useThen('the read completes', async () =>
          getOneKeyrackGrantByKey(
            { key: 'AWS_PROFILE', env: 'camp', org: 'bhanya' },
            genContext(manifest),
          ),
        );

        then('it slugs the bare key under the asked member', () => {
          expect((result as { slug: string }).slug).toBe(
            'bhanya.camp.AWS_PROFILE',
          );
        });

        then('it never slugs under the default org', () => {
          expect((result as { slug: string }).slug).not.toContain('ahbode');
        });
      },
    );
  });
});
