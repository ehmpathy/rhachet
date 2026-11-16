import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { asKeyrackCliOutputClean } from '@/blackbox/.test/infra/asKeyrackCliOutputClean';
import { asKeyrackOffEc2Env } from '@/blackbox/.test/infra/asKeyrackOffEc2Env';
import { genKeyrackOffEc2Box } from '@/blackbox/.test/infra/genKeyrackOffEc2Box';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { seedHostManifestEntries } from '@/blackbox/.test/infra/seedHostManifestEntries';

/**
 * .what = blackbox acceptance for a github-app key on a box with no aws identity (a grove off ec2)
 * .why = the clamp the off-ec2 grove needs, at the real cli boundary:
 *        - red: the blob lives only in aws.params → unlock is refused, and the refusal names the
 *          off-ec2 cure
 *        - green: the blob is piped into os.secure via `keyrack set --source @stdin` → unlock
 *          reads it, signs the jwt, and calls the real api.github.com, with no aws identity asked
 *        plus every refusal `--source @stdin` owns (malformed, empty, literal, wrong vault, tty,
 *        a mech os.secure does not hold), and a piped replica value, the other pipeable mech
 *
 * .box = no aws identity: every AWS_* credential var unset, shared config + credentials files
 *        pointed at absent paths, IMDS disabled. a `gh` that always fails sits first on PATH, so
 *        a pass proves the piped set never called gh
 * .blob = two shapes. the green halves pipe a blob whose rsa key is generated at test time, for
 *         an app id no github app holds: the jwt is signed with it for real, and the real github
 *         refuses it (404). the refusal and cure cases pipe a fixture whose pem is not a valid rsa
 *         key, so the mint fails in crypto and its cure renders. no credential value lives here
 * .real = no fake stands in for github: the green halves reach the live api.github.com. a token
 *         github returns needs the real app's key, which no test may hold (fulcrum F5); the
 *         token-to-`get` route is proven in `keyrack.githubApp.mint.integration`
 * .grain = the red half runs here, not in jest: the aws sdk's credential chain lazy-imports its
 *          providers, which jest's vm refuses, so a real node process is the one place the
 *          no-identity refusal can be observed end to end
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

const OWNER = 'mechanic';
const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';
const MECH = 'EPHEMERAL_VIA_GITHUB_APP';
const EXID =
  '/keyrack/infra/vault/aws.params/v1/mechanic/_all_/all/EHMPATH_BEAVER_GITHUB_TOKEN';

// the pem body line — asserted ABSENT from every output, so the blob never leaks back
const PEM_BODY_MARKER = 'not-a-real-rsa-key-fixture';
const BLOB_FIXTURE = JSON.stringify({
  appId: '123456',
  installationId: '78901234',
  privateKey: `-----BEGIN RSA PRIVATE KEY-----\n${PEM_BODY_MARKER}\n-----END RSA PRIVATE KEY-----`,
  mech: MECH,
});

// a real rsa key, made for this run; its body line is asserted absent from every output
const PEM_VALID = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;
const PEM_VALID_BODY_LINE = PEM_VALID.split('\n')[1]!;

// an app id and installation id no github app holds, so the real github refuses the mint (404)
const BLOB_VALID = JSON.stringify({
  appId: '999999999',
  installationId: '999999999',
  privateKey: PEM_VALID,
  mech: MECH,
});
const REFUSAL_REAL_GITHUB = 'github refused the stored installation (404)';

/**
 * .what = run `keyrack set --source @stdin` with the given stdin, on the off-ec2 box
 * .why = one shape for every piped set below
 */
const invokePipedSet = (input: {
  repoPath: string;
  stdin: string;
  vault?: string;
  source?: string;
  key?: string;
  mech?: string | null;
  extra?: string[];
}) =>
  invokeRhachetCliBinary({
    // .note = `mech: null` omits --mech, so the mech is read from the piped value
    args: [
      'keyrack', 'set',
      '--owner', OWNER,
      '--key', input.key ?? SLUG,
      '--vault', input.vault ?? 'os.secure',
      ...(input.mech === null ? [] : ['--mech', input.mech ?? MECH]),
      '--source', input.source ?? '@stdin',
      ...(input.extra ?? []),
    ],
    cwd: input.repoPath,
    env: asKeyrackOffEc2Env({ repoPath: input.repoPath }),
    stdin: input.stdin,
    logOnError: false,
  });

