import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { asKeyrackCliOutputClean } from '@/blackbox/.test/infra/asKeyrackCliOutputClean';
import { asKeyrackOffEc2Env } from '@/blackbox/.test/infra/asKeyrackOffEc2Env';
import { genFakeSsmServerDetached } from '@/blackbox/.test/infra/genFakeSsmServerDetached';
import { genKeyrackOffEc2Box } from '@/blackbox/.test/infra/genKeyrackOffEc2Box';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { seedHostManifestEntries } from '@/blackbox/.test/infra/seedHostManifestEntries';

/**
 * .what = blackbox integration for a github-app mint that completes: the token reaches `get`
 * .why = the wish's own done-criterion is "returns an installation token". this suite proves the
 *        mint call returns a token to `get`, through the built cli, on both boxes:
 *        - off ec2: the blob in os.secure (catalog c1 cold, c2 warm, c3 stale), github
 *          unreachable, and github that answers 502 (a retry may cure it)
 *        - on ec2: the blob in aws.params (catalog c10 cold, c11 warm, c12 stale), plus the
 *          aws.params mint refusal, whose cure must name aws.params and never os.secure
 * .stale = a short `unlock --duration 3s` caps the daemon's copy; once it lapses, the next read
 *          must mint a fresh token, never hand back the lapsed one. no clock fake: real seconds
 *
 * .grain = integration, not acceptance: github is canned here, and an acceptance test drives
 *          only the real external contract (rule.forbid.faked-or-quarantined-acceptance)
 * .mock = the api.github.com installation-token endpoint, via `fetch-canned-github.js` on
 *         NODE_OPTIONS, which answers the one POST with a canned `ghs_` token
 * .why  = a token github returns needs a live github app and its private key, which no test may
 *         hold (fulcrum F5); with no key there is no positive mint to drive for real
 * .real = `keyrack.githubApp.mint.acceptance` and `keyrack.githubApp.offEc2` drive the live
 *         api.github.com, which refuses a key no app holds; the live mint of a real token is the
 *         commander's run on the grove, named in the pr
 * .key = an rsa key generated at test time; the jwt is signed with it for real. no credential
 *        value lives in this file
 * .ssm = the aws.params box reads a real SSM stand-in (a backend swap, not a mock), as the
 *        `keyrack.vault.awsParams` suite does
 */
const FETCH_CANNED = join(__dirname, '..', '.test', 'assets', 'fetch-canned-github.js');

const OWNER = 'mechanic';
const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const MECH = 'EPHEMERAL_VIA_GITHUB_APP';
const EXID =
  '/keyrack/infra/vault/aws.params/v1/mechanic/_all_/all/EHMPATH_BEAVER_GITHUB_TOKEN';
const REGION = 'us-east-1';

// a real rsa key, made for this run; its body line is asserted absent from every output
const PEM_VALID = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;
const PEM_BODY_LINE = PEM_VALID.split('\n')[1]!;
const asBlob = (input: { privateKey: string }): string =>
  JSON.stringify({
    appId: '123456',
    installationId: '78901234',
    privateKey: input.privateKey,
    mech: MECH,
  });
const BLOB_VALID = asBlob({ privateKey: PEM_VALID });
const BLOB_JUNK_PEM = asBlob({
  privateKey:
    '-----BEGIN RSA PRIVATE KEY-----\nnot-a-real-rsa-key-fixture\n-----END RSA PRIVATE KEY-----',
});

/**
 * .what = the env of a box with no aws identity, with github answered by the canned fetch
 */
const envOffEc2 = (input: {
  repoPath: string;
  mode: 'mint' | 'unreachable' | 'unavailable';
}): Record<string, string | undefined> => ({
  ...asKeyrackOffEc2Env({ repoPath: input.repoPath }),
  NODE_OPTIONS: `--require ${FETCH_CANNED}`,
  CANNED_GITHUB_FETCH_LOG: join(input.repoPath, 'github-fetch.log'),
  CANNED_GITHUB_FETCH_MODE: input.mode,
});

/**
 * .what = the env of an ec2 box: static creds stand in for the instance role, ssm is the stand-in
 */
