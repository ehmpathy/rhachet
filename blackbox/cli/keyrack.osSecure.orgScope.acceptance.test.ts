import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = the os.secure ORG-SCOPE proof — that the `--org @all` machine-wide grain is
 *   VAULT-AGNOSTIC. the aws.params matrix proves the grain for the SSM-backed vault; this proves
 *   the SAME grain hardcut holds for a purely LOCAL vault (os.secure), so the invariant is a
 *   general keyrack property, not an aws.params quirk (rule.require.org-scope-grain-hardcut.md,
 *   proof n4).
 *
 *     [case1] --org @all, NO repo manifest at all → machine-wide static key, host manifest only
 *     [case2] --org @all, repo manifest PRESENT   → machine-wide, IGNORES the manifest org
 *     [case3] no --org @all (specific org)        → repo-wide, the org own namespace
 *
 * .why = a machine-wide `@all` key must set→unlock→get with NO repo manifest — the box's own
 *   namespace — exactly as the github-app bootstrap token does for aws.params, but here proven for
 *   a static local secret so the grain is shown to be independent of the vault behind it.
 *
 * .backend = os.secure persists an age-encrypted blob LOCALLY (no SSM, no AWS), so the roundtrip
 *   is fully self-contained: the value is fed on set via stdin, encrypted to the box's ssh
 *   recipient, and read back on unlock→get. no external dependency, no mock (a real local vault).
 *
 * .internal-state = each cell snapshots the SET --json host entry (the manifest internal state:
 *   slug carries the `@all` vs the org segment) AND the GET --json grant (the daemon internal
 *   state: served value + source.vault), so a regression to the org-scope slug or the served value
 *   is caught.
 */
const SECRET_ALL_NOMANIFEST = 'machine-wide-static-no-manifest-xyz';
const SECRET_ALL_WITHMANIFEST = 'machine-wide-static-with-manifest-xyz';
const SECRET_REPO = 'repo-org-static-value-xyz';

