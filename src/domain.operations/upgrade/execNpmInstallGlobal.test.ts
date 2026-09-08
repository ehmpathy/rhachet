import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { HOST_SPECIFIC_SHELL_TOKENS } from '@src/.test/assets/hostSpecificShellTokens';
import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';

import type { NpmInstallFailureKind } from './asNpmInstallFailureKind';
import type { execNpmInstall, NpmInstallOutcome } from './execNpmInstall';
import { execNpmInstallGlobal } from './execNpmInstallGlobal';
import { asProbeTimeoutWords, type PnpmPresenceRead } from './getPnpmPresence';

/**
 * 🚨 ZERO mocks. this file used to `jest.mock('node:child_process')` and script a spawn
 *   queue two calls deep — a probe, then an install — so every row was checked against the
 *   mock's own record and a real `spawnSync` misuse stayed green
 *   (`rule.forbid.unit.remote-boundaries`).
 *
 *   `execNpmInstallGlobal` owns exactly two decisions: what to DO with the probe's answer,
 *   and the `{ upgraded }` shape it returns. both composed parts are injected as typed
 *   fakes, so each row states a claim about THIS operation rather than about the whole
 *   stack beneath it.
 *
 * .note = the properties that left with the mock did not go unowned. each moved to the
 *   operation that decides it, where it is now clamped with no boundary crossed:
 *     · the arg vector (`add -g` / `install -g`, the hook flag) → `execNpmInstall.test.ts`
 *     · the shell + timeout + cwd options    → `asNpmInstallSpawnOptions.test.ts`
 *     · a structural death (timeout / crash) → `execNpmInstall.test.ts` `[case4]`
 *     · bytes → kind                         → `asNpmInstallFailureKind.test.ts`
 *     · kind  → report                       → `asNpmInstallFailureError.test.ts`
 */

/**
 * .what = the role-mascot glyphs a rhachet-generic line must never wear
 *
 * .why  = `rhx upgrade` is rhachet's OWN cli, and `rule.prefer.emoji-language` forbids a
 *   rhachet-generic line that wears a role-mascot.
 *
 * 🚨 .note = the four are the rule's OWN enumeration, and THIS LIST IS A COPY whose decay is
 *   SILENT — the owner is prose in a brief, so a mascot the rule adopts LATER stays GREEN
 *   here. a stale literal REDDENS a positive assertion and SILENCES a negative one.
 *
 *   ✅ hence the row below also asserts the POSITIVE `⚠️`, the neutral callout slot, which
 *   goes red the moment the glyph moves.
 */
const ROLE_MASCOT_GLYPHS = ['🐢', '🦉', '🌙', '🐚'] as const;

/**
 * .what = the structured facts an install failure carries, read off its metadata
 *
 * .why  = the install throws the shared `ConstraintError` / `MalfunctionError` vocabulary,
 *   so these facts live in metadata rather than on a bespoke class
 *
 * .note = the field is `installExitCode`, matched to the metadata key: the PACKAGE MANAGER's
 *   exit and the PROCESS's `.code.exit` disagree, and this file asserts BOTH
 *   (`rule.forbid.ambiguous-labels`)
 */
const asInstallFailureFacts = (
  error: unknown,
): {
  kind: string | undefined;
  installExitCode: number | undefined;
  output: string | undefined;
  hint: string | undefined;
} => {
  const metadata = (error as { metadata?: Record<string, unknown> }).metadata;
  return {
    kind: metadata?.kind as string | undefined,
    installExitCode: metadata?.installExitCode as number | undefined,
    output: metadata?.output as string | undefined,
    hint: metadata?.hint as string | undefined,
  };
};

/**
 * .what = the SENTENCE half of the report — what broke, with the metadata blob stripped
 *
 * .why  = 🚨 the raw `error.message` APPENDS the serialized metadata, so any assertion
 *   against it matches a string that carries `kind`, `output`, AND `hint` whether or not
 *   a renderer ever shows them — a clamp that cannot fail
 *   (`rule.require.clamp-edge-cases`). this is the string `execUpgrade` actually prints.
 *
 * .note = the report is TWO fields with two owners — this reads the sentence; the hint
 *   is read off `asInstallFailureFacts(...).hint`. a sentence must never carry its own
 *   hint again: `asCliErrorFrame` appends the hint on the local path
 */
