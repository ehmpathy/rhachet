import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asInstallTimeoutWordsExpected } from '@src/.test/assets/asInstallTimeoutWordsExpected';

import { asNpmInstallFailureError } from './asNpmInstallFailureError';

/**
 * .what = reads the exit code the process will actually use
 * .why  = 🚨 the whole point of the class split. `getExitCodeFromError` reads
 *   `.code.exit` off the caught error, so the class IS the exit code. to assert
 *   `instanceof` alone would pass on a class that carried the wrong code, which
 *   is the defect this file exists to clamp
 */
const asExitCode = (error: unknown): number =>
  (error as { code: { exit: number } }).code.exit;

const asMetadata = (error: unknown): Record<string, unknown> =>
  (error as { metadata: Record<string, unknown> }).metadata;

/**
 * .what = the LINE a human reads — the redacted sentence, plus the hint composed onto
 *   it exactly as every renderer composes it
 *
 * .why  = 🚨 **`error.message` SERIALIZES THE METADATA INTO ITSELF.** so an
 *   assertion of `error.message` toContain(hint) passes whether the hint sits in
 *   the sentence or only in `metadata.hint` — it can never fail, and a clamp that
 *   can never fail is a decoration (`rule.require.clamp-edge-cases`).
 *
 *   this was measured, never reasoned: the hint was dropped from the sentence and
 *   every row of this file stayed green until these reads were routed through the
 *   redaction.
 *
 * 🚨 .why it now COMPOSES rather than reads the sentence alone = a sentence no longer
 *   holds its own hint. it used to, so `redact(['metadata']).message` was the whole
 *   human line — but an inline hint then rendered TWICE on the local path, where
 *   `asCliErrorFrame` appends `metadata.hint` as its own line. the hint moved to ONE
 *   owner (the field), and every renderer composes the two.
 *
 *   ⚠️ so this helper must compose them too, or every row below that asserts a fix was
 *   named would test a string no renderer produces — and would stay green while a hint
 *   vanished entirely. the composition mirrors `asUpgradeFailureMessage`'s, which is the
 *   global path's render; `asCliErrorFrame` puts the same two facts on two lines instead
 *   of one, and `asCliErrorFrame.test.ts` owns that shape.
 *
 * .note = every `toContain` below therefore asserts the hint reaches a human, and
 *   `[case9]` asserts it reaches them exactly ONCE — which is what reddens a
 *   re-inlined copy
 */
const asSentence = (error: ConstraintError | MalfunctionError): string => {
  const sentence = error.redact(['metadata']).message;
  const hint = (error as { metadata?: { hint?: unknown } }).metadata?.hint;
  return typeof hint === 'string' && hint.length > 0
    ? `${sentence}. ${hint}.`
    : sentence;
};

