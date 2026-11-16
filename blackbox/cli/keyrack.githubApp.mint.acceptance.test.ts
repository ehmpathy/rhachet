import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = blackbox acceptance for the github-app mint against the REAL api.github.com
 * .why = the mint's external contract, driven for real at the cli: a blob piped into os.secure
 *        on a box with no aws identity, its rsa key generated at test time, for an app id no
 *        github app holds. github itself refuses the mint, and the crew must get a cure, never a
 *        retry loop or a raw octokit fault
 *
 * .real = no fake stands in for github here: no NODE_OPTIONS, no canned fetch
 * .note = a token github returns needs the real app's private key, which no test may hold
 *         (fulcrum F5). the token-to-`get` route is proven in `keyrack.githubApp.mint.integration`
 *         against a canned github; the live mint of a real token is the commander's run on the
 *         grove, named in the pr
 */
const OWNER = 'mechanic';
const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const MECH = 'EPHEMERAL_VIA_GITHUB_APP';

// a real rsa key, made for this run; its body line is asserted absent from every output
const PEM_VALID = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;
const PEM_BODY_LINE = PEM_VALID.split('\n')[1]!;

// an app id and installation id no github app holds, so the real github refuses the mint (404)
const BLOB_UNREGISTERED = JSON.stringify({
  appId: '999999999',
  installationId: '999999999',
  privateKey: PEM_VALID,
  mech: MECH,
});

/**
 * .what = the env of a box with no aws identity, where api.github.com is the real github
 */
const envOffEc2 = (input: {
  repoPath: string;
}): Record<string, string | undefined> => ({
  HOME: input.repoPath,
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  AWS_SESSION_TOKEN: undefined,
  AWS_PROFILE: undefined,
  AWS_DEFAULT_PROFILE: undefined,
  AWS_CONFIG_FILE: join(input.repoPath, '.aws', 'config.absent'),
  AWS_SHARED_CREDENTIALS_FILE: join(input.repoPath, '.aws', 'credentials.absent'),
  AWS_EC2_METADATA_DISABLED: 'true',
  NODE_OPTIONS: undefined,
});

/**
 * .what = a temp repo with keyrack init for the owner
 */
const genBox = async () => {
  const repo = await genTestTempRepo({ fixture: 'minimal' });
  invokeRhachetCliBinary({
    args: ['keyrack', 'init', '--owner', OWNER],
    cwd: repo.path,
    env: { HOME: repo.path },
    logOnError: false,
  });
  return repo;
};

const cleanCliOutput = (str: string): string =>
  asSnapshotSafe(str)
    .replace(/[ \t]+$/gm, '')
    .trim();

describe('keyrack github-app mint against the real github', () => {
  given('[case1] off ec2: a blob for an app the real github does not hold', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => {
      const r = await genBox();
      invokeRhachetCliBinary({
        args: ['keyrack', 'set', '--owner', OWNER, '--key', SLUG, '--vault', 'os.secure', '--mech', MECH, '--source', '@stdin'],
        cwd: r.path,
        env: envOffEc2({ repoPath: r.path }),
        stdin: BLOB_UNREGISTERED,
        logOnError: false,
      });
      return r;
    });

    when('[t0] the crew asks with get --unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--unlock'],
          cwd: repo.path,
          env: envOffEc2({ repoPath: repo.path }),
          logOnError: false,
          timeoutMs: 30_000,
        }),
      );

      then('the key stays locked (exit 2), a refusal the caller fixes', () => {
        expect(result.status).toEqual(2);
      });

      then('the row names the real github refusal and the re-file cure for this key', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('github refused the stored installation (404)');
        expect(output).toContain('its appId names no app');
        expect(output).toContain(
          `rhx keyrack set --owner ${OWNER} --key ${SLUG} --vault os.secure`,
        );
      });

      then('no aws identity was asked for', () => {
        expect(result.stdout + result.stderr).not.toContain('AWS identity');
      });

      then('the private key never reaches the output', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(cleanCliOutput(result.stdout + result.stderr)).toMatchSnapshot();
      });
    });
  });
});
