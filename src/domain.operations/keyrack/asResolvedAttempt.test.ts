import { given, then, when } from 'test-fns';

import {
  type KeyrackGrantAttempt,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { asResolvedAttempt } from './asResolvedAttempt';

/**
 * .what = unit proof for the locked→absent repo-manifest-membership promotion gate
 * .why = a `keyrack get` for a registered-but-locked key that is NOT declared in the repo
 *        keyrack.yml is promoted to `absent` (so a human is told to declare it). but a
 *        machine-wide `@all` key lives in the HOST manifest, never a repo keyrack.yml — like a
 *        sudo key — so it MUST bypass that promotion, else the bootstrap `get` before unlock
 *        falsely reports `absent` for a key that is genuinely `locked`.
 */
describe('asResolvedAttempt', () => {
  // a repo manifest that declares ONE testorg key — deliberately NOT the @all key under test
  const repoManifest = new KeyrackRepoManifest({
    org: 'testorg',
    envs: ['test'],
    keys: {
      'testorg.test.REPO_KEY': {
        slug: 'testorg.test.REPO_KEY',
        mech: null,
        env: 'test',
        name: 'REPO_KEY',
        grade: null,
        flags: { isOptionalIfHas: null },
      },
    },
  });

  const lockedAttempt = (slug: string): KeyrackGrantAttempt => ({
    status: 'locked',
    slug,
    message: `credential '${slug}' is locked. unlock it first.`,
    fix: `rhx keyrack unlock --env test --key ${slug.split('.').pop()}`,
  });

  given(
    '[case1] a machine-wide @all key locked, absent from the repo manifest',
    () => {
      when('[t0] the locked @all key is resolved', () => {
        then(
          'it stays locked — never promoted to absent (host-manifest-only, like sudo)',
          () => {
            const resolved = asResolvedAttempt({
              attempt: lockedAttempt('@all.test.BOOTSTRAP_TOKEN'),
              slug: '@all.test.BOOTSTRAP_TOKEN',
              keyName: 'BOOTSTRAP_TOKEN',
              env: 'test',
              repoManifest,
            });
            expect(resolved.status).toEqual('locked');
          },
        );
      });
    },
  );

  given(
    '[case2] a repo-scoped key locked, absent from the repo manifest',
    () => {
      when('[t0] the locked repo key (not declared) is resolved', () => {
        then(
          'it is promoted to absent (the gate still bites for a genuine repo key)',
          () => {
            const resolved = asResolvedAttempt({
              attempt: lockedAttempt('testorg.test.UNDECLARED_KEY'),
              slug: 'testorg.test.UNDECLARED_KEY',
              keyName: 'UNDECLARED_KEY',
              env: 'test',
              repoManifest,
            });
            expect(resolved.status).toEqual('absent');
            if (resolved.status !== 'absent')
              throw new Error('expected an absent attempt');
            expect(resolved.slug).toEqual('testorg.test.UNDECLARED_KEY');
          },
        );
      });
    },
  );

  given(
    '[case3] a repo-scoped key that IS declared in the repo manifest',
    () => {
      when('[t0] the locked, declared repo key is resolved', () => {
        then('it stays locked (present in the manifest slug set)', () => {
          const resolved = asResolvedAttempt({
            attempt: lockedAttempt('testorg.test.REPO_KEY'),
            slug: 'testorg.test.REPO_KEY',
            keyName: 'REPO_KEY',
            env: 'test',
            repoManifest,
          });
          expect(resolved.status).toEqual('locked');
        });
      });
    },
  );

  given('[case4] a sudo key locked, absent from the repo manifest', () => {
    when('[t0] the locked sudo key is resolved', () => {
      then(
        'it stays locked (sudo bypasses the promotion, the prior invariant)',
        () => {
          const resolved = asResolvedAttempt({
            attempt: lockedAttempt('testorg.sudo.SUDO_KEY'),
            slug: 'testorg.sudo.SUDO_KEY',
            keyName: 'SUDO_KEY',
            env: 'sudo',
            repoManifest,
          });
          expect(resolved.status).toEqual('locked');
        },
      );
    });
  });

  given('[case5] a granted attempt (any slug)', () => {
    when('[t0] a granted attempt is resolved', () => {
      then('it passes through untouched (only locked/absent are gated)', () => {
        const granted = {
          status: 'granted',
          grant: {
            slug: '@all.test.BOOTSTRAP_TOKEN',
            key: { secret: 'x', grade: { protection: null, duration: null } },
            source: { vault: 'os.direct', mech: 'PERMANENT_VIA_REFERENCE' },
            env: 'test',
            org: '@all',
          },
        } as unknown as KeyrackGrantAttempt;
        const resolved = asResolvedAttempt({
          attempt: granted,
          slug: '@all.test.BOOTSTRAP_TOKEN',
          keyName: 'BOOTSTRAP_TOKEN',
          env: 'test',
          repoManifest,
        });
        expect(resolved.status).toEqual('granted');
      });
    });
  });
});
