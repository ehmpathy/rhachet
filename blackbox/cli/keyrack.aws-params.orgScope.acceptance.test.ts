import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genFakeSsmServerDetached } from '@/blackbox/.test/infra/genFakeSsmServerDetached';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { maskKeyrackGrantVolatiles } from '@/blackbox/.test/infra/maskKeyrackGrantVolatiles';

/**
 * .what = the aws.params ORG-SCOPE matrix — the exhaustive proof that the `--org` scope cuts the
 *   param NAMESPACE (a host-manifest / org-resolution axis, distinct from the AWS_PROFILE identity
 *   axis). three cells, each a real set→unlock→get roundtrip against a live local SSM stand-in:
 *
 *     [case1] --org @all, NO repo manifest at all   → machine-wide `_all_` namespace, IMDS identity
 *     [case2] --org @all, repo manifest PRESENT     → machine-wide `_all_`, IGNORES the manifest org
 *     [case3] no --org @all (specific org)          → repo-wide, the org own namespace
 *
 * .why = the github-app install token is vaulted under `--org @all` so it can be fetched from
 *   anywhere — even OUTSIDE any repo, before any repo is cloned — because it is the bootstrap
 *   credential used to get auth to clone the repos to begin with. so `@all` MUST roundtrip with no
 *   repo manifest, and MUST ignore a manifest when one is present; a specific org MUST derive the
 *   repo's own namespace. this is the vault-agnostic grain hardcut
 *   (rule.require.org-scope-grain-hardcut.md), proven here for aws.params end-to-end; the
 *   aws.params-specific `_all_` sentinel legalization is rule.require.aws-params-sentinel-legalization.md.
 *
 * .backend = the positive unlock reads a REAL SSM SecureString from a detached local SSM stand-in
 *   (genuine AWS JSON 1.1 over the real @aws-sdk/client-ssm, endpoint-swapped under NODE_ENV=test).
 *   a backend swap, not a mock (rule.forbid.acceptance.mocks holds). the replica mech is used so
 *   the value is a plain secret the set WRITES (via stdin) into the stand-in (github-app would need
 *   a real App to mint — see the journey suite's case2-note).
 *
 * .internal-state = each cell snapshots the SET stdout (which echoes the COMPUTED SSM param name —
 *   the namespace internal state: `_all_` vs the org segment) AND the GET --json grant (the daemon
 *   internal state: served value + source.vault), so a regression to either the human-seen output
 *   or the derived internal namespace is caught.
 */
const REGION = 'us-east-1';
const SECRET_ALL_NOMANIFEST = 'sk-all-no-manifest-fixture-value';
const SECRET_ALL_WITHMANIFEST = 'sk-all-with-manifest-fixture-value';
const SECRET_REPO = 'sk-repo-org-fixture-value';

// the computed SSM names the autocompute path produces per org scope (owner=mechanic, env=test):
//  - @all           → the legalized machine-wide `_all_` segment (never the manifest org)
//  - a specific org → that org's segment
const nameForAll = (key: string): string =>
  `/keyrack/infra/vault/aws.params/v1/mechanic/_all_/test/${key}`;
const nameForOrg = (org: string, key: string): string =>
  `/keyrack/infra/vault/aws.params/v1/mechanic/${org}/test/${key}`;

// the shared env every aws.params invocation carries: HOME isolates the manifest/daemon, dummy
// static creds satisfy the SDK default chain (the @all/IMDS identity in a test env), NODE_ENV=test
// opts into the endpoint override, and KEYRACK_AWS_SSM_ENDPOINT points the real SDK at the stand-in
const envFor = (input: {
  home: string;
  ssmUrl: string;
  key: string;
}): Record<string, string | undefined> => ({
  HOME: input.home,
  AWS_REGION: REGION,
  AWS_ACCESS_KEY_ID: 'test-akid',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
  NODE_ENV: 'test',
  KEYRACK_AWS_SSM_ENDPOINT: input.ssmUrl,
  // strip any inherited collision so the os.envvar fallback can never shadow the vault path
  [input.key]: undefined,
});

