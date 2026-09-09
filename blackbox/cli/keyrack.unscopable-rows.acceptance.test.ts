import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { genUnscopableKeyrackHostManifest } from '@/blackbox/.test/infra/genUnscopableKeyrackHostManifest';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = a filtered `keyrack list` over a host rack that holds rows which name NO org and NO
 *         env — the drop those rows take, and the notice that names it, read through the real
 *         binary
 * .why = the drop is correct and the exit is 0, so such a row simply vanishes. `list` is the
 *        POSSESSION audit — "which keys does this machine hold?" — so a vanished row reads as
 *        "this machine does not hold that key", which is a wrong answer at exit 0
 *        (`rule.forbid.failhide`)
 *
 * ⚠️ .why.blackbox = the notice EMITTER is clamped at the unit grain
 *        (`emitKeyrackUnscopableRowsNotice.test.ts`), and the SET it announces is clamped at the
 *        unit grain too (`getAllKeyrackSlugsWithNoScope.test.ts`). neither can see the third
 *        thing: whether the orchestrator FEEDS the one from the other on a real filtered run.
 *        both units stay green while the call site hands over the FILTERED slugs — a set the
 *        drop has already emptied of unscopable rows, so the notice would never fire at all.
 *        only a run through the binary can tell that apart
 *
 * .note = the fixture's unfilterable rows are hand-authored into the HOST manifest, which is how
 *         they arise in practice. a repo manifest DERIVES every slug from `manifest.org`
 *         (`getAllKeyrackSlugsForEnv`), so it can never emit one
 * .note = the two rows differ on purpose. `LEGACY_KEY` carries no dots at all;
 *         `testorg.mainframe.OTHER_KEY` carries three dot-segments and STILL names no env,
 *         because `mainframe` is not a valid env. so the pair pins the validated decoder as the
 *         rule rather than a `split('.').length` shortcut — a row can look like a slug and not
 *         be one
 *
 * .gap = `status` shares this call site and is not covered here. its rows come from the DAEMON
 *        session rather than the host manifest, and every slug a daemon holds was derived from a
 *        manifest, so a bare row does not reach it through any ordinary journey. the emitter both
 *        verbs call is one operation, clamped at the unit grain — recorded so the bound is
 *        legible rather than implied
 */