const asFailureSentence = (error: unknown): string =>
  (error as MalfunctionError).redact(['metadata']).message;

/**
 * .what = a pnpm-presence probe that answers one scripted read, with no process spawned
 *
 * ⚠️ typed as the producer's own return, never a hand-rolled shape — a stand-in the producer
 *   cannot emit would let this suite pass against a contract that does not exist
 */
const genProbeThatAnswers =
  (answer: PnpmPresenceRead): (() => PnpmPresenceRead) =>
  () =>
    answer;

/**
 * .what = an install stand-in that answers a scripted outcome and records what it was handed
 *
 * .why  = the handoff is the subject of half these rows — which package manager, which
 *   target, which packages, which hook policy, which directory — so the fake captures rather
 *   than asserts, and each row reads the capture to state its own claim.
 *
 * ⚠️ typed as `typeof execNpmInstall`, for the same reason as the probe above
 */
const genInstallThatAnswers = (
  answer: NpmInstallOutcome,
): {
  install: typeof execNpmInstall;
  getTaken: () => Parameters<typeof execNpmInstall>[0];
} => {
  // .note = deliberate mutation — a local capture of the one call, never escapes this closure
  let taken: Parameters<typeof execNpmInstall>[0] | null = null;
  return {
    install: (input) => {
      taken = input;
      return answer;
    },
    getTaken: () => {
      if (taken === null)
        throw new Error('the install was never called at all');
      return taken;
    },
  };
};

/**
 * .what = an outcome shaped for one classified cause
 * .why  = every failure row differs ONLY in the kind and the bytes, so the rest of the shape
 *   is written once. `shellPresence: 'absent'` is an input rather than an ambient read, so
 *   these rows run identically on every host that runs the suite
 */
const asOutcome = (input: {
  kind: NpmInstallFailureKind | null;
  exitCode: number | null;
  output: string;
}): NpmInstallOutcome => ({ ...input, shellPresence: 'absent' });

const OUTCOME_CLEAN = asOutcome({
  kind: null,
  exitCode: 0,
  output: 'Packages: +1',
});

/** .what = runs the operation with both seams driven, and captures what reached the screen */
const runGlobalInstall = async (input: {
  packages: string[];
  presence: PnpmPresenceRead;
  outcome: NpmInstallOutcome;
}): Promise<{
  out: string;
  result: { upgraded: boolean };
  taken: Parameters<typeof execNpmInstall>[0];
}> => {
  const fake = genInstallThatAnswers(input.outcome);
  const captured = await withCapturedStreams({
    run: () =>
      execNpmInstallGlobal(
        { packages: input.packages },
        {
          probe: genProbeThatAnswers(input.presence),
          install: fake.install,
        },
      ),
  });
  return { out: captured.out, result: captured.result, taken: fake.getTaken() };
};

/** .what = runs the operation and hands back whatever it threw, never the throw itself */
const getThrownFrom = async (input: {
  presence: PnpmPresenceRead;
  outcome: NpmInstallOutcome;
}): Promise<Error> => {
  try {
    await runGlobalInstall({ packages: ['rhachet'], ...input });
  } catch (caught) {
    return caught as Error;
  }
  throw new Error('it returned where a throw was expected');
};