describe('keyrack github-app key on a box with no aws identity', () => {
  given('[case1] the blob lives only in aws.params (the clamp, red half)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    // the box today: its manifest maps the key to aws.params, as an ec2 grove's does
    const repo = useBeforeAll(async () => {
      const r = await genKeyrackOffEc2Box({ owner: OWNER });
      await seedHostManifestEntries({
        repoPath: r.path,
        owner: OWNER,
        entries: [
          {
            slug: SLUG,
            vault: 'aws.params',
            mech: MECH,
            exid: EXID,
            env: 'all',
            org: '@all',
            meta: { region: 'us-east-1' },
          },
        ],
      });
      return r;
    });

    when('[t0] the box unlocks the key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          // no --env: the full slug names its own env, read from the slug with no repo manifest
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
          logOnError: false,
        }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal is the no-identity one', () => {
        expect(result.stdout + result.stderr).toContain('found no AWS identity');
      });

      then('the refusal names the off-ec2 cure', () => {
        expect(result.stdout + result.stderr).toContain(
          '--vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP --source @stdin',
        );
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case2] the blob is piped into os.secure (the clamp, green half)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] the commander pipes the blob into keyrack set', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({ repoPath: repo.path, stdin: `${BLOB_VALID}\n` }),
      );

      then('the set exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the blob is never echoed back', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_VALID_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json after the piped set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', OWNER, '--json'],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
        }),
      );

      then('the key maps to os.secure with the github-app mech', () => {
        const entry = JSON.parse(result.stdout)[SLUG];
        expect(entry.vault).toEqual('os.secure');
        expect(entry.mech).toEqual(MECH);
      });

      then('the manifest entry holds no part of the blob', () => {
        expect(result.stdout).not.toContain(PEM_VALID_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t2] the box unlocks the key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          // no --env: the full slug names its own env, read from the slug with no repo manifest
          args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
          logOnError: false,
          timeoutMs: 30_000,
        }),
      );

      then('it reaches the real github from os.secure, with no aws identity asked', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain(REFUSAL_REAL_GITHUB);
        expect(output).toContain(
          `rhx keyrack set --owner ${OWNER} --key ${SLUG} --vault os.secure`,
        );
        expect(output).not.toContain('AWS identity');
      });

      then('the blob is never echoed back', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_VALID_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t3] keyrack get --unlock after the piped set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--owner', OWNER, '--key', SLUG, '--unlock'],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
          logOnError: false,
          timeoutMs: 30_000,
        }),
      );

      then('the real github refuses the unregistered app, a cure the caller runs (exit 2)', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout + result.stderr).toContain(REFUSAL_REAL_GITHUB);
        expect(result.stdout + result.stderr).not.toContain('AWS identity');
      });

      then('the blob is never echoed back', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_VALID_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case3] a malformed blob is piped in', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));
    const blobMalformed = JSON.stringify({ appId: '123456', installationId: PEM_BODY_MARKER });

    when('[t0] keyrack set --source @stdin', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({ repoPath: repo.path, stdin: blobMalformed }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the absent field, never the value', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('not a valid source for its mech');
        expect(output).toContain('privateKey');
        expect(output).not.toContain(PEM_BODY_MARKER);
      });

      then('no key is registered', () => {
        const list = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', OWNER, '--json'],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
        });
        expect(JSON.parse(list.stdout)[SLUG]).toBeUndefined();
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case4] the pipe is empty', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --source @stdin', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({ repoPath: repo.path, stdin: '' }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the empty pipe', () => {
        expect(result.stdout + result.stderr).toContain('received an empty value');
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case5] --source carries a literal value, not @stdin', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --source <value>', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({ repoPath: repo.path, stdin: '', source: PEM_BODY_MARKER }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names @stdin, and never echoes the value', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--source accepts only @stdin');
        expect(output).not.toContain(PEM_BODY_MARKER);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case6] --source with a vault other than os.secure', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --vault aws.params --source @stdin', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({ repoPath: repo.path, stdin: BLOB_FIXTURE, vault: 'aws.params' }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the vault fix', () => {
        expect(result.stdout + result.stderr).toContain(
          'vault aws.params takes no piped source',
        );
        expect(result.stdout + result.stderr).toContain('os.secure');
      });

      then('the refusal never echoes the piped value', () => {
        expect(result.stdout + result.stderr).not.toContain('privateKey');
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case7] --source @stdin at a terminal', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --source @stdin under a pseudo-tty', () => {
      // a pseudo-tty makes process.stdin.isTTY true in the child; no answer is ever fed
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --owner ${OWNER} --key ${SLUG} --vault os.secure --mech ${MECH} --source @stdin`,
            'prompt-never-shown',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: Object.fromEntries(
              Object.entries({ ...process.env, ...asKeyrackOffEc2Env({ repoPath: repo.path }) }).filter(
                (entry): entry is [string, string] => entry[1] !== undefined,
              ),
            ),
            timeout: 60000,
          },
        ),
      );

      then('it refuses rather than waits', () => {
        expect(result.stdout + result.stderr).toContain(
          'found a terminal, not a pipe',
        );
      });

      then('it exits as a constraint (exit 2), not a hang cut by the timeout', () => {
        expect(result.status).toEqual(2);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case8] a replica value is piped into os.secure', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --mech PERMANENT_VIA_REPLICA --source @stdin', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({
          repoPath: repo.path,
          stdin: 'replica-fixture-value\n',
          key: '@all.all.PIPED_REPLICA_KEY',
          mech: 'PERMANENT_VIA_REPLICA',
        }),
      );

      then('the set exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree closes with the roundtrip result', () => {
        expect(result.stdout).toContain('✓ roundtrip verified');
      });

      then('the value is never echoed back', () => {
        expect(result.stdout + result.stderr).not.toContain(
          'replica-fixture-value',
        );
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case9] a source is piped under a mech os.secure does not hold', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --mech EPHEMERAL_VIA_AWS_SSO --source @stdin', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({
          repoPath: repo.path,
          stdin: 'sso-fixture-value\n',
          key: '@all.all.AWS_PROFILE',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the mech', () => {
        expect(result.stdout + result.stderr).toContain(
          'os.secure does not support mech: EPHEMERAL_VIA_AWS_SSO',
        );
      });

      then('the value is never echoed back', () => {
        expect(result.stdout + result.stderr).not.toContain('sso-fixture-value');
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given(
    '[case10] one box moves from aws.params to os.secure (the clamp, red then green)',
    () => {
      beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
      afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

      // the box today: its manifest maps the key to aws.params, as an ec2 grove's does
      const repo = useBeforeAll(async () => {
        const r = await genKeyrackOffEc2Box({ owner: OWNER });
        await seedHostManifestEntries({
          repoPath: r.path,
          owner: OWNER,
          entries: [
            {
              slug: SLUG,
              vault: 'aws.params',
              mech: MECH,
              exid: EXID,
              env: 'all',
              org: '@all',
              meta: { region: 'us-east-1' },
            },
          ],
        });
        return r;
      });

      when('[t0] the box unlocks the key before the pipe', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
            cwd: repo.path,
            env: asKeyrackOffEc2Env({ repoPath: repo.path }),
            logOnError: false,
          }),
        );

        then('it is refused for no aws identity (exit 2)', () => {
          expect(result.status).toEqual(2);
          expect(result.stdout + result.stderr).toContain('found no AWS identity');
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t1] the commander pipes the blob into keyrack set', () => {
        const result = useBeforeAll(async () =>
          invokePipedSet({ repoPath: repo.path, stdin: `${BLOB_VALID}\n` }),
        );

        then('the set exits with status 0', () => {
          expect(result.status).toEqual(0);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t2] keyrack list --json after the pipe', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'list', '--owner', OWNER, '--json'],
            cwd: repo.path,
            env: asKeyrackOffEc2Env({ repoPath: repo.path }),
          }),
        );

        then('the same key now maps to os.secure, with no aws.params exid', () => {
          const entry = JSON.parse(result.stdout)[SLUG];
          expect(entry.vault).toEqual('os.secure');
          expect(entry.exid).toEqual(null);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t3] the box unlocks the key after the pipe', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
            cwd: repo.path,
            env: asKeyrackOffEc2Env({ repoPath: repo.path }),
            logOnError: false,
            timeoutMs: 30_000,
          }),
        );

        then('it reaches the real github from os.secure, with no aws identity asked', () => {
          const output = result.stdout + result.stderr;
          expect(output).toContain(REFUSAL_REAL_GITHUB);
          expect(output).not.toContain('AWS identity');
        });

        then('the blob is never echoed back', () => {
          expect(result.stdout + result.stderr).not.toContain(PEM_VALID_BODY_LINE);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      // the cure every mint-fault hint names, and what a re-run of the one command does
      when('[t4] the commander re-pipes a new blob over the os.secure entry', () => {
        const result = useBeforeAll(async () =>
          invokePipedSet({
            repoPath: repo.path,
            stdin: `${BLOB_FIXTURE.replace('"123456"', '"654321"')}\n`,
          }),
        );
        const listed = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'list', '--owner', OWNER, '--json'],
            cwd: repo.path,
            env: asKeyrackOffEc2Env({ repoPath: repo.path }),
          }),
        );

        then('the re-pipe exits 0 and the entry stays os.secure', () => {
          expect(result.status).toEqual(0);
          expect(JSON.parse(listed.stdout)[SLUG].vault).toEqual('os.secure');
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case11] the real box: no git repo at the cwd, as `ssh <box> rhx …` lands in $HOME',
    () => {
      beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
      afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

      const box = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER, git: false }));

      when('[t0] the commander pipes the blob under the full slug', () => {
        const result = useBeforeAll(async () =>
          invokePipedSet({ repoPath: box.path, stdin: `${BLOB_FIXTURE}\n` }),
        );

        then('the set exits with status 0', () => {
          expect(result.status).toEqual(0);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t1] the crew unlocks the full slug', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'unlock', '--owner', OWNER, '--key', SLUG],
            cwd: box.path,
            env: asKeyrackOffEc2Env({ repoPath: box.path }),
            logOnError: false,
          }),
        );

        then('it reaches the mint, and the cure names this key and owner', () => {
          const output = result.stdout + result.stderr;
          expect(output).toContain('failed to mint github app token');
          expect(output).toContain(
            `rhx keyrack set --owner ${OWNER} --key ${SLUG} --vault os.secure`,
          );
          expect(output).not.toContain(PEM_BODY_MARKER);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t2] the commander pipes under a short key, --env prep --org @all', () => {
        const result = useBeforeAll(async () =>
          invokePipedSet({
            repoPath: box.path,
            stdin: `${BLOB_FIXTURE}\n`,
            key: 'EHMPATH_BEAVER_GITHUB_TOKEN',
            extra: ['--env', 'prep', '--org', '@all'],
          }),
        );

        then('the set exits with status 0', () => {
          expect(result.status).toEqual(0);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t3] the crew unlocks the short key, --env prep', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'keyrack', 'unlock', '--owner', OWNER,
              '--env', 'prep', '--key', 'EHMPATH_BEAVER_GITHUB_TOKEN',
            ],
            cwd: box.path,
            env: asKeyrackOffEc2Env({ repoPath: box.path }),
            logOnError: false,
          }),
        );

        then('it reaches the mint of @all.prep', () => {
          const output = result.stdout + result.stderr;
          expect(output).toContain('@all.prep.EHMPATH_BEAVER_GITHUB_TOKEN');
          expect(output).toContain('failed to mint github app token');
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      // the stumble a commander meets with a bare name in the `<full slug>` placeholder
      when('[t4] the commander pipes under a short key with no --org', () => {
        const result = useBeforeAll(async () =>
          invokePipedSet({
            repoPath: box.path,
            stdin: `${BLOB_FIXTURE}\n`,
            key: 'EHMPATH_BEAVER_GITHUB_TOKEN',
            extra: ['--env', 'prep'],
          }),
        );

        then('it is refused (exit 2), and the blob is never echoed', () => {
          expect(result.status).toEqual(2);
          expect(result.stdout + result.stderr).not.toContain(PEM_BODY_MARKER);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      // the crew's literal ask from the vision's case=1 sketch, with a bare key and no --org
      when('[t5] the crew gets the short key, --env prep, with no --org', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'keyrack', 'get', '--owner', OWNER,
              '--env', 'prep', '--key', 'EHMPATH_BEAVER_GITHUB_TOKEN', '--unlock',
            ],
            cwd: box.path,
            env: asKeyrackOffEc2Env({ repoPath: box.path }),
            logOnError: false,
          }),
        );

        then('it is refused (exit 2), and the hint names --org @all and the full slug', () => {
          const output = result.stdout + result.stderr;
          expect(result.status).toEqual(2);
          expect(output).toContain('--org @all');
          expect(output).toContain('@all.prep.EHMPATH_BEAVER_GITHUB_TOKEN');
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });

      when('[t6] the crew gets the short key, --env prep --org @all', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'keyrack', 'get', '--owner', OWNER,
              '--env', 'prep', '--org', '@all',
              '--key', 'EHMPATH_BEAVER_GITHUB_TOKEN', '--unlock',
            ],
            cwd: box.path,
            env: asKeyrackOffEc2Env({ repoPath: box.path }),
            logOnError: false,
          }),
        );

        then('it reaches the mint of @all.prep, and never echoes the blob', () => {
          const output = result.stdout + result.stderr;
          expect(output).toContain('@all.prep.EHMPATH_BEAVER_GITHUB_TOKEN');
          expect(output).toContain('failed to mint github app token');
          expect(output).not.toContain(PEM_BODY_MARKER);
        });

        then('output matches snapshot', () => {
          expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
        });
      });
    },
  );

  given('[case12] a value is piped with no --mech', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    // the output of `aws ssm get-parameter` with no --with-decryption: ciphertext, not a blob
    when('[t0] ciphertext is piped', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({
          repoPath: repo.path,
          stdin: 'AQICAHhCIPHERTEXTFIXTURE0000==\n',
          mech: null,
        }),
      );

      then('it is refused (exit 2), names --mech, and never echoes the value', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout + result.stderr).toContain('pass --mech');
        expect(result.stdout + result.stderr).not.toContain('CIPHERTEXTFIXTURE');
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] a github-app blob that names no mech is piped', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({
          repoPath: repo.path,
          stdin: `${JSON.stringify({ ...JSON.parse(BLOB_FIXTURE), mech: undefined })}\n`,
          mech: null,
        }),
      );
      const listed = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', OWNER, '--json'],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
        }),
      );

      then('it is stored as github-app, never as a replica', () => {
        expect(result.status).toEqual(0);
        expect(JSON.parse(listed.stdout)[SLUG].mech).toEqual(MECH);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case13] a box with no keyrack init', () => {
    const box = useBeforeAll(async () =>
      genKeyrackOffEc2Box({ owner: OWNER, git: false, init: false }),
    );

    when('[t0] the commander pipes the blob', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({ repoPath: box.path, stdin: `${BLOB_FIXTURE}\n` }),
      );

      then('it is refused (exit 2) and names keyrack init', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout + result.stderr).toContain('rhx keyrack init');
        expect(result.stdout + result.stderr).not.toContain(PEM_BODY_MARKER);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case14] a github-app blob is piped under the replica mech', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const repo = useBeforeAll(async () => genKeyrackOffEc2Box({ owner: OWNER }));

    when('[t0] keyrack set --mech PERMANENT_VIA_REPLICA --source @stdin', () => {
      const result = useBeforeAll(async () =>
        invokePipedSet({
          repoPath: repo.path,
          stdin: `${BLOB_VALID}\n`,
          mech: 'PERMANENT_VIA_REPLICA',
        }),
      );

      then('it is refused as a constraint (exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the mech mismatch and the blob own mech as the fix', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('mech mismatch');
        expect(output).toContain(`set the key with --mech ${MECH}`);
      });

      then('the blob is never echoed back', () => {
        expect(result.stdout + result.stderr).not.toContain(PEM_VALID_BODY_LINE);
      });

      then('output matches snapshot', () => {
        expect(asKeyrackCliOutputClean({ output: result.stdout + result.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json after the refusal', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', OWNER, '--json'],
          cwd: repo.path,
          env: asKeyrackOffEc2Env({ repoPath: repo.path }),
        }),
      );

      then('no entry was written for the key', () => {
        expect(JSON.parse(result.stdout)[SLUG]).toBeUndefined();
      });
    });
  });
});
