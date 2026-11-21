import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = `rhx brains auth set | get | use`, the paths that need no real account
 * .why = the refusals (case=5, case=6, F5, F1), the empty read and the help are the contract a
 *   caller meets first; each is snapped whole, so its full shape is reviewed and cannot drift
 * .note = the paths through a real login wait on two seats set aside for tests (fulcrum F6)
 * .note = each case runs in a temp HOME, so no real login or keyrack on this box is read or written
 */

/**
 * .what = the env credential keys, unset for the child
 * .why = the runner's own env may carry one, and `use` refuses on it before aught else; a case that
 *   proves another refusal must not depend on the runner's env
 */
const ENV_WITHOUT_BRAIN_CREDS = {
  CLAUDE_CODE_OAUTH_TOKEN: undefined,
  ANTHROPIC_API_KEY: undefined,
  ANTHROPIC_AUTH_TOKEN: undefined,
};

const RHACHET_BIN = join(__dirname, '..', '..', 'bin', 'run');
const PTY_WITH_ANSWERS = join(__dirname, '..', '.test', 'assets', 'pty-with-answers.js');

/**
 * .what = run `brains auth set` in a real pseudo-TTY, so stdin is a terminal as a human's is
 * .why = `set` refuses a pipe at once (case=6); its human-faced legs need a tty to be reached
 * .note = the pty joins stdout and stderr, so every assertion reads `stdout`; no prompt is answered
 * .note = the clone keys are unset unless a case sets them: a runner that is itself a clone would
 *   otherwise make every leg the clone refusal
 */