describe('asNpmInstallFailureError', () => {
  given('[case1] a permission wall', () => {
    when('[t0] the classifier named it permission-denied', () => {
      const error = asNpmInstallFailureError({
        kind: 'permission-denied',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: 1,
        output: 'ERR_PNPM_EACCES  EACCES: permission denied',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      });

      then('it is a CONSTRAINT — the caller can fix it', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('it exits 2, so a ci job can tell it from a defect of ours', () => {
        // .why = `rule.require.exit-code-semantics`. exit 2 means "the caller
        //   must repair an input first"; a permission wall is exactly that.
        //   the mutation that reddens this: return a MalfunctionError here
        expect(asExitCode(error)).toEqual(2);
      });

      then('the SENTENCE names the fix, not only the metadata', () => {
        // 🚨 THE r10 CLAMP, and the reason the hint is deliberately duplicated.
        //   `execUpgrade` prints `error.redact(['metadata']).message` — the bare
        //   sentence — because the metadata carries the package manager's whole
        //   captured log, which no human wants on a console line. so a hint held
        //   ONLY in metadata is stripped from the one line a human reads.
        //
        //   ⚠️ this MUST read the redacted sentence. the un-redacted `.message`
        //   embeds the metadata blob, so it carries `metadata.hint` too — an
        //   assertion against it passes under the very mutation it claims to
        //   guard. that is not a hypothetical: it was the first shape of this
        //   row, and the mutation below left it green.
        //
        //   the mutation that reddens this: drop `${hint}` from the message
        //   template and keep it in metadata alone
        expect(asSentence(error)).toContain(
          'retry with elevated permissions, or point pnpm at a prefix you own',
        );
      });

      then('the sentence names the package manager and the exit code', () => {
        expect(asSentence(error)).toContain('pnpm global install');
        expect(asSentence(error)).toContain('exit code 1');
      });

      then('the captured output survives into metadata', () => {
        // .why = `rule.forbid.failhide`. the classification is a summary; the
        //   bytes are the evidence. to classify and then discard the output
        //   would leave a human with our read of the failure and none of theirs
        expect(asMetadata(error).output).toContain('EACCES: permission denied');
        expect(asMetadata(error).kind).toEqual('permission-denied');
        expect(asMetadata(error).packages).toEqual(['rhachet@latest']);
      });
    });

    when('[t1] the same wall on a LOCAL install', () => {
      then('the sentence says "install", never "global install"', () => {
        // .why = a human who ran a local upgrade must not be told their GLOBAL
        //   install failed — they would go look at the wrong tree
        const error = asNpmInstallFailureError({
          kind: 'permission-denied',
          target: 'local',
          packageManager: 'npm',
          exitCode: 1,
          output: 'npm ERR! code EACCES',
          packages: ['rhachet-roles-ehmpathy@latest'],
          shellPresence: 'absent',
        });
        expect(asSentence(error)).toContain('npm install failed');
        expect(asSentence(error)).not.toContain('global install');
      });
    });
  });

  given('[case2] an install killed at its time bound', () => {
    // 🚨 THE TIMEOUT ROW, and it is a MALFUNCTION on purpose.
    //   per `rule.require.exit-code-semantics`, exit 1 means "may be transient,
    //   retry might help" and exit 2 means "the caller must repair an input
    //   first." a stalled registry is the former: a retry is the honest first
    //   move, and no change the caller makes to their own inputs would have
    //   prevented it. to class it a constraint would send a human to repair an
    //   input they do not own
    when('[t0] spawnSync reports the child was killed', () => {
      const error = asNpmInstallFailureError({
        kind: 'timed-out',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: null,
        output: 'Progress: resolved 41, reused 0, downloaded 12',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      });

      then('it is a MALFUNCTION, exit 1 — a retry may help', () => {
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(asExitCode(error)).toEqual(1);
      });

      then(
        'the sentence says WHAT happened, never "cause unclassified"',
        () => {
          // 🚨 the guard against the defect this whole change exists to retire.
          //   a timeout is a KNOWN cause with an obvious next move, so it must
          //   never fall through to "we do not know" — that would tell a human we
          //   are ignorant after five minutes in which what happened is the one
          //   fact we hold.
          //
          //   the mutation that reddens this: delete the `timed-out` branch and
          //   let it fall through to the unclassified default
          expect(asSentence(error)).toContain(
            `exceeded its ${asInstallTimeoutWordsExpected()} bound and was killed`,
          );
          expect(asSentence(error)).not.toContain('cause unclassified');
        },
      );

      then('the sentence names a fix a human can act on', () => {
        expect(asSentence(error)).toContain('check your network, then retry');
      });

      then('the partial output survives — it is WHERE it stalled', () => {
        // .why = a killed install still wrote bytes up to the moment it hung,
        //   and those bytes are the best evidence of where. to discard them
        //   because the child never exited is `rule.forbid.failhide`
        expect(asMetadata(error).output).toContain('resolved 41');
      });

      then(
        'installExitCode is null — the child never exited, so it has no code',
        () => {
          // .why = null is the TRUTH here, not a placeholder. the kind carries
          //   what happened instead. to invent a code would be a fact we made up
          //
          // .why the KEY is qualified = the process still exits 1 here via
          //   `.code.exit`, so a bare `exitCode: null` in the payload would read as
          //   "the process had no exit code", which is false. the qualifier says
          //   WHOSE code is absent (`rule.forbid.ambiguous-labels`)
          expect(asMetadata(error).installExitCode).toBeNull();
        },
      );
    });
  });

  given('[case3] an exit we could not place', () => {
    when('[t0] the classifier returned unclassified', () => {
      const error = asNpmInstallFailureError({
        kind: 'unclassified',
        target: 'local',
        packageManager: 'pnpm',
        exitCode: 1,
        output: 'ENOSPC: no space left on device',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      });

      then(
        'it is a MALFUNCTION — an unplaced exit is OURS until proven otherwise',
        () => {
          // .why = to class it a constraint would tell a human "you can fix
          //   this" over a cause nobody has named — loud about the wrong party,
          //   which is still a hidden defect (`rule.forbid.failhide`)
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(asExitCode(error)).toEqual(1);
        },
      );

      then('it says so plainly rather than guess a nearest cause', () => {
        expect(asSentence(error)).toContain('cause unclassified');
      });

      then(
        'the hint names a DIAGNOSTIC, never a cure we cannot justify',
        () => {
          // 🚨 the discipline the whole change turns on. a confident cure over an
          //   unnamed cause is the `pnpm rebuild node-pty` defect, relocated. so
          //   this row points a human AT the evidence instead of at a command
          expect(asSentence(error)).toContain('read the pnpm output above');
          expect(asSentence(error)).toContain('rhx --version');
        },
      );
    });
  });

  given('[case4] a package the registry says does not exist', () => {
    // 🚨 THE MOST COMMON UPGRADE FAILURE — a typo in a role slug — and before this
    //   row it reported as `unclassified`: *"cause unclassified. read the pnpm
    //   output above."* that is the "go read the noise" guidance
    //   `rule.require.errors-name-the-fix` forbids, on the failure a human hits
    //   most. so this case's teeth are the CONTRAST with `[case3]`, not the row
    //   in isolation
    when('[t0] the classifier named it package-absent', () => {
      const error = asNpmInstallFailureError({
        kind: 'package-absent',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: 1,
        output:
          'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/rhachet-roles-bhrian: Not Found - 404',
        packages: ['rhachet-roles-bhrian@latest'],
        shellPresence: 'absent',
      });

      then('it is a CONSTRAINT, exit 2 — the caller must fix the slug', () => {
        // .why = `rule.require.exit-code-semantics`. exit 1 means "may be
        //   transient, retry might help"; a retry with the same slug fails
        //   identically forever, so exit 1 would invite a pointless loop.
        //
        //   the mutation that reddens this: delete the `package-absent` branch
        //   and let it fall through to the unclassified default (malfunction, 1)
        expect(error).toBeInstanceOf(ConstraintError);
        expect(asExitCode(error)).toEqual(2);
      });

      then('the sentence NAMES the cause rather than shrugs at it', () => {
        // 🚨 the whole point of the row. the string it must NOT contain is the
        //   one it produced before this change
        expect(asSentence(error)).toContain(
          'a requested package does not exist',
        );
        expect(asSentence(error)).not.toContain('cause unclassified');
      });

      then('the sentence names the FIX, and names the package by slug', () => {
        // .why = a hint that says "check your packages" over a list of five is
        //   not a fix. the slug the registry rejected is the one fact a human
        //   needs, and it is the one fact only we hold at this point
        expect(asSentence(error)).toContain('rhachet-roles-bhrian@latest');
        expect(asSentence(error)).toContain('the registry has no such package');
      });

      then('the captured 404 survives into metadata', () => {
        expect(asMetadata(error).output).toContain('ERR_PNPM_FETCH_404');
        expect(asMetadata(error).kind).toEqual('package-absent');
      });
    });
  });

  given('[case5] the two malfunction rows sit side by side', () => {
    when('[t0] a timeout and an unplaced exit are compared', () => {
      then('they carry the SAME exit code and DIFFERENT sentences', () => {
        // .why = the class is a coarse signal (who fixes it); the sentence is
        //   the fine one (what happened). two causes can share an exit code and
        //   must not share a message — that would fold a known cause into an
        //   unknown one, which is the failure `[case2] [t0]` guards.
        //
        //   ⚠️ the comparison MUST be of redacted sentences. the un-redacted
        //   `.message` embeds `metadata.kind`, which differs by construction, so
        //   an inequality assertion against it holds even when the two sentences
        //   are byte-identical — measured, and it is why this row alone stayed
        //   green under the mutation that reddened its two siblings
        const shared = {
          target: 'global' as const,
          packageManager: 'pnpm' as const,
          exitCode: null,
          output: '',
          packages: ['rhachet@latest'],
          shellPresence: 'absent' as const,
        };

        const errorTimeout = asNpmInstallFailureError({
          ...shared,
          kind: 'timed-out',
        });
        const errorUnplaced = asNpmInstallFailureError({
          ...shared,
          kind: 'unclassified',
        });

        expect(asExitCode(errorTimeout)).toEqual(asExitCode(errorUnplaced));
        expect(asSentence(errorTimeout)).not.toEqual(asSentence(errorUnplaced));
      });
    });
  });

  given('[case6] a package manager that died without an exit code', () => {
    // 🚨 THE CLAMP on a null exit code. `exitCode` is `number | null`, and a raw
    //   interpolation renders a signal death as the literal words *"failed with
    //   exit code null — cause unclassified"*.
    //
    //   ⚠️ `[case5]` above also passes `exitCode: null` and CANNOT catch that — it
    //   asserts only that the two sentences DIFFER, never what either one says. an
    //   assertion over a RELATION between two renders (equal, not-equal,
    //   same-length) holds while both renders are nonsense. only an assertion over
    //   the CONTENT reddens, and this case reads the content.
    //
    //   ✅ DOGFOODED — two mutations, each shaped to leave the other's rows green
    //   (jest aborts a row at its first failed expect, so one mutation can only
    //   ever prove one assertion per row):
    //
    //     M1 — `asInstallExitWords` renders the number unconditionally, i.e. the
    //          exact prior defect. → 3 RED, all in [t0]. the received string was
    //          the reported sentence verbatim: "pnpm global install failed with
    //          exit code null — cause unclassified". [t1] stayed green, and so
    //          did [case5] — the blind spot named above, now measured.
    //
    //     M2 — `asInstallExitWords` renders the null clause unconditionally, i.e.
    //          the "fix" that satisfies [t0] by dropping the number altogether.
    //          → 2 RED: [t1], plus [case1][t0], a prior guard on the same
    //          property. so the common case has two independent clamps, not one.
    when('[t0] the failure carries a null exit code', () => {
      const error = asNpmInstallFailureError({
        kind: 'unclassified',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: null,
        output: '',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      });

      then('it never renders the word "null" as an exit code', () => {
        // .why = no real process reports an exit code of `null`. the clause is
        //   not merely ugly — it states a fact that cannot be true, in the one
        //   sentence whose job is to be trusted about a cause. a human who reads
        //   it learns the reporter is confused, which is worse than a report
        //   that says less (`rule.require.errors-name-the-fix`)
        expect(asSentence(error)).not.toContain('exit code null');
        expect(asSentence(error)).not.toContain('null');
      });

      then(
        'it says WHAT happened instead, the way the timeout row does',
        () => {
          // ⚠️ the disjunction is deliberate, never vagueness. `execNpmInstall`
          //   reaches `exitCode: null` from two structurally different deaths — a
          //   signal kill (SIGSEGV, OOM) and a spawn that never started (ENOENT on
          //   an absent package manager). to name either one would be a confident
          //   wrong cause, which is this change's own defect class
          //   (`rule.forbid.failhide`)
          expect(asSentence(error)).toContain('without an exit code');
          expect(asSentence(error)).toContain('killed, or never started');
        },
      );

      then('the cause clause still reads as one sentence', () => {
        // .why = the exit clause is a parenthetical rather than a second
        //   em-dash, so the sentence keeps exactly one aside. a regression that
        //   drops the space after the dash (measured — it happened while this
        //   very fix was applied) is caught here rather than by a human's eye
        expect(asSentence(error)).toContain(
          'pnpm global install failed without an exit code (killed, or never started) — cause unclassified',
        );
      });
    });

    when('[t1] the failure carries a real exit code', () => {
      const error = asNpmInstallFailureError({
        kind: 'unclassified',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: 3,
        output: '',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      });

      then('the number is still rendered plainly', () => {
        // .why = the null branch must not cost the common case its detail. a
        //   fix that dropped the clause outright would have satisfied [t0] and
        //   silently thrown away the one datum a human can act on
        expect(asSentence(error)).toContain('failed with exit code 3');
      });
    });
  });

  given(
    '[case7] the two routes into "unclassified" differ on whether bytes exist',
    () => {
      // 🚨 `unclassified` is reached TWICE OVER, and only one route wrote output:
      //
      //     - a nonzero exit the classifier could not place → bytes exist
      //     - a death with no exit — a crash, or an ENOENT where the package
      //       manager binary is absent → `output` is EMPTY, no child ever ran
      //
      //   one hint of *"read the output above"* is therefore FALSE on the second
      //   route: it sends a human to a log that was never written. that is this
      //   wish's own defect class — a confident instruction aimed at a condition
      //   the human does not have, exactly as `pnpm rebuild node-pty` was —
      //   reproduced inside the change meant to retire it.
      //
      //   ⚠️ `[case6]` ALREADY PASSED `output: ''` on BOTH of its rows and stayed
      //   green throughout, because neither one reads the hint. so the defect sat
      //   in a green assertion's blind spot a second time, in this same file. the
      //   lesson repeats: a row that walks a path without a read of what that path
      //   RENDERS cannot clamp it.
      when('[t0] the package manager wrote bytes before it failed', () => {
        const error = asNpmInstallFailureError({
          kind: 'unclassified',
          target: 'local',
          packageManager: 'pnpm',
          exitCode: 7,
          output: 'ENOSPC: no space left on device',
          packages: ['rhachet@latest'],
          shellPresence: 'absent',
        });

        then(
          'the diagnostic points AT the output, because output exists',
          () => {
            expect(asSentence(error)).toContain('read the pnpm output above');
          },
        );
      });

      when('[t1] the child never ran, so it wrote no bytes at all', () => {
        const error = asNpmInstallFailureError({
          kind: 'unclassified',
          target: 'local',
          packageManager: 'pnpm',
          exitCode: null,
          output: '',
          packages: ['rhachet@latest'],
          shellPresence: 'absent',
        });

        then('it never tells a human to read output that is not there', () => {
          // 🚩 the assertion that reddens the defect. the mutation: drop the
          //   `input.output === ''` branch and render one hint unconditionally
          expect(asSentence(error)).not.toContain('read the pnpm output above');
        });

        then('it names the cause that most often leaves no output', () => {
          // .why = an ENOENT on the package-manager binary is the common route to
          //   an empty capture, and it has a real next move. a diagnostic that
          //   merely reports "no output" names no fix at all
          //   (`rule.require.errors-name-the-fix`)
          expect(asSentence(error)).toContain('wrote no output at all');
          expect(asSentence(error)).toContain('installed and on your PATH');
        });

        then('it still names the check a human can run on either route', () => {
          // .why = `rhx --version` holds on BOTH routes — it is the one move that
          //   answers "did the packages land?" with no log to read
          expect(asSentence(error)).toContain('rhx --version');
        });
      });
    },
  );

  /**
   * .what = the timeout sentence on a host where a SHELL was interposed
   *
   * .why  = 🚨 this row exists because the sentence was **structurally false** on win32,
   *   and every other row in this file was green while it was.
   *
   *   `spawnSync`'s bound kills the child WE spawned. on win32 `pnpm`/`npm` are `.cmd`
   *   shims node refuses to spawn without a shell, so that child is the SHELL — and the
   *   package manager beneath it survives, still holds its store lock. the sentence
   *   nonetheless read *"pnpm global install exceeded its 5m bound and was killed"*,
   *   which is false about the one process that actually hung.
   *
   *   ⚠️ and it is false in the WORST direction: it is confident. it sends a human to
   *   retry an install whose predecessor is still live, so the retry blocks on the lock
   *   the sentence just denied existed — a cure that runs clean and repairs naught, which
   *   is the very `pnpm rebuild node-pty` shape this whole change exists to retire.
   *
   * .how  = `shellPresence` is an INPUT rather than an ambient read, so this row runs on
   *   the linux host we actually have. an ambient `process.platform` inside the renderer
   *   would leave the one row that matters untestable by construction — a claim about a
   *   platform, verified nowhere (the same shape as `asNpmInstallShellPresence`).
   */
  given('[case8] a timeout on a host where a shell was interposed', () => {
    const errorShelled = asNpmInstallFailureError({
      kind: 'timed-out',
      target: 'global',
      packageManager: 'pnpm',
      exitCode: null,
      output: 'Progress: resolved 41, reused 0, downloaded 12',
      packages: ['rhachet@latest'],
      shellPresence: 'present',
    });

    when('[t0] the bound fired', () => {
      then('it does NOT claim the package manager was killed', () => {
        // 🚨 the assertion with teeth. revert the renderer to the single
        //   unconditional clause and this row reddens, while every other row in
        //   this file — all of which pass `shellPresence: 'absent'` — stays green.
        //   that asymmetry is the proof the clamp reaches the defect
        expect(asSentence(errorShelled)).not.toContain(
          `${asInstallTimeoutWordsExpected()} bound and was killed`,
        );
      });

      then('it names what WAS killed — the shell', () => {
        expect(asSentence(errorShelled)).toContain(
          'the shell that wrapped it was killed',
        );
      });

      then('it warns the package manager may still hold its store lock', () => {
        // .why = this is the actionable half. a human who retries into a held
        //   lock reads a second, unrelated failure and debugs the wrong cause
        expect(asSentence(errorShelled)).toContain('store lock');
      });

      then('it names a fix that fits the TRUE state', () => {
        // ⚠️ "check your network" is the fix for a killed package manager. it is
        //   the WRONG move here — the network is not what holds the lock — so the
        //   shelled row must not inherit it (`rule.require.errors-name-the-fix`)
        expect(asSentence(errorShelled)).toContain(
          'end any stray pnpm process',
        );
        expect(asSentence(errorShelled)).not.toContain('check your network');
      });

      then('it is still a MALFUNCTION, exit 1 — a retry may help', () => {
        // .why = the class is unchanged by the shell. an orphaned install is
        //   still transient and still ours; only the SENTENCE differed
        expect(errorShelled).toBeInstanceOf(MalfunctionError);
        expect(asExitCode(errorShelled)).toEqual(1);
      });
    });

    when('[t1] compared against the same timeout with no shell', () => {
      const errorDirect = asNpmInstallFailureError({
        kind: 'timed-out',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: null,
        output: 'Progress: resolved 41, reused 0, downloaded 12',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      });

      then(
        'the direct host keeps the confident claim, because it is true',
        () => {
          // .why = the fix must not cost the common case its precision. with no
          //   shell the child IS the package manager, so "was killed" is exactly
          //   right and must survive
          expect(asSentence(errorDirect)).toContain(
            `${asInstallTimeoutWordsExpected()} bound and was killed`,
          );
          expect(asSentence(errorDirect)).toContain('check your network');
        },
      );

      then('the two sentences genuinely differ', () => {
        // 🚨 the guard against a "fix" that renders one string for both. a
        //   renderer that ignored `shellPresence` would pass several rows above
        //   by accident; it cannot pass this one
        expect(asSentence(errorShelled)).not.toEqual(asSentence(errorDirect));
      });
    });
  });

  /**
   * .what = every sentence a human can read off this transformer, whole
   *
   * 🚨 .why it exists = TWO docblocks — this file's, and `asNpmInstallFailureError.ts`'s —
   *   each stated that a clamp asserted the hint *"appears EXACTLY ONCE"*. **no such row
   *   was ever written.** the guarantee is real and load-bearing (the hint moved to one
   *   owner precisely so it could not render twice on the local path), and it was
   *   documented as clamped rather than clamped.
   *
   *   ⚠️ that is this round's own defect class in a third coat: a citation READS as
   *   complete, so no reviewer hunts for the row it names. an absent clamp is invisible;
   *   an absent clamp with a docblock that vouches for it is invisible AND endorsed.
   *
   * .why the SNAPSHOT sits beside the assertions = `rule.forbid.friction-hazards` asks
   *   whether a reviewer can see the actual user experience. every other row in this file
   *   asserts a FRAGMENT, so a reword that kept each fragment intact while it truncated
   *   the line around them would pass all of them. the snapshot is the only artifact that
   *   shows a whole line, and the assertions are the only artifacts that say WHICH part
   *   must not move — neither substitutes for the other (`rule.require.snapshots`).
   */
  given('[case9] every kind, rendered as one catalog', () => {
    /** .what = one row per kind, with the exact inputs each branch reads */
    const errorsByKind = {
      'permission-denied': asNpmInstallFailureError({
        kind: 'permission-denied',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: 1,
        output: 'ERR_PNPM_EACCES  EACCES: permission denied',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      }),
      'package-absent': asNpmInstallFailureError({
        kind: 'package-absent',
        target: 'local',
        packageManager: 'pnpm',
        exitCode: 1,
        output:
          'ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/…: Not Found',
        packages: ['rhachet-roles-bhrian@latest'],
        shellPresence: 'absent',
      }),
      'timed-out.shell-absent': asNpmInstallFailureError({
        kind: 'timed-out',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: null,
        output: 'Progress: resolved 41, reused 0, downloaded 12',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      }),
      'timed-out.shell-present': asNpmInstallFailureError({
        kind: 'timed-out',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: null,
        output: 'Progress: resolved 41, reused 0, downloaded 12',
        packages: ['rhachet@latest'],
        shellPresence: 'present',
      }),
      'unclassified.bytes-present': asNpmInstallFailureError({
        kind: 'unclassified',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: 7,
        output: 'some output the classifier could not place',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      }),
      'unclassified.bytes-absent': asNpmInstallFailureError({
        kind: 'unclassified',
        target: 'global',
        packageManager: 'pnpm',
        exitCode: null,
        output: '',
        packages: ['rhachet@latest'],
        shellPresence: 'absent',
      }),
    };

    when('[t0] each is composed as a human reads it', () => {
      then('the whole catalog of sentences is visible at a glance', () => {
        // ⚠️ a MAP rather than a list, so a diff names WHICH kind moved. a bare array
        //   would renumber every row below an insertion and read as six changes
        expect(
          Object.fromEntries(
            Object.entries(errorsByKind).map(([kind, error]) => [
              kind,
              asSentence(error),
            ]),
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the hint is counted rather than merely found', () => {
      then('every kind renders its hint EXACTLY once', () => {
        // 🚨 THE ROW TWO DOCBLOCKS CLAIMED AND NEITHER FILE HELD.
        //
        //   the hazard it clamps is precise: the hint has ONE owner (`metadata.hint`) and
        //   both renderers read it by name. re-inline a copy into the sentence and the
        //   local path (`asCliErrorFrame`) prints it twice while the global path
        //   (`asUpgradeFailureMessage`) still prints it once — so the defect shows on one
        //   surface only, which is the shape that survives review.
        //
        //   ⚠️ counted with `split(hint).length - 1`, never `toContain` — a `toContain`
        //   passes on one occurrence AND on two, so it is blind to the one direction this
        //   guarantee can break in
        Object.entries(errorsByKind).forEach(([kind, error]) => {
          const hint = (error as { metadata?: { hint?: unknown } }).metadata
            ?.hint;
          if (typeof hint !== 'string')
            throw new Error(`[${kind}] carries no hint at all`);
          expect({
            kind,
            occurrences: asSentence(error).split(hint).length - 1,
          }).toEqual({ kind, occurrences: 1 });
        });
      });
    });
  });
});