const envEc2 = (input: {
  repoPath: string;
  ssmUrl: string;
}): Record<string, string | undefined> => ({
  HOME: input.repoPath,
  AWS_REGION: REGION,
  AWS_PROFILE: undefined,
  AWS_ACCESS_KEY_ID: 'test-akid',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
  NODE_ENV: 'test',
  KEYRACK_AWS_SSM_ENDPOINT: input.ssmUrl,
  NODE_OPTIONS: `--require ${FETCH_CANNED}`,
  CANNED_GITHUB_FETCH_LOG: join(input.repoPath, 'github-fetch.log'),
  CANNED_GITHUB_FETCH_MODE: 'mint',
});

/**
 * .what = how many mint calls the canned github answered for this box
 */
const getMintCount = (input: { repoPath: string }): number => {
  const path = join(input.repoPath, 'github-fetch.log');
  if (!existsSync(path)) return 0;
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter((line) => line.startsWith('POST /app/installations/')).length;
};

/**
 * .what = the token a `get --json` returned
 * .why = a stale re-mint is proven by a token that differs from the one the warm read served
 */
const getTokenOfGetJson = (input: { stdout: string }): string =>
  JSON.parse(input.stdout).grant.key.secret;

/**
 * .what = wait out a short unlock, so the daemon's copy of the token goes stale
 */
const waitPastExpiry = (input: { ms: number }): Promise<void> =>
  new Promise((done) => setTimeout(done, input.ms));