const invokeSetViaPty = (input: {
  cwd: string;
  env: Record<string, string>;
}) => {
  const result = spawnSync(
    'node',
    [PTY_WITH_ANSWERS, `${RHACHET_BIN} brains auth set --brain claude`, '__no_prompt__'],
    {
      encoding: 'utf-8',
      cwd: input.cwd,
      env: {
        ...process.env,
        ...ENV_WITHOUT_BRAIN_CREDS,
        RHACHET_CLONE_SERIAL: undefined,
        RHACHET_CLONE_SOCKET: undefined,
        RHACHET_CLONE_DEPTH: undefined,
        ...input.env,
      },
      timeout: 60000,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stdoutStable: asPtyOutputStable({ output: result.stdout, path: input.cwd }),
  };
};

/**
 * .what = the PATH of this run, with every dir that holds a `claude` executable removed
 * .why = the `set` legs before a real login must not reach this box's own claude
 */
const asPathWithoutClaude = (): string =>
  (process.env.PATH ?? '')
    .split(':')
    .filter((dir) => dir.length > 0 && !existsSync(join(dir, 'claude')))
    .join(':');

/**
 * .what = pty output with its carriage returns cut and the temp repo masked, both its names
 * .why = an exact swap of `[path, realpathSync(path)]` keeps every filename a reviewer reads
 *   (rule.require.mask-both-names-of-a-temp-dir)
 */
const asPtyOutputStable = (input: { output: string; path: string }): string =>
  [realpathSync(input.path), input.path].reduce(
    (output, name) => output.split(name).join('/TMP_REPO'),
    input.output.replace(/\r/g, ''),
  );

describe('brains auth', () => {
  given('[case1] a home with no login and no keyrack', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] `brains auth get`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'get'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 and names the set that adds an account', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('no accounts held');
        expect(result.stdout).toContain('rhx brains auth set');
        expect(result.stdout).toContain('rhx keyrack init --owner ehmpath');
      });

      then('the output matches its snapshot', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] `brains auth get --output json`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'get', '--output', 'json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it emits an empty account list as json, with the owner it read', () => {
        expect(result.status).toEqual(0);
        const json = JSON.parse(result.stdout);
        expect(json.accounts).toEqual([]);
        expect(typeof json.owner).toEqual('string');
        expect(Object.keys(json).sort()).toEqual(['accounts', 'owner']);
      });

      then('the raw json matches its snapshot', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] `brains auth get --account` names an account not held', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'get', '--account', 'b@example.com'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2, names the account, and the set that adds it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no stored credential for b@example.com');
        expect(result.stderr).toContain('rhx brains auth set --brain claude');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] `rhx brains auth get`, the binary every hint names', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['brains', 'auth', 'get'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it reaches the verb, never the skill proxy', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('🧠 brains auth get');
        expect(result.stdout).toContain('no accounts held');
      });
    });
  });

  given('[case2] `brains auth set` with no human at a terminal', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] it runs with piped stdin', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'set', '--brain', 'claude'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2 at once and names the command for the human', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('a first login needs a human at a browser');
        expect(result.stderr).toContain('rhx brains auth set --brain claude');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] it names a brain with no auth adapter', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'set', '--brain', 'nobrain'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2 and names the brain it can log into', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no auth adapter for this brain');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case9] `brains auth set` at a real terminal (case=1, case=6)', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: 'ehmpath' }));
    afterAll(() => killKeyrackDaemonForTests({ owner: 'ehmpath' }));

    when('[t0] the owner has no keyrack', () => {
      const result = useBeforeAll(async () => {
        const repo = await genTestTempRepo({ fixture: 'minimal' });
        return invokeSetViaPty({ cwd: repo.path, env: { HOME: repo.path } });
      });

      then('it exits 2, names the keyrack init, and never opens a login', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain(
          'no keyrack for this owner, so a login cannot be filed',
        );
        expect(result.stdout).toContain('rhx keyrack init --owner ehmpath');
        expect(result.stdout).not.toContain('a claude session opens');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stdoutStable).toMatchSnapshot();
      });
    });

    when('[t1] it runs inside a clone, though a pty is attached', () => {
      const result = useBeforeAll(async () => {
        const repo = await genTestTempRepo({ fixture: 'minimal' });
        return invokeSetViaPty({
          cwd: repo.path,
          env: { HOME: repo.path, RHACHET_CLONE_SERIAL: 'serial-of-a-clone' },
        });
      });

      then('it exits 2 and names the clone as the reason', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('a first login needs a human at a browser');
        expect(result.stdout).toContain('this runs inside a clone');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stdoutStable).toMatchSnapshot();
      });
    });

    when('[t2] a keyrack is ready, and claude is not on the PATH', () => {
      const result = useBeforeAll(async () => {
        const repo = await genTestTempRepo({ fixture: 'minimal' });
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'ehmpath'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return invokeSetViaPty({
          cwd: repo.path,
          env: { HOME: repo.path, PATH: asPathWithoutClaude() },
        });
      });

      then('the notice prints, then it fails as a malfunction with the install fix', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('a claude session opens in an isolated dir');
        expect(result.stdout).toContain('the claude cli could not be started');
        expect(result.stdout).toContain('install claude code');
      });

      then('the output matches its snapshot', () => {
        expect(result.status).toEqual(1);
        expect(result.stdoutStable).toMatchSnapshot();
      });
    });

    when('[t3] a keyrack is ready, and claude exits with no login', () => {
      const result = useBeforeAll(async () => {
        const repo = await genTestTempRepo({ fixture: 'minimal' });
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'ehmpath'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const stubDir = join(repo.path, '.stub-bin');
        mkdirSync(stubDir, { recursive: true });
        writeFileSync(join(stubDir, 'claude'), '#!/usr/bin/env bash\nexit 0\n', {
          mode: 0o755,
        });
        return invokeSetViaPty({
          cwd: repo.path,
          env: { HOME: repo.path, PATH: `${stubDir}:${asPathWithoutClaude()}` },
        });
      });

      then('it exits 2, says the login did not complete, and how to finish one', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('the login did not complete');
        expect(result.stdout).toContain('type /login in claude');
      });

      then('no token reaches the terminal', () => {
        expect(result.stdout).not.toMatch(/sk-ant-|refresh_token/);
      });

      then('the output matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stdoutStable).toMatchSnapshot();
      });
    });
  });

  given('[case3] `brains auth use` without a full ask', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] no --scope is supplied', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2, never assumes a scope, and names the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no --scope supplied');
        expect(result.stderr).toContain('--scope grove');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] a scope not yet supported is asked for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--scope', 'clone'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2 and points to grove scope', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('this scope is not yet supported');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] no --account is supplied', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--scope', 'grove'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2 and names `get` for the accounts held', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no --account supplied');
        expect(result.stderr).toContain('rhx brains auth get');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] a scope that does not exist is asked for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--scope', 'foo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2, names the scope it got, and the scopes there are', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown scope');
        expect(result.stderr).toContain('foo');
        expect(result.stderr).toContain('--scope grove');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] no --scope is supplied, with --output json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--output', 'json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2, and stdout carries no tree for a pipe to misread', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('no --scope supplied');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] a bare `brains auth use`, the form a first-time human types', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2, assumes naught, and names the whole ask in one hint', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('no --account supplied');
        expect(result.stderr).toContain('--account <email> --scope grove');
        expect(result.stderr).toContain('rhx brains auth get');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] the tree scope, which is not yet supported', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--scope', 'tree'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2 and points to grove scope', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('this scope is not yet supported');
        expect(result.stderr).toContain('tree');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case6] a home signed in on a login whose access token lapsed', () => {
    // a lapsed grove login plus the cli's own record; a read never refreshes a live login
    const home = useBeforeAll(async () => {
      const path = realpathSync(genTempDir({ slug: 'brains-auth-get-lapsed' }));
      mkdirSync(join(path, '.claude'), { recursive: true });
      writeFileSync(
        join(path, '.claude', '.credentials.json'),
        JSON.stringify({
          claudeAiOauth: {
            accessToken: 'access.lapsed.sample',
            refreshToken: 'refresh.lapsed.sample',
            expiresAt: Date.now() - 60_000,
            scopes: ['user:inference', 'user:profile'],
            subscriptionType: 'max',
          },
        }),
      );
      writeFileSync(
        join(path, '.claude.json'),
        JSON.stringify({ oauthAccount: { emailAddress: 'a@example.com' } }),
      );
      return { path };
    });

    when('[t0] `brains auth get`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'get'],
          cwd: home.path,
          env: { HOME: home.path },
        }),
      );

      then('it exits 0 and names the signed-in account as unverified, with how it renews', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('a@example.com (signed in)');
        expect(result.stdout).toContain('unverified — the signed-in token lapsed');
      });

      then('the login file is left byte for byte: a read never refreshes it', () => {
        const content = readFileSync(
          join(home.path, '.claude', '.credentials.json'),
          'utf8',
        );
        expect(content).toContain('refresh.lapsed.sample');
      });

      then('the tree matches its snapshot', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout.split('\n')[0]).toContain('🧠 brains auth get');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] `brains auth get --output json`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'get', '--output', 'json'],
          cwd: home.path,
          env: { HOME: home.path },
        }),
      );

      then('it emits the one row, unverified and signed in', () => {
        expect(result.status).toEqual(0);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.accounts).toHaveLength(1);
        expect(parsed.accounts[0]).toMatchObject({
          email: 'a@example.com',
          status: 'unverified',
          signedIn: true,
        });
      });

      then('the raw json matches its snapshot', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] `brains auth use --scope grove` over the lapsed login', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--scope', 'grove'],
          cwd: home.path,
          env: { HOME: home.path, ...ENV_WITHOUT_BRAIN_CREDS },
        }),
      );

      then('it exits 2 as unverified, and names how the login renews', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain("the grove's signed-in account is unverified");
        expect(result.stderr).toContain('run any claude session on this box once');
      });

      then('the login file is left byte for byte: a refused use writes naught', () => {
        const content = readFileSync(
          join(home.path, '.claude', '.credentials.json'),
          'utf8',
        );
        expect(content).toContain('refresh.lapsed.sample');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case7] `brains auth use` where an env credential outranks the grove login', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] a grove use runs with CLAUDE_CODE_OAUTH_TOKEN set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--scope', 'grove'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            ...ENV_WITHOUT_BRAIN_CREDS,
            CLAUDE_CODE_OAUTH_TOKEN: 'set-by-the-caller',
          },
        }),
      );

      then('it exits 2 before any read, and names the key to unset', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          'an env credential outranks the grove login',
        );
        expect(result.stderr).not.toContain('use did not land');
        expect(result.stderr).toContain('unset CLAUDE_CODE_OAUTH_TOKEN');
        expect(result.stderr).not.toContain('set-by-the-caller');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case8] `brains auth get` names a brain with no auth adapter', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] `brains auth get --brain codex`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'get', '--brain', 'codex'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 2 with the same refusal `set` gives', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no auth adapter for this brain');
        expect(result.stderr).toContain('rhx brains auth get --brain claude');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case5] `brains auth use` from a dir outside any repo', () => {
    // the realpath: genTempDir links into the repo, but its files live under the os temp dir
    const outside = useBeforeAll(async () => ({
      path: realpathSync(genTempDir({ slug: 'brains-auth-use-outside-repo' })),
    }));

    when('[t0] a grove use names an account the keyrack does not hold', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['brains', 'auth', 'use', '--account', 'b@example.com', '--scope', 'grove'],
          cwd: outside.path,
          env: { HOME: outside.path, ...ENV_WITHOUT_BRAIN_CREDS },
        }),
      );

      then('it reaches the account check: the grove swap needs no repo', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('no stored credential for b@example.com');
        expect(result.stderr).not.toContain('MalfunctionError');
      });

      then('the refusal matches its snapshot', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case4] the help a caller reads to find each verb and its flags', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));
    const HELP_CASES = [
      { slug: 'brains', args: ['brains', '--help'], shows: ['auth'] },
      {
        slug: 'brains auth',
        args: ['brains', 'auth', '--help'],
        shows: ['set', 'get', 'use'],
      },
      {
        slug: 'brains auth set',
        args: ['brains', 'auth', 'set', '--help'],
        shows: ['--brain', '--owner', '--output', 'examples', 'rhx brains auth set'],
      },
      {
        slug: 'brains auth get',
        args: ['brains', 'auth', 'get', '--help'],
        shows: [
          '--account',
          '--owner',
          '--output',
          'renews',
          'examples',
          'rhx brains auth get --output json',
        ],
      },
      {
        slug: 'brains auth use',
        args: ['brains', 'auth', 'use', '--help'],
        shows: [
          '--account',
          '--scope',
          '--owner',
          '--output',
          'examples',
          'rhx brains auth use --account b@example.com --scope grove',
        ],
      },
    ];

    HELP_CASES.map((thisCase, index) =>
      when(`[t${index}] \`${thisCase.slug} --help\``, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: thisCase.args,
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('it exits 0 and shows each verb or flag', () => {
          expect(result.status).toEqual(0);
          thisCase.shows.map((shown) => expect(result.stdout).toContain(shown));
        });

        then('the help matches its snapshot', () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toMatchSnapshot();
        });
      }),
    );
  });
});
