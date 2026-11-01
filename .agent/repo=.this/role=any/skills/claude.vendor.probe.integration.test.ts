import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { chmodSync, realpathSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = the help, refusal, and report paths of the claude.vendor.probe skill
 * .why = the probe must never bill the api, so the api vars must never reach claude;
 *   and its report must carry the vendor's own text, for an answer and for a refusal
 *
 * .note = a `claude` stub on PATH stands in for the cli, so no call reaches a vendor.
 *   the stub prints which api vars it saw (set or unset) and a sha of the key, never a value
 * .note = `--via keyrack-test` runs against an `npx` stub that hands back a fake key, so the
 *   key path is proven with no real key and no api call
 * .note = an integration test: it spawns bash
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/** the fake key the `npx` stub hands back for `rhx keyrack get` */
const KEY_TEST_FAKE = 'sk-ant-api-keyrack-test-fake';

/** the first 12 hex of a sha256, the form the claude stub prints */
const asShaShort = (input: { value: string }): string =>
  createHash('sha256').update(input.value).digest('hex').slice(0, 12);

type ClaudeStubMode = 'answer' | 'refuse' | 'hang';

/**
 * .what = a `claude` stub that reports the api vars it saw, then answers, refuses, or hangs
 * .why = proves the probe unsets the vars, passes the test key, and relays the vendor text,
 *   with no vendor call. `exec sleep` makes the hung stub the process `timeout` kills, so no
 *   orphan holds the probe's capture open
 */
const genClaudeStub = (input: { mode: ClaudeStubMode }): string => `#!/usr/bin/env bash
is_set() { [[ -n "\${1:-}" ]] && echo set || echo unset; }
echo "saw api_key=$(is_set "\${ANTHROPIC_API_KEY:-}") auth_token=$(is_set "\${ANTHROPIC_AUTH_TOKEN:-}")"
echo "key sha=[$(printf '%s' "\${ANTHROPIC_API_KEY:-}" | sha256sum | cut -c1-12)]"
${
  {
    answer: 'echo ok; exit 0',
    refuse: 'echo "Credit balance is too low" >&2; exit 1',
    hang: 'exec sleep 30',
  }[input.mode]
}
`;

/**
 * .what = an `npx` stub that answers `npx rhx keyrack get` with a fake key, or a locked refusal
 * .why = the keyrack-test path needs a key; a fake one proves the pass with no real secret
 */
const genNpxStub = (input: { mode: 'unlocked' | 'locked' }): string => `#!/usr/bin/env bash
if [[ "$1 $2 $3" == "rhx keyrack get" ]]; then
  ${
    input.mode === 'unlocked'
      ? `echo "${KEY_TEST_FAKE}"; exit 0`
      : 'echo "🔐 keyrack is locked for owner=ehmpath env=test" >&2; exit 2'
  }
fi
echo "npx stub: unexpected call $*" >&2
exit 1
`;

/**
 * .what = run the skill with args, from the repo root
 * .why = the same cwd it has under `rhx`
 *
 * .note = `pathOnly` replaces PATH whole, so no real claude is reachable; bash is spawned by
 *   its absolute path for that case
 */
const runSkill = (input: {
  args: string[];
  stubDir?: string;
  pathOnly?: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const bashBin = spawnSync('bash', ['-c', 'command -v bash'], { encoding: 'utf-8' }).stdout.trim();
  // drop what can define a shell function in the child: an exported bash function
  //   (BASH_FUNC_name%%), or a BASH_ENV file that bash sources at start. a function outranks a
  //   PATH stub, so either would reach a real cli past the stubs
  const envSansFunctions = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith('BASH_FUNC_') && name !== 'BASH_ENV' && name !== 'ENV',
    ),
  );
  const envBase = {
    ...envSansFunctions,
    ANTHROPIC_API_KEY: 'sk-ant-api-fake',
    ANTHROPIC_AUTH_TOKEN: 'sk-ant-auth-fake',
  };
  const env = (() => {
    if (input.pathOnly) return { ...envBase, PATH: input.pathOnly };
    if (input.stubDir) return { ...envBase, PATH: `${input.stubDir}:${process.env.PATH}` };
    return process.env;
  })();
  const result = spawnSync(bashBin, [join(__dirname, 'claude.vendor.probe.sh'), ...input.args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    env,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/**
 * .what = a temp dir that holds a `claude` stub, and an `npx` stub when the case needs one
 * .why = each case puts its own stubs first on PATH
 */
const genStubDir = (input: {
  mode: ClaudeStubMode;
  npx?: 'unlocked' | 'locked';
}): { dir: string } => {
  const dir = realpathSync(
    genTempDir({ slug: `claude-vendor-probe-${input.mode}-${input.npx ?? 'nonpx'}` }),
  );
  writeFileSync(join(dir, 'claude'), genClaudeStub(input));
  chmodSync(join(dir, 'claude'), 0o755);
  if (input.npx) {
    writeFileSync(join(dir, 'npx'), genNpxStub({ mode: input.npx }));
    chmodSync(join(dir, 'npx'), 0o755);
  }
  return { dir };
};

describe('claude.vendor.probe', () => {
  given('[case1] a human asks for help', () => {
    when('[t0] `--help`', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--help'] }));

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it names the usage', () => {
        expect(run.stdout).toContain('rhx claude.vendor.probe --timeout 60');
        expect(run.stdout).toMatchSnapshot();
      });

      then('it names the never-bills guarantee', () => {
        expect(run.stdout).toContain('never bills the api');
      });
    });
  });

  given('[case2] a bad input', () => {
    when('[t0] an unknown flag', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--timeot', '5'] }));

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses the flag by name', () => {
        expect(run.stderr).toContain("✋ ConstraintError: unknown arg '--timeot'");
        expect(run.stderr).toMatchSnapshot();
      });

      then('it names the help', () => {
        expect(run.stderr).toContain('rhx claude.vendor.probe --help');
      });
    });

    when('[t1] a --timeout that is not a whole number', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--timeout', 'soon'] }));

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses before it calls claude', () => {
        expect(run.stdout).toEqual('');
      });

      then('it names the value', () => {
        expect(run.stderr).toContain("--timeout must be a whole number, got 'soon'");
        expect(run.stderr).toMatchSnapshot();
      });

      then('it names the fix', () => {
        expect(run.stderr).toContain('└─ fix\n      └─ rhx claude.vendor.probe --timeout 60');
      });
    });

    when('[t2] a --via that names no credential path', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--via', 'oauth'] }));

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses before it calls claude', () => {
        expect(run.stdout).toEqual('');
      });

      then('it names the valid paths', () => {
        expect(run.stderr).toContain("--via must be login or keyrack-test, got 'oauth'");
        expect(run.stderr).toMatchSnapshot();
      });
    });

    when('[t3] a final --via with no value', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--via'] }));

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the flag that lacks a value', () => {
        expect(run.stderr).toContain('--via needs a value');
        expect(run.stderr).toMatchSnapshot();
      });

      then('it names the fix', () => {
        expect(run.stderr).toContain('└─ fix\n      └─ rhx claude.vendor.probe --via login');
      });
    });
  });

  given('[case3] a claude that answers, with api vars set in the caller env', () => {
    const stub = useBeforeAll(async () => genStubDir({ mode: 'answer' }));

    when('[t0] the probe runs', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--timeout', '20'], stubDir: stub.dir }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('claude saw neither api var', () => {
        expect(run.stdout).toContain('saw api_key=unset auth_token=unset');
      });

      then('no api var value reaches the report', () => {
        expect(run.stdout).not.toContain('sk-ant');
      });

      then('the answer is relayed, inside a quoted block', () => {
        expect(run.stdout).toContain('│  ├─\n   │  │\n');
        expect(run.stdout).toContain('│  │  ok\n');
        expect(run.stdout).toMatchSnapshot();
      });

      then('it reports that claude answered', () => {
        expect(run.stdout).toContain('✨ claude answered');
      });
    });
  });

  given('[case4] a claude that refuses', () => {
    const stub = useBeforeAll(async () => genStubDir({ mode: 'refuse' }));

    when('[t0] the probe runs', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--timeout', '20'], stubDir: stub.dir }),
      );

      then('it exits 1', () => {
        expect(run.status).toEqual(1);
      });

      then('it relays the vendor refusal text', () => {
        expect(run.stdout).toContain('│  │  Credit balance is too low');
        expect(run.stdout).toMatchSnapshot();
      });

      then('it reports that claude refused or failed', () => {
        expect(run.stdout).toContain('💥 claude refused or failed');
      });
    });
  });

  given('[case5] a claude that hangs past the bound', () => {
    const stub = useBeforeAll(async () => genStubDir({ mode: 'hang' }));

    when('[t0] the probe runs with a 1s bound', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--timeout', '1'], stubDir: stub.dir }),
      );

      then('it exits 1', () => {
        expect(run.status).toEqual(1);
      });

      then('it reports the timeout exit', () => {
        expect(run.stdout).toContain('├─ exit = 124');
      });

      then('it names the hang and its bound', () => {
        expect(run.stdout).toContain('💥 no answer in 1s; the cli hung');
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] the test key, from an unlocked keyrack', () => {
    const stub = useBeforeAll(async () => genStubDir({ mode: 'answer', npx: 'unlocked' }));

    when('[t0] the probe runs --via keyrack-test', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--via', 'keyrack-test', '--timeout', '20'], stubDir: stub.dir }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('claude saw the api key, and no auth token', () => {
        expect(run.stdout).toContain('saw api_key=set auth_token=unset');
      });

      then('the key claude saw is the keyrack key, not the caller env key', () => {
        expect(run.stdout).toContain(`key sha=[${asShaShort({ value: KEY_TEST_FAKE })}]`);
      });

      then('no key value reaches the report', () => {
        expect(run.stdout).not.toContain('sk-ant');
        expect(run.stderr).not.toContain('sk-ant');
      });

      then('the header names the credential path', () => {
        expect(run.stdout).toContain('🧪 claude.vendor.probe --via keyrack-test');
        expect(run.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] a locked keyrack', () => {
    const stub = useBeforeAll(async () => genStubDir({ mode: 'answer', npx: 'locked' }));

    when('[t0] the probe runs --via keyrack-test', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--via', 'keyrack-test'], stubDir: stub.dir }),
      );

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses before it calls claude', () => {
        expect(run.stdout).toEqual('');
      });

      then('it names the cause as a ConstraintError', () => {
        expect(run.stderr).toContain(
          '✋ ConstraintError: keyrack could not get ANTHROPIC_API_KEY for env=test',
        );
        expect(run.stderr).toMatchSnapshot();
      });

      then('it relays the keyrack text', () => {
        expect(run.stderr).toContain('keyrack is locked for owner=ehmpath env=test');
      });

      then('it names the unlock', () => {
        expect(run.stderr).toContain('└─ rhx keyrack unlock --owner ehmpath --env test');
      });
    });
  });

  given('[case8] no claude cli on PATH', () => {
    const emptyDir = useBeforeAll(async () => ({
      dir: realpathSync(genTempDir({ slug: 'claude-vendor-probe-noclaude' })),
    }));

    when('[t0] the probe runs', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: [], pathOnly: emptyDir.dir }),
      );

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the absent cli', () => {
        expect(run.stderr).toContain('✋ ConstraintError: no claude cli on PATH');
        expect(run.stderr).toMatchSnapshot();
      });

      then('it names the install', () => {
        expect(run.stderr).toContain('└─ install claude code, then /login');
      });
    });
  });
});
