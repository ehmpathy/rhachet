import { Command } from 'commander';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { invokeEnroll } from './invokeEnroll';

/**
 * .what = drive one `rhx enroll …` invocation in a temp cwd; capture stderr + exit
 * .why =
 *   - enroll's FAIL-LOUD paths (no linked roles, a brain conflict, a bad `--as`)
 *     all throw BEFORE any brain is spawned, so a real drive proves the wire-up
 *     with no child process and no mock
 *   - the happy path (a real spawn) is proven in the blackbox acceptance tier
 *     against a stub brain; here we bound the caller-fault surface
 *
 * .note = the caught error is a HelpfulError, so withCliOutputErrors renders it to
 *   stderr and sets process.exitCode rather than rethrow — the harness reads both
 */
const driveEnroll = async (input: {
  cwd: string;
  argv: string[];
}): Promise<{ err: string; exitCode: number | undefined }> => {
  // .note = deliberate mutation — swap cwd + reset exitCode for the span of the
  //   drive, restore both in the finally; neither escapes driveEnroll
  const cwdBefore = process.cwd();
  const exitBefore = process.exitCode;
  process.chdir(input.cwd);
  process.exitCode = 0;
  try {
    const { err } = await withCapturedStreams({
      run: async () => {
        const program = new Command();
        program.exitOverride();
        invokeEnroll({ program });
        await program.parseAsync(input.argv, { from: 'user' });
      },
    });
    return { err, exitCode: process.exitCode };
  } finally {
    process.chdir(cwdBefore);
    process.exitCode = exitBefore;
  }
};

/**
 * .what = seed a temp repo with one linked role, so the roles-linked guard passes
 * .why = the brain-conflict + `--as` faults live AFTER the roles guard, so they
 *   need a repo whose `.agent/` holds at least one `repo=` / `role=` dir
 */
const seedLinkedRole = (input: { cwd: string }): void => {
  mkdirSync(join(input.cwd, '.agent', 'repo=test', 'role=mechanic'), {
    recursive: true,
  });
};

describe('invokeEnroll (integration)', () => {
  given(
    '[case1] a repo whose `.agent/` exists but holds NO linked roles',
    () => {
      // an empty `.agent/` (link ran, but no role landed) — the "linked but empty"
      // guard, distinct from the never-initialized guard in case1b
      const cwd = genTempDir({ slug: 'invokeEnroll-noroles' });
      mkdirSync(join(cwd, '.agent'), { recursive: true });

      when('[t0] `enroll claude` runs', () => {
        const result = useBeforeAll(async () =>
          driveEnroll({ cwd, argv: ['enroll', 'claude'] }),
        );

        then('it fails loud, names the fix (roles link)', () => {
          expect(result.err).toContain('no roles found in .agent/');
          expect(result.err).toContain('rhachet roles link');
        });

        then('it exits 2 (a caller-setup fault)', () => {
          expect(result.exitCode).toEqual(2);
        });
      });
    },
  );

  given(
    '[case1b] a repo that was never initialized (NO `.agent/` at all)',
    () => {
      // a bare dir — the never-ran-link guard, a more-helpful message than the
      // linked-but-empty guard in case1
      const cwd = genTempDir({ slug: 'invokeEnroll-noagent' });

      when('[t0] `enroll claude` runs', () => {
        const result = useBeforeAll(async () =>
          driveEnroll({ cwd, argv: ['enroll', 'claude'] }),
        );

        then('it fails loud, names the init fix (roles link)', () => {
          expect(result.err).toContain('no .agent/ found');
          expect(result.err).toContain('rhachet roles link');
        });

        then('it exits 2 (a caller-setup fault)', () => {
          expect(result.exitCode).toEqual(2);
        });
      });
    },
  );

  given('[case2] a repo with a linked role', () => {
    const cwd = genTempDir({ slug: 'invokeEnroll-conflict' });
    seedLinkedRole({ cwd });

    when('[t0] a positional brain and --brain DISAGREE', () => {
      const result = useBeforeAll(async () =>
        driveEnroll({
          cwd,
          argv: ['enroll', 'claude', '--brain', 'codex'],
        }),
      );

      then('it fails loud and names both values in conflict', () => {
        expect(result.err).toContain('brain conflict');
        expect(result.err).toContain('claude');
        expect(result.err).toContain('codex');
      });

      then('it exits 2 (caller fault)', () => {
        expect(result.exitCode).toEqual(2);
      });
    });

    when('[t1] the same conflict runs with --output json', () => {
      const result = useBeforeAll(async () =>
        driveEnroll({
          cwd,
          argv: ['enroll', 'claude', '--brain', 'codex', '--output', 'json'],
        }),
      );

      then('the error is machine-parseable json a consumer branches on', () => {
        const parsed = JSON.parse(result.err);
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message).toContain('brain conflict');
      });

      then('it exits 2', () => {
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given('[case3] an `--as` value NOT in the clone address form', () => {
    const cwd = genTempDir({ slug: 'invokeEnroll-as-nomarker' });
    seedLinkedRole({ cwd });

    when('[t0] `enroll claude --as driver` runs (no @: marker)', () => {
      const result = useBeforeAll(async () =>
        driveEnroll({
          cwd,
          argv: ['enroll', 'claude', '--as', 'driver'],
        }),
      );

      then('it fails loud with a did-you-mean for the @: form', () => {
        expect(result.err).toContain('@:driver');
      });

      then('it exits 2 (caller fault)', () => {
        expect(result.exitCode).toEqual(2);
      });
    });
  });

  given('[case4] an `--as @:<slug>` with an unsafe slug', () => {
    const cwd = genTempDir({ slug: 'invokeEnroll-as-unsafe' });
    seedLinkedRole({ cwd });

    when('[t0] `enroll claude --as @:bad/slug` runs (path separator)', () => {
      const result = useBeforeAll(async () =>
        driveEnroll({
          cwd,
          argv: ['enroll', 'claude', '--as', '@:bad/slug'],
        }),
      );

      then('it fails loud, names the safe-handle rule', () => {
        expect(result.err).toContain('not a safe handle');
      });

      then('it exits 2 (caller fault)', () => {
        expect(result.exitCode).toEqual(2);
      });
    });
  });
});