describe('execNpmInstallGlobal', () => {
  given('[case1] the probe reports pnpm PRESENT', () => {
    when('[t0] the install succeeds', () => {
      then('pnpm is what the install is asked to run', async () => {
        const run = await runGlobalInstall({
          packages: ['rhachet'],
          presence: 'present',
          outcome: OUTCOME_CLEAN,
        });

        expect(run.result).toEqual({ upgraded: true });
        expect(run.taken.packageManager).toEqual('pnpm');
        expect(run.taken.target).toEqual('global');
      });

      then('the hooks are asked to RUN, never skipped', async () => {
        // 🚨 the asymmetry with the local target is a DECLARED position, not an oversight:
        //   a global install is the human's own store, so their package manager's build
        //   gate — and their allowlist — is the authority on which hooks run. the local
        //   path opts out; this one must not.
        //   .the mutation that reddens this: pass `'skip'`, which is exactly the defect
        //   that left node-pty unbuilt on the local path
        const run = await runGlobalInstall({
          packages: ['rhachet'],
          presence: 'present',
          outcome: OUTCOME_CLEAN,
        });
        expect(run.taken.lifecycleHooks).toEqual('run');
      });

      then(
        'it runs where THIS process runs — no directory invented',
        async () => {
          // 🚨 a global install belongs to no project, so it has no directory to name. a
          //   cure that substituted `process.cwd()` would install a global package against
          //   whichever project tree the human happened to stand in
          const run = await runGlobalInstall({
            packages: ['rhachet'],
            presence: 'present',
            outcome: OUTCOME_CLEAN,
          });
          expect(run.taken.cwd).toBeNull();
        },
      );
    });

    when('[t1] several packages are named', () => {
      then('every one is pinned to @latest, in order', async () => {
        const run = await runGlobalInstall({
          packages: ['rhachet', 'another-pkg'],
          presence: 'present',
          outcome: OUTCOME_CLEAN,
        });
        expect(run.taken.packagesLatest).toEqual([
          'rhachet@latest',
          'another-pkg@latest',
        ]);
      });
    });
  });

  given('[case2] the probe reports pnpm ABSENT', () => {
    when('[t0] the install succeeds', () => {
      then('npm is what the install is asked to run', async () => {
        const run = await runGlobalInstall({
          packages: ['rhachet'],
          presence: 'absent',
          outcome: OUTCOME_CLEAN,
        });

        expect(run.result).toEqual({ upgraded: true });
        expect(run.taken.packageManager).toEqual('npm');
      });

      then(
        'the human is told NOT ONE WORD — an absent pnpm is ordinary',
        async () => {
          // 🚨 the complement that makes `[case3]`'s notice mean what it claims. the two ways
          //   to reach npm are not the same event: *"you have no pnpm"* is unremarkable, and
          //   a notice here would cry wolf on the common case until the real one is ignored.
          //   .the mutation that reddens this: print the wedge notice on every npm fallback
          const run = await runGlobalInstall({
            packages: ['rhachet'],
            presence: 'absent',
            outcome: OUTCOME_CLEAN,
          });
          expect(run.out).not.toContain(
            'could not tell whether pnpm is installed',
          );
        },
      );
    });
  });

  given('[case3] the probe COULD NOT ANSWER — the third state', () => {
    // 🚨 the caller's duty on the third state: SURFACE the wedge, never swallow it into
    //   the npm fallback. .the mutation that reddens these rows: delete the
    //   `presence === 'unreadable'` block — npm still installs, and the human learns
    //   naught (`rule.forbid.failhide`)
    const runUnreadable = async (): Promise<{
      out: string;
      result: { upgraded: boolean };
      taken: Parameters<typeof execNpmInstall>[0];
    }> =>
      runGlobalInstall({
        packages: ['rhachet'],
        presence: 'unreadable',
        outcome: OUTCOME_CLEAN,
      });

    when('[t0] the upgrade proceeds anyway', () => {
      then(
        'it falls back to npm, and SAYS SO rather than swallow it',
        async () => {
          const run = await runUnreadable();

          // the upgrade still happens — a wedged probe is no reason to refuse an install
          // npm can perform
          expect(run.result).toEqual({ upgraded: true });
          expect(run.taken.packageManager).toEqual('npm');

          // 🚨 and the human READS about it — the wedge is announced, never swallowed
          expect(run.out).toContain('could not tell whether pnpm is installed');

          // the probe is named by PURPOSE, never by its command. the notice reaches win32
          // too, and a named command in it has been wrong there before
          // (`rule.forbid.host-specific-cures-in-hints`)
          expect(run.out).toContain('pnpm-presence probe');
        },
      );

      then('the bound it QUOTES is the bound the probe holds', async () => {
        // 🚨 DERIVED, never a literal — a widened bound makes production say `30s`, and a
        //   literal `10s` here would go red rather than follow it.
        //
        // .note = that the quoted bound is the bound the probe actually SPENDS is a
        //   two-link claim, and each link is clamped where it lives with no mock:
        //   `asProbeTimeoutWords` derives from `PROBE_TIMEOUT_MS`, and
        //   `asPnpmVersionProbeCommand.test.ts` asserts the probe command carries that same
        //   constant. this row owns only the third link — that the notice quotes it
        expect((await runUnreadable()).out).toContain(
          `within ${asProbeTimeoutWords()}`,
        );
      });

      then('the notice names NO host-specific shell command', async () => {
        // 🚨 this notice reaches win32, where cmd.exe wants `%PATH%` and powershell
        //   `$env:PATH`, so no POSIX-only cure may appear in it
        //   (`rule.forbid.host-specific-cures-in-hints`)
        const run = await runUnreadable();

        // assert the notice is PRESENT before its content is judged — else a
        // VANISHED notice would satisfy every negative below
        expect(run.out).toContain('could not tell whether pnpm is installed');

        HOST_SPECIFIC_SHELL_TOKENS.forEach((token) =>
          expect(run.out).not.toContain(token),
        );

        // and it still names the datum, so the cure was made portable rather than
        // merely deleted — a hint stripped to silence would pass the negatives alone
        expect(run.out).toContain('PATH environment variable');
      });

      then(
        'the notice speaks in rhachet\u2019s voice, never a role mascot',
        async () => {
          // see `ROLE_MASCOT_GLYPHS` above for the bound the negative half carries
          const run = await runUnreadable();

          // ✅ the POSITIVE half — the neutral callout slot is occupied. a swap back to a
          //   mascot both adds a forbidden glyph AND removes this one, and this line needs
          //   no list at all
          expect(run.out).toContain('⚠️');

          // ⛔ the negative half — no mascot the rule names may appear.
          //
          //   🚨 ASSERTIONS IN ONE ROW SHADOW EACH OTHER: jest aborts a row at its first
          //     failed expect, so a naive `🐢`-for-`⚠️` swap reddens the `toContain('⚠️')`
          //     line above and never reaches this one. to claim N assertions bite, run N
          //     mutations, each shaped to leave the earlier ones green
          ROLE_MASCOT_GLYPHS.forEach((glyph) =>
            expect(run.out).not.toContain(glyph),
          );
        },
      );
    });
  });

  given(
    '[case4] the install reports a cause this operation must not absolve',
    () => {
      // 🚨 THE SEAM CLAMP. the producer emits `global install failed with exit code 1` for
      //   EVERY nonzero exit, so a row that asserts that message alone stays green while
      //   the consumer's structured read goes dead. the rows below pin the CLASS and the
      //   FIELD.
      //
      // ⚠️ the kind arrives as DATA rather than as bytes to classify — the bytes→kind step
      //   is `asNpmInstallFailureKind`'s, clamped in its own file. what this operation owns
      //   is what it DOES with a kind, and that is what these rows read
      when('[t0] a permission wall', () => {
        then(
          'it is the CALLER\u2019s to amend — a constraint, exit 2',
          async () => {
            const error = await getThrownFrom({
              presence: 'present',
              outcome: asOutcome({
                kind: 'permission-denied',
                exitCode: 1,
                output: 'ERR_PNPM_EACCES  EACCES: permission denied',
              }),
            });

            // 🚨 a CONSTRAINT, never a bespoke class — the class IS the exit code. a
            //   permission wall is the caller's to fix, so `getExitCodeFromError` reads 2
            //   off it. .the mutation that reddens this: throw a bare HelpfulError, which
            //   has no `.code.exit`
            expect(error).toBeInstanceOf(ConstraintError);
            expect(
              (error as unknown as { code: { exit: number } }).code.exit,
            ).toEqual(2);

            const facts = asInstallFailureFacts(error);
            expect(facts.kind).toEqual('permission-denied');
            expect(facts.installExitCode).toEqual(1);

            // the raw output is carried, so a report can quote what happened
            expect(facts.output).toContain('EACCES');

            // the human-faced report names the fix (`rule.require.errors-name-the-fix`),
            // and each half is asserted against the FIELD that owns it — a read of the raw
            // `error.message` matches a hint no renderer ever prints
            // (`rule.require.clamp-edge-cases`)
            expect(asFailureSentence(error)).toContain('permission denied');
            expect(facts.hint).toContain('retry with elevated permissions');
          },
        );

        then('the GLOBAL target is what the report names', async () => {
          // .why = the two targets share one error builder, and the target is data it
          //   forwards. a local/global mix-up would send a human to the wrong tree
          const error = await getThrownFrom({
            presence: 'present',
            outcome: asOutcome({
              kind: 'permission-denied',
              exitCode: 1,
              output: 'EACCES: permission denied',
            }),
          });
          expect(asFailureSentence(error)).toContain('global');
        });
      });

      when('[t1] an exit we cannot place', () => {
        then(
          'it is OURS until proven otherwise — a malfunction, exit 1',
          async () => {
            // .why = the guard row. an exit we cannot classify is reported AS unplaced,
            //   never folded into whichever cause reads closest
            const error = await getThrownFrom({
              presence: 'present',
              outcome: asOutcome({
                kind: 'unclassified',
                exitCode: 1,
                output: 'some failure we have never seen before',
              }),
            });

            // 🚨 a MALFUNCTION, never a constraint — the class IS the exit code. an exit we
            //   could not place is OURS until proven otherwise, so it must exit 1. .the
            //   mutation that reddens this: return a ConstraintError, which exits 2 and
            //   tells a human "you can fix this" over a cause nobody has named
            expect(error).toBeInstanceOf(MalfunctionError);
            expect(
              (error as unknown as { code: { exit: number } }).code.exit,
            ).toEqual(1);

            expect(asInstallFailureFacts(error).kind).toEqual('unclassified');

            // the SENTENCE states the uncertainty rather than name a cause it did not find
            expect(asFailureSentence(error)).toContain('cause unclassified');

            // and the HINT still routes the human to the evidence + a way to confirm.
            // read off the field that owns it (`rule.require.clamp-edge-cases`)
            expect(asInstallFailureFacts(error).hint).toContain('output above');
            expect(asInstallFailureFacts(error).hint).toContain(
              'rhx --version',
            );

            // .why = a gated build classifies one branch earlier and returns without a
            //   throw, so an unclassified report can never be about it — to name it would
            //   hand a human a cause already ruled out. asserted on BOTH halves, since
            //   either could name it
            expect(asFailureSentence(error)).not.toContain(
              'ERR_PNPM_IGNORED_BUILDS',
            );
            expect(asInstallFailureFacts(error).hint).not.toContain(
              'ERR_PNPM_IGNORED_BUILDS',
            );
          },
        );
      });
    },
  );

  given('[case5] the install reports a GATED BUILD HOOK', () => {
    // 🚨 THE CLAMP for the false-failure report. pnpm >= 11 exits nonzero on
    //   ERR_PNPM_IGNORED_BUILDS even when every package installed correctly, so this is
    //   NOT a failure: the packages are on disk, only a lifecycle hook was skipped.
    //   .the mutation that reddens this: drop the `build-gate-blocked` early return
    //
    // ⚠️ the boundary is 11, never 10 — pnpm 10.24 reports a gated hook as a WARN and
    //   exits 0. the local target's twin rows are `execNpmInstallLocal.test.ts` `[case1]`:
    //   two files, one property — that a gated hook is absolved and REPORTED at both targets
    const outcomeGated = asOutcome({
      kind: 'build-gate-blocked',
      exitCode: 1,
      output: '[ERR_PNPM_IGNORED_BUILDS] Ignored build hooks: node-pty',
    });

    when('[t0] the notice stands alone on a nonzero exit', () => {
      then('it does NOT throw — the packages installed', async () => {
        const run = await runGlobalInstall({
          packages: ['rhachet'],
          presence: 'present',
          outcome: outcomeGated,
        });
        expect(run.result).toEqual({ upgraded: true });
      });

      // 🚨 THE SCREEN, not the return value. the row above proves the CALLER is told the
      //   truth; this proves the HUMAN is. the two are separable: the branch can return
      //   `{ upgraded: true }` while the screen reads pnpm's red `ERR_PNPM_IGNORED_BUILDS`
      //   block, then done (`rule.require.status-feedback`).
      //   .the mutation that reddens this: drop the `printNpmInstallGateNote()` call
      then('the human READS why the ERR above was not a failure', async () => {
        const run = await runGlobalInstall({
          packages: ['rhachet'],
          presence: 'present',
          outcome: outcomeGated,
        });

        // the note names the ERR as a gate notice, and states the packages did land
        expect(run.out).toContain('not a failure');
        expect(run.out).toContain('every package installed');

        // 🚨 and it names NO cure. `pnpm approve-builds -g` lifts the gate, but the gate
        //   costs the human no capability, so the notice must not send them to act
        expect(run.out).not.toContain('approve-builds');
      });
    });
  });
});
