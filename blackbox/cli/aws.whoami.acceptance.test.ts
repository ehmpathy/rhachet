import { type SpawnSyncReturns, spawnSync } from 'node:child_process';
import { chmodSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = blackbox acceptance for the `aws.whoami` developer skill's full user-facing surface — the
 *   positive path (a successful identity read) plus the two fail-loud paths a human hits (a missing
 *   --env, and a keyrack that returns an empty AWS_PROFILE). each is spawned as a real subprocess
 *   and its stdout/stderr is snapped.
 *
 * .why = the skill is user-facing and was modified in this feature's diff (it now fails loud on an
 *   empty AWS_PROFILE instead of handing `aws sts` an empty profile, and invokes `npx rhx` per
 *   rule.forbid.node-modules-bin-rhx). per rule.require.contract-snapshot-exhaustiveness every
 *   output variant — positive AND negative — is snapped so a future wording change is caught, not
 *   silent.
 *
 * .backend = the skill invokes `npx rhx keyrack ...` and then `aws sts get-caller-identity`. a fake
 *   `npx` on PATH intercepts the whole `npx rhx keyrack unlock|get` chain (unlock a no-op, get a
 *   canned profile) and a fake `aws` on PATH returns a canned identity — a backend SWAP at the PATH
 *   seam, so the skill's own branch logic runs verbatim with no real keyrack/AWS. the
 *   missing-`--env` path needs no backend at all (it exits before any npx call).
 */
const SKILL_PATH = resolve(
  __dirname,
  '../../.agent/repo=.this/role=any/skills/aws.whoami.sh',
);

// write an executable fake binary into dir/name with the given bash body
const genFakeBin = (input: {
  dir: string;
  name: string;
  body: string[];
}): void => {
  const path = `${input.dir}/${input.name}`;
  writeFileSync(
    path,
    ['#!/usr/bin/env bash', ...input.body, ''].join('\n'),
    'utf-8',
  );
  chmodSync(path, 0o755);
};

// a fake `npx` that intercepts `npx rhx keyrack unlock|get`: unlock is a no-op success, get prints
// the given profile value ('' for the empty-profile case). args: $1=rhx $2=keyrack $3=unlock|get
const genFakeNpx = (input: { dir: string; profile: string }): void =>
  genFakeBin({
    dir: input.dir,
    name: 'npx',
    body: [
      'case "$3" in',
      '  unlock) exit 0 ;;',
      `  get) printf '%s' '${input.profile}' ; exit 0 ;;`,
      '  *) exit 0 ;;',
      'esac',
    ],
  });

// on this host, a non-interactive bash reads a startup file (named by $BASH_ENV) that defines an
// `npx` FUNCTION which runs `./node_modules/.bin/<cmd>` directly — it skips PATH, so a fake `npx`
// on PATH is never reached and the skill hits the REAL keyrack. strip BASH_ENV/ENV (and any
// exported BASH_FUNC_* function) so the child bash reads no startup file, falls back to a PATH
// lookup, and hits the fakes
const genCleanEnv = (input: { dir: string }): NodeJS.ProcessEnv => ({
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !k.startsWith('BASH_FUNC_') && k !== 'BASH_ENV' && k !== 'ENV',
    ),
  ),
  PATH: `${input.dir}:${process.env.PATH}`,
});

// spawn the skill with the fake bin dir first on PATH and no startup file, so the PATH fakes
// intercept `npx rhx keyrack ...` and `aws sts ...` with no real keyrack/AWS
const runSkillWithFakes = (input: {
  dir: string;
}): SpawnSyncReturns<string> =>
  spawnSync('bash', [SKILL_PATH, '--env', 'test'], {
    env: genCleanEnv({ dir: input.dir }),
    encoding: 'utf-8',
  });

describe('aws.whoami skill surface', () => {
  given('[case1] invoked with no --env', () => {
    when('[t0] the skill runs with no arguments', () => {
      const result = useBeforeAll(async () =>
        spawnSync('bash', [SKILL_PATH], { encoding: 'utf-8' }),
      );

      then('it exits 2 (a caller-fixable usage error)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr names the usage', () => {
        expect(result.stderr).toContain('usage: aws.whoami --env');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr.trim()).toMatchSnapshot();
      });
    });
  });

  given('[case2] keyrack returns an empty AWS_PROFILE', () => {
    // a fake `npx` on PATH: `keyrack unlock` is a no-op success, `keyrack get` prints an empty
    // value — so the skill reaches its empty-profile guard deterministically, with no real backend
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'aws-whoami-empty-profile' });
      genFakeNpx({ dir, profile: '' });
      return { dir };
    });

    when('[t0] the skill runs with --env test', () => {
      const result = useBeforeAll(async () =>
        runSkillWithFakes({ dir: scene.dir }),
      );

      then('it exits 2 (unlock the session — a caller-fixable constraint)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr names the empty-profile failure and the fix', () => {
        expect(result.stderr).toContain(
          'keyrack returned no AWS_PROFILE for env=test',
        );
        expect(result.stderr).toContain('unlock the session first');
      });

      then('it never reached aws sts (no identity output on stdout)', () => {
        expect(result.stdout).not.toContain('UserId');
        expect(result.stdout).not.toContain('Arn');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr.trim()).toMatchSnapshot();
      });
    });
  });

  given('[case3] keyrack returns a profile and aws returns an identity', () => {
    // both fakes on PATH: `npx rhx keyrack get` prints a profile, and `aws sts get-caller-identity`
    // prints a canned identity — so the skill's happy path runs end-to-end with no real backend
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'aws-whoami-identity' });
      genFakeNpx({ dir, profile: 'ehmpath-test' });
      // a fake `aws` that answers `aws sts get-caller-identity` with a deterministic identity
      genFakeBin({
        dir,
        name: 'aws',
        body: [
          "cat <<'EOF'",
          '{',
          '    "UserId": "AIDAEXAMPLEUSERID",',
          '    "Account": "123456789012",',
          '    "Arn": "arn:aws:iam::123456789012:role/ehmpath-test"',
          '}',
          'EOF',
        ],
      });
      return { dir };
    });

    when('[t0] the skill runs with --env test', () => {
      const result = useBeforeAll(async () =>
        runSkillWithFakes({ dir: scene.dir }),
      );

      then('it exits 0 (identity retrieved)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout carries the caller identity', () => {
        expect(result.stdout).toContain('UserId');
        expect(result.stdout).toContain(
          'arn:aws:iam::123456789012:role/ehmpath-test',
        );
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout.trim()).toMatchSnapshot();
      });
    });
  });
});