describe('keyrack github-app mint that returns a token', () => {
  given('[case1] off ec2: the blob piped into os.secure (c1, c2)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] the commander pipes the blob in', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'set', '--owner', OWNER, '--key', SLUG, '--vault', 'os.secure', '--mech', MECH, '--source', '@stdin'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'mint' }),
          stdin: BLOB_VALID,
          logOnError: false,
        }),
      );

      then('the set is accepted', () => {
        expect(result.status).toEqual(0);
      });

      then('the private key never reaches the output', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] the crew asks with get --unlock, cold (c1)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--unlock'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'mint' }),
          logOnError: false,
        }),
      );

      then('the key is granted (exit 0)', () => {
        expect(result.status).toEqual(0);
      });

      then('exactly one mint was asked of github', () => {
        expect(getMintCount({ repoPath: repo.path })).toEqual(1);
      });

      then('the private key never reaches the output', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t2] the crew asks with get --json, warm (c2)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--json'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'mint' }),
          logOnError: false,
        }),
      );

      then('the secret is the installation token github returned', () => {
        expect(JSON.parse(result.stdout).grant.key.secret).toMatch(/^ghs_canned/);
      });

      then('the grant is sourced from os.secure with the github-app mech', () => {
        const grant = JSON.parse(result.stdout).grant;
        expect(grant.source.vault).toEqual('os.secure');
        expect(grant.source.mech).toEqual(MECH);
      });

      then('the warm read made no second mint (the daemon served it)', () => {
        expect(getMintCount({ repoPath: repo.path })).toEqual(1);
      });

      then('output matches snapshot (token and expiry masked)', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case2] off ec2: github cannot be reached at the mint', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => {
      const r = await genKeyrackOffEc2Box({ owner: OWNER });
      invokeRhachetCliBinary({
        args: ['keyrack', 'set', '--owner', OWNER, '--key', SLUG, '--vault', 'os.secure', '--mech', MECH, '--source', '@stdin'],
        cwd: r.path,
        env: envOffEc2({ repoPath: r.path, mode: 'unreachable' }),
        stdin: BLOB_VALID,
        logOnError: false,
      });
      return r;
    });

    when('[t0] the crew asks with get --unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--unlock'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'unreachable' }),
          logOnError: false,
        }),
      );

      then('the key stays locked (exit 2), isolated to its row, never a crash', () => {
        expect(result.status).toEqual(2);
      });

      then('the key row names the mint fault, what to check, and the retry', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('github could not be reached');
        expect(output).toContain('api.github.com');
        expect(output).toContain('retry: rhx keyrack unlock --owner');
      });

      then('no stack trace reaches the human', () => {
        expect(result.stdout + result.stderr).not.toMatch(/\n\s+at \S+ \(/);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case3] on ec2: the blob in aws.params (c10, c11)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: OWNER });
    });

    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({
        seed: [{ name: EXID, value: BLOB_VALID, type: 'SecureString' }],
      });
      const repo = await genKeyrackOffEc2Box({ owner: OWNER });
      await seedHostManifestEntries({
        repoPath: repo.path,
        owner: OWNER,
        entries: [
          { slug: SLUG, vault: 'aws.params', mech: MECH, exid: EXID, env: 'all', org: '@all', meta: { region: REGION } },
        ],
      });
      return { ssm, repo };
    });

    // .note = unlock, not `get --unlock`: the seed writes the host manifest entry alone, and `get`
    //         reads the `.stocked` inventory a real `set` writes to tell locked from absent
    when('[t0] the crew unlocks the key, cold (c10)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
          cwd: scene.repo.path,
          env: envEc2({ repoPath: scene.repo.path, ssmUrl: scene.ssm.url }),
          logOnError: false,
          timeoutMs: 30_000,
        }),
      );

      then('the key is granted (exit 0)', () => {
        expect(result.status).toEqual(0);
      });

      then('exactly one mint was asked of github', () => {
        expect(getMintCount({ repoPath: scene.repo.path })).toEqual(1);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] the crew asks with get --json, warm (c11)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: envEc2({ repoPath: scene.repo.path, ssmUrl: scene.ssm.url }),
          logOnError: false,
        }),
      );

      then('the secret is the installation token github returned', () => {
        expect(JSON.parse(result.stdout).grant.key.secret).toMatch(/^ghs_canned/);
      });

      then('the grant is sourced from aws.params, as today', () => {
        expect(JSON.parse(result.stdout).grant.source.vault).toEqual('aws.params');
      });

      then('the warm read made no second mint', () => {
        expect(getMintCount({ repoPath: scene.repo.path })).toEqual(1);
      });

      then('output matches snapshot (token and expiry masked)', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case4] on ec2: the aws.params blob holds a pem that is not an rsa key', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: OWNER });
    });

    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({
        seed: [{ name: EXID, value: BLOB_JUNK_PEM, type: 'SecureString' }],
      });
      const repo = await genKeyrackOffEc2Box({ owner: OWNER });
      await seedHostManifestEntries({
        repoPath: repo.path,
        owner: OWNER,
        entries: [
          { slug: SLUG, vault: 'aws.params', mech: MECH, exid: EXID, env: 'all', org: '@all', meta: { region: REGION } },
        ],
      });
      return { ssm, repo };
    });

    when('[t0] the crew unlocks the key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
          cwd: scene.repo.path,
          env: envEc2({ repoPath: scene.repo.path, ssmUrl: scene.ssm.url }),
          logOnError: false,
          timeoutMs: 30_000,
        }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the cure re-sets the key in aws.params', () => {
        expect(result.stdout + result.stderr).toContain(
          `rhx keyrack set --owner ${OWNER} --key ${SLUG} --vault aws.params --mech ${MECH}`,
        );
      });

      then('the cure never moves the key to os.secure', () => {
        expect(result.stdout + result.stderr).not.toContain('os.secure');
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case5] off ec2: github answers, but cannot mint now (502)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => {
      const r = await genKeyrackOffEc2Box({ owner: OWNER });
      invokeRhachetCliBinary({
        args: ['keyrack', 'set', '--owner', OWNER, '--key', SLUG, '--vault', 'os.secure', '--mech', MECH, '--source', '@stdin'],
        cwd: r.path,
        env: envOffEc2({ repoPath: r.path, mode: 'unavailable' }),
        stdin: BLOB_VALID,
        logOnError: false,
      });
      return r;
    });

    when('[t0] the crew asks with get --unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--unlock'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'unavailable' }),
          logOnError: false,
        }),
      );

      then('the key stays locked (exit 2), isolated to its row, never a crash', () => {
        expect(result.status).toEqual(2);
      });

      then('the key row names the transient fault and the retry, never a re-file', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('github could not mint now (502)');
        expect(output).toContain('retry: rhx keyrack unlock --owner');
        expect(output).not.toContain('--source @stdin');
      });

      then('github was asked once', () => {
        expect(getMintCount({ repoPath: repo.path })).toEqual(1);
      });

      then('no stack trace reaches the human', () => {
        expect(result.stdout + result.stderr).not.toMatch(/\n\s+at \S+ \(/);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case6] off ec2: the token goes stale and is minted fresh (c3)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => {
      const r = await genKeyrackOffEc2Box({ owner: OWNER });
      invokeRhachetCliBinary({
        args: ['keyrack', 'set', '--owner', OWNER, '--key', SLUG, '--vault', 'os.secure', '--mech', MECH, '--source', '@stdin'],
        cwd: r.path,
        env: envOffEc2({ repoPath: r.path, mode: 'mint' }),
        stdin: BLOB_VALID,
        logOnError: false,
      });
      return r;
    });

    when('[t0] the crew unlocks the key for 3s', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG, '--duration', '3s'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'mint' }),
          logOnError: false,
        }),
      );

      then('the key is unlocked (exit 0), one mint asked', () => {
        expect(result.status).toEqual(0);
        expect(getMintCount({ repoPath: repo.path })).toEqual(1);
      });
    });

    when('[t1] the crew reads it warm, then again with get --unlock once it lapsed', () => {
      const result = useBeforeAll(async () => {
        const warm = invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--json'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'mint' }),
          logOnError: false,
        });
        await waitPastExpiry({ ms: 4_000 });
        const stale = invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--unlock', '--json'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path, mode: 'mint' }),
          logOnError: false,
        });
        return { warm, stale };
      });

      then('the warm read served the first token, with no second mint', () => {
        expect(result.warm.status).toEqual(0);
        expect(getTokenOfGetJson({ stdout: result.warm.stdout })).toMatch(/^ghs_canned/);
      });

      then('the stale read is granted (exit 0)', () => {
        expect(result.stale.status).toEqual(0);
      });

      then('the stale read minted again: two mints in all', () => {
        expect(getMintCount({ repoPath: repo.path })).toEqual(2);
      });

      then('the stale read hands back a fresh token, never the lapsed one', () => {
        const tokenFresh = getTokenOfGetJson({ stdout: result.stale.stdout });
        expect(tokenFresh).toMatch(/^ghs_canned/);
        expect(tokenFresh).not.toEqual(getTokenOfGetJson({ stdout: result.warm.stdout }));
      });

      then('the private key never reaches the output', () => {
        expect(result.stale.stdout + result.stale.stderr).not.toContain(PEM_BODY_LINE);
      });
    });
  });

  given('[case7] on ec2: the token goes stale and is minted fresh (c12)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: OWNER });
    });

    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({
        seed: [{ name: EXID, value: BLOB_VALID, type: 'SecureString' }],
      });
      const repo = await genKeyrackOffEc2Box({ owner: OWNER });
      await seedHostManifestEntries({
        repoPath: repo.path,
        owner: OWNER,
        entries: [
          { slug: SLUG, vault: 'aws.params', mech: MECH, exid: EXID, env: 'all', org: '@all', meta: { region: REGION } },
        ],
      });
      return { ssm, repo };
    });

    // .note = unlock, not `get --unlock`: the seed writes the host manifest entry alone, and `get`
    //         reads the `.stocked` inventory a real `set` writes to tell locked from absent
    when('[t0] the crew unlocks for 3s, reads warm, waits it out, and unlocks again', () => {
      const result = useBeforeAll(async () => {
        const env = envEc2({ repoPath: scene.repo.path, ssmUrl: scene.ssm.url });
        const unlockFirst = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG, '--duration', '3s'],
          cwd: scene.repo.path,
          env,
          logOnError: false,
          timeoutMs: 30_000,
        });
        const warm = invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env,
          logOnError: false,
        });
        await waitPastExpiry({ ms: 4_000 });
        const lapsed = invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env,
          logOnError: false,
        });
        const unlockAgain = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
          cwd: scene.repo.path,
          env,
          logOnError: false,
          timeoutMs: 30_000,
        });
        const fresh = invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env,
          logOnError: false,
        });
        return { unlockFirst, warm, lapsed, unlockAgain, fresh };
      });

      then('the first unlock and the warm read pass, on one mint', () => {
        expect(result.unlockFirst.status).toEqual(0);
        expect(getTokenOfGetJson({ stdout: result.warm.stdout })).toMatch(/^ghs_canned/);
      });

      then('the lapsed token is never served', () => {
        expect(result.lapsed.status).not.toEqual(0);
        expect(result.lapsed.stdout).not.toContain(getTokenOfGetJson({ stdout: result.warm.stdout }));
      });

      then('the second unlock mints again: two mints in all', () => {
        expect(result.unlockAgain.status).toEqual(0);
        expect(getMintCount({ repoPath: scene.repo.path })).toEqual(2);
      });

      then('the fresh read hands back a new token, sourced from aws.params', () => {
        const grant = JSON.parse(result.fresh.stdout).grant;
        expect(grant.source.vault).toEqual('aws.params');
        expect(grant.key.secret).toMatch(/^ghs_canned/);
        expect(grant.key.secret).not.toEqual(getTokenOfGetJson({ stdout: result.warm.stdout }));
      });
    });
  });
});
