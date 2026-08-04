import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllMachineWideSlugsForEnv } from './getAllMachineWideSlugsForEnv';

/**
 * .what = unit proof for the machine-wide `@all` slug expander
 * .why = this is the bootstrap-to-clone resolver — it must surface every `@all.{env}.*` key from
 *        the host manifest with NO repo manifest, so a grove can unlock its credentials before any
 *        repo is cloned. a regression here silently breaks the no-manifest bootstrap path.
 */
describe('getAllMachineWideSlugsForEnv', () => {
  const hostManifest = genMockKeyrackHostManifest({
    hosts: {
      '@all.prod.BOOTSTRAP_TOKEN': { org: '@all', env: 'prod' },
      '@all.prod.ANTHROPIC_API_KEY': { org: '@all', env: 'prod' },
      '@all.test.CI_TOKEN': { org: '@all', env: 'test' },
      // a repo-scoped key that must NEVER be surfaced as machine-wide
      'testorg.prod.REPO_KEY': { org: 'testorg', env: 'prod' },
    },
  });

  given('[case1] no key ask (unlock every machine-wide key for an env)', () => {
    when('[t0] env=prod', () => {
      then(
        'returns every @all.prod.* slug, and no repo-scoped or other-env slug',
        () => {
          const slugs = getAllMachineWideSlugsForEnv({
            env: 'prod',
            keyAsk: null,
            hostManifest,
          });
          expect(slugs.sort()).toEqual(
            ['@all.prod.ANTHROPIC_API_KEY', '@all.prod.BOOTSTRAP_TOKEN'].sort(),
          );
          expect(slugs).not.toContain('testorg.prod.REPO_KEY');
          expect(slugs).not.toContain('@all.test.CI_TOKEN');
        },
      );
    });

    when('[t1] env=test', () => {
      then('returns only the @all.test.* slug', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'test',
          keyAsk: null,
          hostManifest,
        });
        expect(slugs).toEqual(['@all.test.CI_TOKEN']);
      });
    });

    when('[t2] an env with no machine-wide keys', () => {
      then('returns an empty list (never an error)', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prep',
          keyAsk: null,
          hostManifest,
        });
        expect(slugs).toEqual([]);
      });
    });
  });

  given('[case2] a key-name ask (unlock one machine-wide key)', () => {
    when('[t0] the key exists for the env', () => {
      then('returns the single matched @all slug', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prod',
          keyAsk: 'BOOTSTRAP_TOKEN',
          hostManifest,
        });
        expect(slugs).toEqual(['@all.prod.BOOTSTRAP_TOKEN']);
      });
    });

    when('[t1] the key is absent for the env', () => {
      then('returns an empty list (the caller fails loud on absence)', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prod',
          keyAsk: 'NOPE_TOKEN',
          hostManifest,
        });
        expect(slugs).toEqual([]);
      });
    });
  });

  given('[case3] a full slug ask (org.env.key format) that is present', () => {
    when('[t0] the full @all slug is passed directly', () => {
      then('uses it as-is', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prod',
          keyAsk: '@all.prod.ANTHROPIC_API_KEY',
          hostManifest,
        });
        expect(slugs).toEqual(['@all.prod.ANTHROPIC_API_KEY']);
      });
    });
  });
});
