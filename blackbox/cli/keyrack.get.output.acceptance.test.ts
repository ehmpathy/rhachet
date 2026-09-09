import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack get --output modes', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] key granted via env passthrough', () => {
    const envKey = '__TEST_OUTPUT_GRANTED__';
    const envValue = 'test-secret-value-123';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] --value outputs raw secret', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is raw secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });

      then('stdout has no trailing newline', () => {
        expect(result.stdout.endsWith('\n')).toBe(false);
      });
    });

    when('[t1] --output value is identical to --value', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--output',
            'value',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is raw secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });
    });

    when('[t2] --output json outputs JSON structure', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--output',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is valid JSON', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('JSON contains grant with secret', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual(envValue);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --output vibes outputs treestruct', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--output',
            'vibes',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains keyrack lock emoji', () => {
        expect(result.stdout).toContain('🔐');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] no --output flag defaults to vibes', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains keyrack lock emoji (vibes mode)', () => {
        expect(result.stdout).toContain('🔐');
      });
    });

    when('[t5] --value piped to variable has no extra whitespace', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('stdout equals exact secret value (no whitespace)', () => {
        expect(result.stdout).toEqual(envValue);
        expect(result.stdout.trim()).toEqual(result.stdout);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] key locked (not unlocked)', () => {
    const envKey = '__TEST_OUTPUT_LOCKED__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] --value with locked key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // no env var = key is absent (not locked, since no vault set)
          },
          logOnError: false,
        }),
      );

      then('exits with status 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr contains status message', () => {
        expect(result.stderr.length).toBeGreaterThan(0);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] key absent', () => {
    const envKey = '__TEST_OUTPUT_ABSENT__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] --value with absent key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
          },
          logOnError: false,
        }),
      );

      then('exits with status 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr contains hint', () => {
        const output = result.stderr + result.stdout;
        // should contain some indication of absent/set hint
        expect(output.length).toBeGreaterThan(0);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] validation errors', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - SOME_KEY
`,
      );

      return r;
    });

    when('[t0] --value without --key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--env', 'test', '--value'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits 2 — caller-fixable, not a defect', () => {
        expect(result.status).toEqual(2);
      });

      then('error mentions --value requires --key', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/--value.*requires.*--key/i);
      });

      // ⚠️ THE clamp. every assertion above passed while `get` raw-threw a
      //    `BadRequestError` stack — `not.toEqual(0)` is satisfied by any crash, and a
      //    phrase match by a trace that contains the phrase. this command rendered TWO
      //    error shapes inches apart: its `--reach` guard gave the blocked tree while its
      //    usage guards gave a stack trace (`rule.forbid.surprises`)
      then('the refusal renders as the blocked tree, never a raw class dump', () => {
        const output = result.stderr + result.stdout;
        // keyrack roots on its own lock, never the generic `🐚` shell nor a role mascot
        // (`rule.require.keyrack-emoji-palette`)
        expect(output).toContain('🔐 keyrack get');
        expect(output).toContain('✋ ConstraintError:');
        expect(output).not.toContain('bummer dude');
        expect(output).not.toContain('🐢');
        expect(output).not.toContain('BadRequestError');
        // the DUMP is forbidden, never the CLASS at the node — told apart by COLUMN, not by
        // the token. a bare word ban forbids the class anywhere, which is the regression
        // itself encoded as a clamp (`rule.require.unabridged-error-prefix`)
        expect(output).not.toMatch(/^✋ ConstraintError:/m);
        expect(output).not.toContain('[args]');
      });

      then('the refusal names the fix', () => {
        const output = result.stderr + result.stdout;
        expect(output).toContain('hint:');
        expect(output).toContain('--key');
      });
    });

    when('[t1] --for repo with --value', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--value'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits 2 — caller-fixable, not a defect', () => {
        expect(result.status).toEqual(2);
      });

      then('error mentions --value requires --key', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/--value.*requires.*--key/i);
      });

      // .note = the second of `get`'s usage refusals, clamped for the same reason. both
      //         are far likelier to be hit than any vault-level fault — they are what a
      //         human meets the first time they type the command from memory
      then('the refusal renders as the blocked tree, never a raw class dump', () => {
        const output = result.stderr + result.stdout;
        expect(output).toContain('🔐 keyrack get');
        expect(output).toContain('✋ ConstraintError:');
        expect(output).not.toContain('bummer dude');
        expect(output).not.toContain('🐢');
        expect(output).not.toContain('BadRequestError');
        // the DUMP is forbidden, never the CLASS at the node — told apart by COLUMN, not by
        // the token. a bare word ban forbids the class anywhere, which is the regression
        // itself encoded as a clamp (`rule.require.unabridged-error-prefix`)
        expect(output).not.toMatch(/^✋ ConstraintError:/m);
        expect(output).not.toContain('[args]');
      });
    });
  });

  given('[case8] --output names a mode that does not exist', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - SOME_KEY
`,
      );
      return r;
    });

    // ⚠️ .why = a SILENT WRONG ANSWER, clamped at the contract grain a human actually meets.
    //        commander declares `--output <mode>` with no `.choices()`, and the render switch
    //        ends `case 'vibes': default:` — so a typo'd `--output josn` rendered VIBES at
    //        EXIT 0. the human asked for machine-parseable json and got prose, and a `| jq`
    //        downstream then parses that prose
    // ⚠️ .why.acceptance = the unit clamp on `asKeyrackGetOutputMode` pins the decision; only a
    //        row HERE pins that the decision reaches the binary a human runs. an unrun refusal
    //        is indistinguishable from an absent one
    when('[t0] --output is misspelled', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            'SOME_KEY',
            '--env',
            'test',
            '--output',
            'josn',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      // ⚠️ THE clamp. every OTHER assertion here is satisfied by a silent substitution too — a
      //    run that exits 0 and renders the vibes tree. only the EXIT CODE separates "refused"
      //    from "silently rendered prose"
      then('exits 2 — never 0 with a silently-substituted render', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the value at fault AND the valid set', () => {
        const output = result.stderr + result.stdout;
        expect(output).toContain('invalid --output');
        expect(output).toContain('josn');
        expect(output).toContain('value, json, vibes');
      });

      then('it renders as the blocked tree, never a raw class dump', () => {
        const output = result.stderr + result.stdout;
        expect(output).toContain('🔐 keyrack get');
        expect(output).toContain('✋ ConstraintError:');
        // the DUMP is forbidden, never the CLASS at the node — told apart by COLUMN, not by
        // the token. a bare word ban forbids the class anywhere, which is the regression
        // itself encoded as a clamp (`rule.require.unabridged-error-prefix`)
        expect(output).not.toMatch(/^✋ ConstraintError:/m);
        expect(output).not.toContain('[args]');
        expect(output).not.toContain('🐢');
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr + result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] --output names a REAL mode', () => {
      // .why = the opposite direction, and it is what keeps the guard from a shape written too
      //        wide. a refusal that also rejected `json` would pass every row above
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            'SOME_KEY',
            '--env',
            'test',
            '--output',
            'json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path, SOME_KEY: 'a-real-value' },
          logOnError: false,
        }),
      );

      then('it is accepted, and the render IS json', () => {
        expect(result.status).toEqual(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      // ⚠️ .why = the ACCEPTED direction, snapped beside the refusal [t0] snaps. this case is a
      //    two-direction clamp, and a reader takes a pair by its two renders — one row that
      //    shows the refusal and one that says only "it parsed" leaves the pair half-visible.
      //    `[case1][t2]` snaps this same render, so what this row adds is ADJACENCY: the two
      //    directions sit together in the snap file, where a drift between them reads as a diff
      //    (`rule.require.acceptance-journey-coverage`)
      // ⚠️ .why.masked = the fixture seeds `SOME_KEY`, so an accepted `--output json` carries the
      //    credential in its payload. the value is replaced and the field kept — the shape and
      //    position are the fact a reviewer came for, and a credential-shaped literal in a
      //    committed snapshot teaches the next author that a snapped secret is normal
      then('the accepted render matches snapshot', () => {
        expect(
          asSnapshotSafe(result.stdout).split('a-real-value').join('$SECRET'),
        ).toMatchSnapshot();
      });
    });
  });

  /**
   * ⚠️ .why = THE PIPE CLAMP. `--value` exists to be PIPED — it is the credential-helper mode,
   *        and its whole contract is a bare secret on stdout for a `$(…)` or a downstream reader.
   *        so a consumer that closes early is a NORMAL event on this path, not an exotic one:
   *        `| head -c 40` to peek, a reader that exits, a shell that stops its read
   *
   * ⚠️ .why.defect = it CRASHED. the raw `process.stdout.write` had no `error` listener, so node
   *        emitted an unhandled async `error` on the socket and dumped `Error: write EPIPE` with
   *        a full node stack and the absolute repo path — the one render
   *        `rule.require.errors-name-the-fix` forbids a human to be shown as the only output
   *
   * .note = every OTHER keyrack render goes through `console.log`, which node documents as a
   *         swallow of write errors — verified: `keyrack list | head -1` exits clean both before
   *         and after. so the guard is scoped to the one raw write that needed it
   */
  given('[case9] --value is piped to a consumer that closes early', () => {
    const envKey = '__TEST_OUTPUT_EPIPE__';
    const envValue = 'a-secret-long-enough-to-outlive-a-closed-pipe';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );
      return r;
    });

    when('[t0] the reader closes the pipe before the secret is read', () => {
      const result = useBeforeAll(async () => {
        // ⚠️ `set -o pipefail` is what gives this row teeth. WITHOUT it the pipeline reports
        //    `head`'s exit (always 0), so the row would pass even while keyrack crashed — a
        //    clamp that verifies the consumer rather than its subject (`rule.forbid.failhide`)
        const binPath = join(__dirname, '..', '..', 'bin', 'rhx');
        return spawnSync(
          'bash',
          [
            '-c',
            `set -o pipefail; "${binPath}" keyrack get --key ${envKey} --env test --value | head -c 0`,
          ],
          {
            cwd: repo.path,
            encoding: 'utf-8',
            env: { ...process.env, HOME: repo.path, [envKey]: envValue },
          },
        );
      });

      then('keyrack exits 0 — a closed pipe is normal, the way `yes | head` is', () => {
        expect(result.status).toEqual(0);
      });

      then('no raw node stack trace reaches a human', () => {
        // each of the three is a distinct fingerprint of the crash, so a partial
        // regression cannot slip past one of them
        expect(result.stderr).not.toContain('EPIPE');
        expect(result.stderr).not.toContain('Unhandled');
        expect(result.stderr).not.toContain('node:events');
      });

      then('the secret is never echoed to stderr by the failure path', () => {
        // ⚠️ the safety row. a crash render that carried the queued write would put a live
        //    credential into a terminal, a scrollback, and any ci log that keeps stderr
        expect(result.stderr).not.toContain(envValue);
      });

      then('both streams match snapshot', () => {
        // ⚠️ .why = the three `not.toContain` rows above each name ONE fingerprint of the
        //    crash, so together they prove the absence of three known strings — never that
        //    the render is SILENT. a regression that dumps a differently-worded diagnostic
        //    (a `write EPIPE` with no stack, a bare `Error:`) satisfies all three and still
        //    shows a human noise on a path whose contract is a bare secret and no more.
        //    the snapshot is what pins the whole surface rather than three points on it
        //    (`rule.require.contract-snapshot-exhaustiveness`)
        // .note = no mask is needed: `head -c 0` reads zero bytes, so the secret cannot
        //    reach either stream and both renders are byte-stable across every host
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the reader takes the whole value — the guard row', () => {
      // ⚠️ written too wide, an `error` listener that exits could swallow a REAL write and
      //    hand back an empty secret at exit 0 — a silent wrong answer strictly worse than
      //    the crash it replaced. this row pins that the common path is untouched
      const result = useBeforeAll(async () => {
        const binPath = join(__dirname, '..', '..', 'bin', 'rhx');
        return spawnSync(
          'bash',
          [
            '-c',
            `set -o pipefail; "${binPath}" keyrack get --key ${envKey} --env test --value | cat`,
          ],
          {
            cwd: repo.path,
            encoding: 'utf-8',
            env: { ...process.env, HOME: repo.path, [envKey]: envValue },
          },
        );
      });

      then('exits 0 and delivers the WHOLE secret, byte for byte', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(envValue);
      });

      then('both streams match snapshot', () => {
        // ⚠️ .why = the row above pins the secret's BYTES; this pins the streams' SHAPE.
        //    the two are different guarantees: `toEqual` says stdout holds the right value
        //    and makes no claim about stderr, so a regression that delivers the secret AND
        //    writes a deprecation line or a daemon notice to stderr passes it untouched.
        //    on the credential-helper path that noise is the defect — the mode exists to be
        //    consumed by a script (`rule.require.contract-snapshot-exhaustiveness`)
        // ⚠️ .why.masked = the secret is REPLACED, never rendered. it is synthetic here, but
        //    a snapshot is a committed, human-read artifact, and a credential-shaped literal
        //    in one teaches the next author that a snapped secret is normal. the mask keeps
        //    the shape legible — a bare `$SECRET` with no trailing byte is exactly the
        //    contract, and a stray newline or banner would still surface as a diff
        expect({
          stdout: asSnapshotSafe(result.stdout).split(envValue).join('$SECRET'),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case5] secret with special characters', () => {
    const envKey = '__TEST_OUTPUT_SPECIAL__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] newlines preserved in --value output', () => {
      const multilineSecret = 'line1\nline2\nline3';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: multilineSecret,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('newlines are preserved', () => {
        expect(result.stdout).toEqual(multilineSecret);
        expect(result.stdout).toContain('\n');
      });
    });

    when('[t1] single quotes in --value output', () => {
      const quotedSecret = "it's a test's secret";

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: quotedSecret,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('quotes are preserved', () => {
        expect(result.stdout).toEqual(quotedSecret);
      });
    });
  });

  given('[case6] --unlock opt-in flows through the built binary', () => {
    const envKey = '__TEST_OUTPUT_UNLOCK__';
    const envValue = 'unlock-opt-in-value-cli';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      return r;
    });

    // note: acceptance keys are env-backed, so a true vault unlock is
    // unobservable here — this case proves the built binary ACCEPTS --unlock
    // and still returns the granted secret, not a genuine vault unlock
    when('[t0] --unlock on an env-backed available key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--unlock',
            '--value',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0 (opt-in does not break an available get)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is raw secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });
    });
  });

  /**
   * [case7] CLI get --env camp
   * proves the CLI get single-key path (getOneKeyrackGrantByKey → isValidKeyrackEnv)
   * accepts camp and grants the camp-tagged key. the cli twin of the SDK get camp case,
   * so the two sides of the get parity are held together.
   */
  given('[case7] key granted via env passthrough, --env camp', () => {
    const envKey = '__TEST_OUTPUT_CAMP_GRANTED__';
    const envValue = 'camp-secret-value-123';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.camp:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] get --key --env camp --value', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'camp', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0 (camp is accepted, not rejected)', () => {
        expect(result.status).toEqual(0);
      });

      then('output does not reject camp as an invalid env', () => {
        expect(result.stderr).not.toContain('invalid --env');
      });

      then('stdout is the raw camp secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });
    });

    when('[t1] get --key --env camp --output json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'camp',
            '--output',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('json carries the camp-tagged slug', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual(`testorg.camp.${envKey}`);
        expect(parsed.grant.env).toEqual('camp');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
