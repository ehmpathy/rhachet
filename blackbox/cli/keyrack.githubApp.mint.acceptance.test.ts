import { given, then, useBeforeAll, when } from 'test-fns';

import { asKeyrackCliOutputClean } from '@/blackbox/.test/infra/asKeyrackCliOutputClean';
import { asKeyrackOffEc2Env } from '@/blackbox/.test/infra/asKeyrackOffEc2Env';
import { genGithubAppBlobFixture } from '@/blackbox/.test/infra/genGithubAppBlobFixture';
import { genKeyrackOffEc2Box } from '@/blackbox/.test/infra/genKeyrackOffEc2Box';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
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
 * .twin = `blackbox/sdk/keyrack.githubApp.acceptance.test.ts` drives the same refusal via the sdk
 */
const OWNER = 'mechanic';
const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const MECH = 'EPHEMERAL_VIA_GITHUB_APP';

// a real rsa key, made for this run, for an app id and installation id no github app holds,
// so the real github refuses the mint (404); its body line is asserted absent from every output
const { blob: BLOB_UNREGISTERED, pemBodyLine: PEM_BODY_LINE } = genGithubAppBlobFixture({
  appId: '999999999',
  installationId: '999999999',
  privateKey: 'generated',
});

describe('keyrack github-app mint against the real github', () => {
  given('[case1] off ec2: a blob for an app the real github does not hold', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => {
      const r = await genKeyrackOffEc2Box({ owner: OWNER });
      invokeRhachetCliBinary({
        args: ['keyrack', 'set', '--owner', OWNER, '--key', SLUG, '--vault', 'os.secure', '--mech', MECH, '--source', '@stdin'],
        cwd: r.path,
        env: asKeyrackOffEc2Env({ repoPath: r.path }),
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
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
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
        expect(
          asKeyrackCliOutputClean({ output: result.stdout + result.stderr }),
        ).toMatchSnapshot();
      });
    });
  });
});