describe('keyrack vault aws.params org-scope matrix (cli)', () => {
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] --org @all with NO repo manifest at all (bootstrap-to-clone)', () => {
    const KEY = 'ORGSCOPE_ALL_NOMANIFEST';
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      // DELETE the repo manifest — @all must work with NO .agent/keyrack.yml (the box is outside
      // any repo when it bootstraps the clone credential)
      rmSync(join(repo.path, '.agent', 'keyrack.yml'), { force: true });
      // init only the owner=mechanic HOST manifest (no --org → no repo manifest recreated)
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { ssm, repo };
    });
    afterAll(async () => scene.ssm.close());

    when('[t0] set --org @all (autocompute, no --exid, no repo manifest present)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', KEY, '--vault', 'aws.params',
            '--mech', 'PERMANENT_VIA_REPLICA', '--owner', 'mechanic',
            '--env', 'test', '--org', '@all',
          ],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          stdin: SECRET_ALL_NOMANIFEST,
          logOnError: false,
        }),
      );

      then('the set is accepted with no repo manifest present', () => {
        expect(result.status).toEqual(0);
      });
      then('the computed SSM name carries the machine-wide _all_ segment', () => {
        expect(result.stdout).toContain(nameForAll(KEY));
      });
      then('the computed name is legal (no raw @ in the SSM name path)', () => {
        // the SSM param name legalizes @all → _all_ (a raw @ is illegal in an SSM name). the
        // keyrack SLUG legitimately carries @all (@all.test.KEY) and so does the header — this
        // guards the NAME path segment specifically, not the slug.
        expect(result.stdout).toContain('/_all_/');
        expect(result.stdout).not.toContain('/@all/');
      });
      then('set stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock --org @all (identity IS the unlock, no prompt)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', 'mechanic', '--env', 'test', '--key', KEY],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: true,
          timeoutMs: 30_000,
        }),
      );
      then('unlock succeeds with no human prompt, no repo manifest', () => {
        expect(result.status).toEqual(0);
      });
      then('unlock stdout matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(result.stdout) }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] get --json after unlock — the machine-wide value is served', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'get', '--owner', 'mechanic', '--key', KEY,
            '--env', 'test', '--org', '@all', '--json',
          ],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: false,
        }),
      );
      then('the grant status is granted', () => {
        expect(JSON.parse(result.stdout).status).toEqual('granted');
      });
      then('the served value is the seeded machine-wide SecureString', () => {
        expect(JSON.parse(result.stdout).grant.key.secret).toEqual(SECRET_ALL_NOMANIFEST);
      });
      then('the grant vault source is aws.params', () => {
        expect(JSON.parse(result.stdout).grant.source.vault).toEqual('aws.params');
      });
      then('the grant slug is the @all machine-wide slug', () => {
        expect(JSON.parse(result.stdout).grant.slug).toContain('@all');
      });
      then('get --json (grant internal state) matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({
            stdout: asSnapshotSafe(
              result.stdout.split(SECRET_ALL_NOMANIFEST).join('__SECRET__'),
            ),
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] --org @all WITH a repo manifest present (org: testorg) → ignores the manifest org', () => {
    const KEY = 'ORGSCOPE_ALL_WITHMANIFEST';
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      // keep the fixture's .agent/keyrack.yml (org: testorg) — @all must IGNORE it
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { ssm, repo };
    });
    afterAll(async () => scene.ssm.close());

    when('[t0] set --org @all with the testorg manifest present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', KEY, '--vault', 'aws.params',
            '--mech', 'PERMANENT_VIA_REPLICA', '--owner', 'mechanic',
            '--env', 'test', '--org', '@all',
          ],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          stdin: SECRET_ALL_WITHMANIFEST,
          logOnError: false,
        }),
      );
      then('the set is accepted', () => {
        expect(result.status).toEqual(0);
      });
      then('the computed name carries _all_, IGNORING the manifest org (testorg)', () => {
        expect(result.stdout).toContain(nameForAll(KEY));
        expect(result.stdout).not.toContain('/testorg/');
      });
      then('set stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get --json — machine-wide value served despite the manifest', () => {
      const grant = useBeforeAll(async () => {
        await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', 'mechanic', '--env', 'test', '--key', KEY],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: true,
          timeoutMs: 30_000,
        });
        return invokeRhachetCliBinary({
          args: [
            'keyrack', 'get', '--owner', 'mechanic', '--key', KEY,
            '--env', 'test', '--org', '@all', '--json',
          ],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: false,
        });
      });
      then('the served value is the machine-wide SecureString', () => {
        expect(JSON.parse(grant.stdout).grant.key.secret).toEqual(SECRET_ALL_WITHMANIFEST);
      });
      then('the grant slug is @all (not testorg)', () => {
        expect(JSON.parse(grant.stdout).grant.slug).toContain('@all');
        expect(JSON.parse(grant.stdout).grant.slug).not.toContain('testorg');
      });
      then('get --json matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({
            stdout: asSnapshotSafe(
              grant.stdout.split(SECRET_ALL_WITHMANIFEST).join('__SECRET__'),
            ),
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] no --org @all (specific org testorg) → the identity hardcut surfaces at SET', () => {
    // the SECOND axis of the specific-org hardcut: IDENTITY. a tree-scoped key does NOT use the
    // grove's own IMDS role (that is the @all path); it authenticates as the org's declared
    // AWS_PROFILE — a keyrack manifest fact, NEVER ambient SSO. with the set-time identity decision,
    // that identity requirement surfaces at SET: a `set --org testorg` with no AWS_PROFILE
    // declared for testorg fails loud + names the fix BEFORE it writes a value it could never
    // read — never a silent IMDS fallback for a tree-scoped key. the failure is the IDENTITY gate
    // (no profile), which throws before any SSM write. the namespace axis (the org's own segment vs
    // the machine-wide _all_) is proven by case1/case2 (which assert `not /testorg/`) and the
    // asKeyrackAwsParamName unit test.
    const KEY = 'ORGSCOPE_REPO';
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({
        seed: [
          { name: nameForOrg('testorg', KEY), value: SECRET_REPO, type: 'SecureString' },
        ],
      });
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { ssm, repo };
    });
    afterAll(async () => scene.ssm.close());

    when('[t0] set --org testorg with no AWS_PROFILE declared for the org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', KEY, '--vault', 'aws.params',
            '--mech', 'PERMANENT_VIA_REPLICA', '--owner', 'mechanic',
            '--env', 'test', '--org', 'testorg',
          ],
          cwd: scene.repo.path,
          env: envFor({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: false,
        }),
      );
      then('the set fails loud (never a silent IMDS fallback for a tree-scoped key)', () => {
        expect(result.status).not.toEqual(0);
      });
      then('the failure names the org AWS_PROFILE as the fix', () => {
        expect(result.stdout + result.stderr).toContain('AWS_PROFILE');
        expect(result.stdout + result.stderr).toContain('testorg');
      });
      then('set failure stderr matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(result.stderr) }),
        ).toMatchSnapshot();
      });
    });
  });
});
