import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { asKeyrackCliOutputClean } from '@/blackbox/.test/infra/asKeyrackCliOutputClean';
import { asKeyrackOffEc2Env } from '@/blackbox/.test/infra/asKeyrackOffEc2Env';
import { genGithubAppBlobFixture } from '@/blackbox/.test/infra/genGithubAppBlobFixture';
import { genKeyrackOffEc2Box } from '@/blackbox/.test/infra/genKeyrackOffEc2Box';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = sdk acceptance for the github-app mint against the REAL api.github.com
 * .why = `keyrack.get({ with: { unlock: true } })` is the sdk twin of `rhx keyrack get --unlock`;
 *        a blob in os.secure on a box with no aws identity must reach the same mint, and its
 *        refusal must reach an sdk caller as a typed attempt with the same cure
 *
 * .real = no fake stands in for github here: no NODE_OPTIONS, no canned fetch
 * .twin = `blackbox/cli/keyrack.githubApp.mint.acceptance.test.ts` drives the same refusal at the
 *         cli. the blob is filed through the cli, since `--source @stdin` is a cli-only surface
 * .note = a token github returns needs the real app's private key, which no test may hold
 *         (fulcrum F5); the rsa key here is generated at test time, for an app id no github
 *         app holds
 * .bound = the no-identity red half (cli `keyrack.githubApp.offEc2` case1) has no sdk twin.
 *          `with: { unlock: true }` unlocks only a key the inventory records as set, and an
 *          aws.params key is recorded only by a real aws.params set, which needs gh and an aws
 *          identity this box lacks by design. the cli drives that half via `unlock`, which the sdk
 *          does not expose
 */
const OWNER = 'mechanic';
const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const MECH = 'EPHEMERAL_VIA_GITHUB_APP';

// the built sdk, imported by path from the node child
const RHACHET_SDK_KEYRACK = join(process.cwd(), 'dist', 'contract', 'sdk.keyrack.js');

// a real rsa key, made for this run, for an app id and installation id no github app holds,
// so the real github refuses the mint (404); its body line is asserted absent from every output
const { blob: BLOB_UNREGISTERED, pemBodyLine: PEM_BODY_LINE } = genGithubAppBlobFixture({
  appId: '999999999',
  installationId: '999999999',
  privateKey: 'generated',
});

/**
 * .what = run `keyrack.get({ with: { unlock: true } })` in a node child that imports the built sdk
 * .why = a consumer imports the sdk in its own process; the child holds the off-ec2 env, so the
 *        aws sdk's credential chain runs for real, outside jest's vm
 */
const invokeSdkGetWithUnlock = (input: {
  boxPath: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const modulePath = join(input.boxPath, 'get-github-app.mjs');
  writeFileSync(
    modulePath,
    [
      `import { keyrack } from '${RHACHET_SDK_KEYRACK}';`,
      `const result = await keyrack.get({ for: { key: '${SLUG}' }, with: { unlock: true }, owner: '${OWNER}' });`,
      'console.log(JSON.stringify(result));',
      '',
    ].join('\n'),
  );
  const spawned = spawnSync('node', [modulePath], {
    cwd: input.boxPath,
    encoding: 'utf-8',
    timeout: 60_000,
    env: Object.fromEntries(
      Object.entries({
        ...process.env,
        ...asKeyrackOffEc2Env({ repoPath: input.boxPath }),
      }).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ),
  });
  return { status: spawned.status, stdout: spawned.stdout, stderr: spawned.stderr };
};

describe('keyrack.get of a github-app key against the real github', () => {
  given('[case1] off ec2: a blob in os.secure for an app the real github does not hold', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const box = useBeforeAll(async () => {
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

    when('[t0] the sdk caller asks with keyrack.get({ with: { unlock: true } })', () => {
      const result = useBeforeAll(async () => invokeSdkGetWithUnlock({ boxPath: box.path }));

      then('the call returns, never throws (exit 0)', () => {
        expect(result.status).toEqual(0);
      });

      then('the attempt is locked, for this key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt.status).toEqual('locked');
        expect(parsed.attempt.slug).toEqual(SLUG);
      });

      then('the attempt fix names the real github refusal and the re-file cure', () => {
        const fix = JSON.parse(result.stdout).attempt.fix;
        expect(fix).toContain('github refused the stored installation (404)');
        expect(fix).toContain('its appId names no app');
        expect(fix).toContain(
          `rhx keyrack set --owner ${OWNER} --key ${SLUG} --vault os.secure`,
        );
      });

      then('no aws identity was asked for', () => {
        expect(result.stdout + result.stderr).not.toContain('AWS identity');
      });

      then('the private key never reaches the output', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_BODY_LINE);
      });

      then('emit.stdout matches snapshot', () => {
        expect(
          asKeyrackCliOutputClean({ output: JSON.parse(result.stdout).emit.stdout }),
        ).toMatchSnapshot();
      });
    });
  });

});