// redact the volatile manifest timestamps so the set --json host entry snapshots stably
const asStableHost = (json: string): unknown => {
  const parsed = JSON.parse(json);
  return { ...parsed, createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' };
};

describe('keyrack vault os.secure org-scope matrix (cli) — @all is vault-agnostic', () => {
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] --org @all with NO repo manifest at all (machine-wide static key)', () => {
    const KEY = 'MACHINE_WIDE_NOMANIFEST';
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-vault-os-secure' });
      // DELETE the repo manifest — a machine-wide @all key must work with NO .agent/keyrack.yml
      rmSync(join(repo.path, '.agent', 'keyrack.yml'), { force: true });
      // init only the owner=mechanic HOST manifest (no --org → no repo manifest recreated)
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { repo };
    });

    when('[t0] set --org @all os.secure (value via stdin, no repo manifest present)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', KEY, '--vault', 'os.secure',
            '--mech', 'PERMANENT_VIA_REPLICA', '--owner', 'mechanic',
            '--env', 'test', '--org', '@all', '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          stdin: `${SECRET_ALL_NOMANIFEST}\n`,
          logOnError: false,
        }),
      );

      then('the set is accepted with no repo manifest present', () => {
        expect(result.status).toEqual(0);
      });
      then('the host entry slug carries the machine-wide @all segment', () => {
        expect(JSON.parse(result.stdout).slug).toContain('@all');
      });
      then('the host entry vault is os.secure', () => {
        expect(JSON.parse(result.stdout).vault).toEqual('os.secure');
      });
      then('set --json (manifest internal state) matches snapshot', () => {
        expect(asStableHost(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get --json — the machine-wide value is served', () => {
      const grant = useBeforeAll(async () => {
        await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', 'mechanic', '--env', 'test'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: true,
        });
        return invokeRhachetCliBinary({
          args: [
            'keyrack', 'get', '--owner', 'mechanic', '--key', KEY,
            '--env', 'test', '--org', '@all', '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        });
      });

      then('the grant status is granted', () => {
        expect(JSON.parse(grant.stdout).status).toEqual('granted');
      });
      then('the served value is the machine-wide static secret', () => {
        expect(JSON.parse(grant.stdout).grant.key.secret).toEqual(SECRET_ALL_NOMANIFEST);
      });
      then('the grant vault source is os.secure', () => {
        expect(JSON.parse(grant.stdout).grant.source.vault).toEqual('os.secure');
      });
      then('the grant slug is the @all machine-wide slug', () => {
        expect(JSON.parse(grant.stdout).grant.slug).toContain('@all');
      });
      then('get --json (grant internal state) matches snapshot', () => {
        expect(
          asSnapshotSafe(
            grant.stdout.split(SECRET_ALL_NOMANIFEST).join('__SECRET__'),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] --org @all WITH a repo manifest present (org: testorg) → ignores the manifest org', () => {
    const KEY = 'MACHINE_WIDE_WITHMANIFEST';
    const scene = useBeforeAll(async () => {
      // keep the fixture's .agent/keyrack.yml (org: testorg) — @all must IGNORE it
      const repo = await genTestTempRepo({ fixture: 'with-vault-os-secure' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { repo };
    });

    when('[t0] set --org @all os.secure with the testorg manifest present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', KEY, '--vault', 'os.secure',
            '--mech', 'PERMANENT_VIA_REPLICA', '--owner', 'mechanic',
            '--env', 'test', '--org', '@all', '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          stdin: `${SECRET_ALL_WITHMANIFEST}\n`,
          logOnError: false,
        }),
      );

      then('the set is accepted', () => {
        expect(result.status).toEqual(0);
      });
      then('the host entry slug carries @all, IGNORING the manifest org (testorg)', () => {
        expect(JSON.parse(result.stdout).slug).toContain('@all');
        expect(JSON.parse(result.stdout).slug).not.toContain('testorg');
      });
      then('set --json matches snapshot', () => {
        expect(asStableHost(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get --json — machine-wide value served despite the manifest', () => {
      const grant = useBeforeAll(async () => {
        await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', 'mechanic', '--env', 'test'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: true,
        });
        return invokeRhachetCliBinary({
          args: [
            'keyrack', 'get', '--owner', 'mechanic', '--key', KEY,
            '--env', 'test', '--org', '@all', '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        });
      });

      then('the served value is the machine-wide static secret', () => {
        expect(JSON.parse(grant.stdout).grant.key.secret).toEqual(SECRET_ALL_WITHMANIFEST);
      });
      then('the grant slug is @all (not testorg)', () => {
        expect(JSON.parse(grant.stdout).grant.slug).toContain('@all');
        expect(JSON.parse(grant.stdout).grant.slug).not.toContain('testorg');
      });
      then('get --json matches snapshot', () => {
        expect(
          asSnapshotSafe(
            grant.stdout.split(SECRET_ALL_WITHMANIFEST).join('__SECRET__'),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] no --org @all (specific org testorg) → repo-wide, the org own namespace', () => {
    const KEY = 'REPO_ORG_STATIC';
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-vault-os-secure' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { repo };
    });

    when('[t0] set --org testorg os.secure (a specific org, not @all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', KEY, '--vault', 'os.secure',
            '--mech', 'PERMANENT_VIA_REPLICA', '--owner', 'mechanic',
            '--env', 'test', '--org', 'testorg', '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          stdin: `${SECRET_REPO}\n`,
          logOnError: false,
        }),
      );

      then('the set is accepted', () => {
        expect(result.status).toEqual(0);
      });
      then('the host entry slug carries the repo org (testorg), not the machine-wide @all', () => {
        expect(JSON.parse(result.stdout).slug).toContain('testorg');
        expect(JSON.parse(result.stdout).slug).not.toContain('@all');
      });
      then('set --json matches snapshot', () => {
        expect(asStableHost(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get --json — the repo-wide value is served', () => {
      const grant = useBeforeAll(async () => {
        await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', 'mechanic', '--env', 'test'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: true,
        });
        return invokeRhachetCliBinary({
          args: [
            'keyrack', 'get', '--owner', 'mechanic', '--key', KEY,
            '--env', 'test', '--org', 'testorg', '--json',
          ],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
          logOnError: false,
        });
      });

      then('the served value is the repo-org static secret', () => {
        expect(JSON.parse(grant.stdout).grant.key.secret).toEqual(SECRET_REPO);
      });
      then('the grant slug carries the repo org (testorg), not @all', () => {
        expect(JSON.parse(grant.stdout).grant.slug).toContain('testorg');
        expect(JSON.parse(grant.stdout).grant.slug).not.toContain('@all');
      });
      then('get --json matches snapshot', () => {
        expect(
          asSnapshotSafe(grant.stdout.split(SECRET_REPO).join('__SECRET__')),
        ).toMatchSnapshot();
      });
    });
  });
});