describe('keyrack list — rows no scope flag can address', () => {
  given(
    '[case1] a host rack that holds two full slugs and two unfilterable rows',
    () => {
      const repo = useBeforeAll(async () =>
        genTestTempRepo({
          fixture: 'with-keyrack-unscopable-row',
          hostManifestJson: genUnscopableKeyrackHostManifest(),
        }),
      );

      /**
       * ⚠️ the NEGATIVE direction, and the row most easily skipped. an emitter that fired on
       *    every sweep would satisfy every positive row below and still be wrong: an unfiltered
       *    `list` drops no row, so it has none to announce, and a notice here would nag a human
       *    about rows they can plainly see
       */
      when('[t0] keyrack list — no filter at all', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'list'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('exit code is 0', () => {
          expect(result.status).toEqual(0);
        });

        then('every row renders — the unfilterable ones included', () => {
          expect(result.stdout).toContain('testorg.prep.API_KEY');
          expect(result.stdout).toContain('testorg.test.API_KEY');
          expect(result.stdout).toContain('LEGACY_KEY');
          expect(result.stdout).toContain('testorg.mainframe.OTHER_KEY');
        });

        then('stderr stays empty — no row was dropped to announce', () => {
          expect(asSnapshotSafe(result.stderr)).toEqual('');
        });

        // ⚠️ .why = THE BASELINE. [t1] and [t2] each snap a FILTERED view and asserts what
        //    their filter dropped — but "dropped" is a claim about a set neither of them
        //    renders. without the unfiltered render beside them, a regression that loses a
        //    row from the rack itself reads as a filter that worked: the `not.toContain`
        //    rows go green for the wrong reason. this snap is what makes the three
        //    comparable, so a reviewer sees the subsets against the whole
        then('the two streams a human reads are snapped', () => {
          expect({
            stdout: asSnapshotSafe(result.stdout),
            stderr: asSnapshotSafe(result.stderr),
          }).toMatchSnapshot();
        });
      });

      when('[t1] keyrack list --org testorg', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'list', '--org', 'testorg'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('exit code is 0 — a filter that drops rows is a success', () => {
          expect(result.status).toEqual(0);
        });

        then('stdout renders the org rows, and only those', () => {
          expect(result.stdout).toContain('testorg.prep.API_KEY');
          expect(result.stdout).toContain('testorg.test.API_KEY');
          expect(result.stdout).not.toContain('LEGACY_KEY');
          expect(result.stdout).not.toContain('OTHER_KEY');
        });

        /**
         * ⚠️ the whole point of the journey. a human who reads only stdout would conclude the
         *    rack holds two keys; stderr is what tells them two more are hidden by the filter
         *    they typed
         */
        then('stderr names EACH dropped row, not merely a count', () => {
          const said = asSnapshotSafe(result.stderr);
          expect(said).toContain('2 row(s) on this rack carry no scope a filter can read');
          expect(said).toContain('LEGACY_KEY');
          expect(said).toContain('testorg.mainframe.OTHER_KEY');
        });

        then('stderr tells a filter miss apart from an absent key', () => {
          expect(asSnapshotSafe(result.stderr)).toContain(
            'it is hidden here, not absent',
          );
        });

        /**
         * ⚠️ the row that most needs the account is the one that LOOKS correct.
         *    `testorg.mainframe.OTHER_KEY` reads as `<org>.<env>.<key>` at a glance, so a
         *    notice that said only "names no org and no env" states a truth this human reads
         *    as flatly wrong. the render must name the RULE it breaks — `<env>` must be a
         *    recognized env — so the human can see `mainframe` is not one
         */
        then('stderr explains the look-alike row, not just the bare one', () => {
          const said = asSnapshotSafe(result.stderr);
          expect(said).toContain('must be one of');
          expect(said).toContain('LOOKS like a slug');
        });

        then('stderr names the fix a human can act on', () => {
          const said = asSnapshotSafe(result.stderr);
          expect(said).toContain('fix:');
          expect(said).toContain('re-run without --org/--env');
        });

        // BOTH streams. a stdout-only snap is blind to what lands on the stream it does not
        // capture, and here the finding lives entirely on the uncaptured one
        then('the two streams a human reads are snapped', () => {
          expect({
            stdout: asSnapshotSafe(result.stdout),
            stderr: asSnapshotSafe(result.stderr),
          }).toMatchSnapshot();
        });
      });

      /**
       * .why = the notice is gated on `orgFilter || opts.env`, so the env axis reaches it by a
       *        second, independent route. a gate written as `orgFilter` alone passes every row
       *        above and leaves an `--env`-only sweep silent
       */
      when('[t2] keyrack list --env prep — the OTHER filter axis', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'list', '--env', 'prep'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('exit code is 0', () => {
          expect(result.status).toEqual(0);
        });

        then('stdout holds the prep row alone', () => {
          expect(result.stdout).toContain('testorg.prep.API_KEY');
          expect(result.stdout).not.toContain('testorg.test.API_KEY');
        });

        then('stderr announces the same two rows', () => {
          const said = asSnapshotSafe(result.stderr);
          expect(said).toContain('2 row(s) on this rack carry no scope a filter can read');
          expect(said).toContain('LEGACY_KEY');
          expect(said).toContain('testorg.mainframe.OTHER_KEY');
        });

        then('the two streams a human reads are snapped', () => {
          expect({
            stdout: asSnapshotSafe(result.stdout),
            stderr: asSnapshotSafe(result.stderr),
          }).toMatchSnapshot();
        });
      });

      /**
       * ⚠️ the guard row for the robot contract. the notice rides stderr precisely so a `--json`
       *    caller is undisturbed, and one guidance byte on stdout breaks every `jq` of this
       *    command — strictly worse than the silence the notice repairs
       */
      when('[t3] keyrack list --org testorg --json', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'list', '--org', 'testorg', '--json'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        );

        then('exit code is 0', () => {
          expect(result.status).toEqual(0);
        });

        then('stdout parses as json, and holds the org rows alone', () => {
          const parsed = JSON.parse(result.stdout);
          expect(Object.keys(parsed).sort()).toEqual([
            'testorg.prep.API_KEY',
            'testorg.test.API_KEY',
          ]);
        });

        then('the notice still reached the human, on stderr', () => {
          expect(asSnapshotSafe(result.stderr)).toContain(
            '2 row(s) on this rack carry no scope a filter can read',
          );
        });

        // ⚠️ .why = `--json` is the MACHINE contract of this verb — the shape a caller parses
        //    — and it is the one row here that snaps neither stream while [t0]/[t1]/[t2] snap
        //    both. `Object.keys(...).sort()` pins key MEMBERSHIP alone: a change to any row's
        //    fields, their values, or their order passes it untouched, and a caller that reads
        //    `.env` or `.vault` off a row would break with no red test
        then('the two streams a human reads are snapped', () => {
          expect({
            stdout: asSnapshotSafe(result.stdout),
            stderr: asSnapshotSafe(result.stderr),
          }).toMatchSnapshot();
        });
      });
    },
  );
});
