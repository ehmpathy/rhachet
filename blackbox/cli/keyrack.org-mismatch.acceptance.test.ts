import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = a refusal's two streams, joined and made byte-stable across hosts
 * .why = a refusal render is the artifact under test here, and it is split across stdout and
 *        stderr by a boundary a human does not see — they read one terminal. so the snapshot
 *        joins them, the way the `toContain` rows beside it already do, and a leak that moved
 *        from one stream to the other is still caught
 * .note = `asSnapshotSafe` is the extant masker this suite's peers use; it is applied here
 *         rather than a bespoke one so every snapshot in this file reads by the same rules
 *
 * ⚠️ .why.untrimmed = the blank line the emitter writes above and below the tree is a BYTE a
 *   human reads, so it is snapped like every other byte. a `.trim()` here would make these
 *   snapshots the one shape that pins a STRIPPED render — its peer
 *   `keyrack.blocked-render-consistency` snaps `stdout + stderr` whole — so a regression that
 *   dropped the emitter's blank lines would move that file and leave this one green
 */
const asRefusalMasked = (input: {
  result: { stdout: string; stderr: string };
}): string => asSnapshotSafe(input.result.stdout + input.result.stderr);

describe('keyrack org-mismatch', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * SECURITY: org mismatch is a fail-fast constraint
   *
   * prevents cross-org credential access — if user passes --org param
   * that doesn't match the manifest's org, reject immediately.
   * this ensures credentials stay within their declared org boundary.
   */
  given('[case1] get with org mismatch', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] get --key API_KEY --org foreign-org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'API_KEY',
            '--env',
            'test',
            '--org',
            'foreign-org',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('error mentions org mismatch', () => {
        // ⚠️ .why.sentence = asserted on the MESSAGE, never on the bare value. the blocked tree
        //        echoes the invocation (`ran: … --org foreign-org`), so a bare
        //        `toContain('foreign-org')` matches the ECHO and passes even when the run
        //        refuses for a wholly different cause — see the twin note on `[case2][t0]`,
        //        where that is exactly what an args echo buys
        //        (`rule.require.refusals-carry-context`)
        const output = result.stdout + result.stderr;
        expect(output).toContain("org 'foreign-org' does not match manifest org");
      });

      then('the human-seen refusal matches snapshot', () => {
        // .why = `get` is a third verb that raises this refusal, and its render is a contract
        //    of its own. the two rows above pin an exit code and one sentence, which any
        //    render that carries that sentence satisfies — a stack, a class dump, or a lost
        //    `fix:` leaf all pass them (`rule.require.contract-snapshot-exhaustiveness`)
        expect(asRefusalMasked({ result })).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] set with --org mismatch
   */
  given('[case2] set with org mismatch', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set --key AWS_PROFILE --org foreign-org --json', () => {
      // ⚠️ .why = `--env prep` is REQUIRED for this row to test what it claims. the fixture
      //        declares AWS_PROFILE in two envs, so with no `--env` the run refuses at
      //        `--env required: aws_profile found in multiple envs` and NEVER REACHES the
      //        org-mismatch guard below. a row without it still reads green wherever the
      //        render echoes the args — a raw class dump carries an
      //        `[args] …,--org,foreign-org,…` trailer, so `toContain('foreign-org')` matches
      //        the ECHOED FLAG rather than the message. the blocked tree carries no args
      //        trailer, which is what makes that hazard visible
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--env',
            'prep',
            '--org',
            'foreign-org',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions org mismatch', () => {
        // ⚠️ .why.sentence = the MESSAGE, never the bare value — see the twin note on [case1].
        //        this row is where that hazard bites: drop `--env prep` above and the run
        //        refuses for `--env required` while `toContain('foreign-org')` still matches
        //        the echoed flag
        // ⚠️ .note.one-sentence = all three org-mismatch sites route through
        //        `asKeyrackOrgMismatchRefusal`, so one concept renders as one sentence. left
        //        apart, `set`'s FLAG guard says `org "x" does not match keyrack.yml org "y"`
        //        while its full-SLUG guard says `slug org 'x' does not match manifest org 'y'`
        //        — one concept, two sentences, on one verb — and this file is where the faces
        //        of one refusal sit side by side, so a divergence shows here first
        // ⚠️ .why.subject-kept = the sentence still names WHICH input was rejected — `--org`
        //        here, `slug org` on [case3] — because those are different inputs with
        //        different fixes. the FORMAT converged; the subject deliberately did not
        const output = result.stdout + result.stderr;
        expect(output).toContain(
          `--org 'foreign-org' does not match manifest org`,
        );
      });

      // ⚠️ .why.both-streams = a refusal renders on stderr, so a `result.stdout`-only snapshot
      //    pins `""` and is blind to every byte a human reads — a render regression cannot
      //    move it. that is `rule.forbid.failhide` in snapshot form: a green row that verifies
      //    an empty stream
      then('the human-seen refusal matches snapshot', () => {
        expect(asRefusalMasked({ result })).toMatchSnapshot();
      });
    });

    when('[t1] set --key AWS_PROFILE --org @this (valid match)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--org',
            '@this',
            '--env',
            'prod',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-aws-profile-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        if (parsed.createdAt) parsed.createdAt = '__TIMESTAMP__';
        if (parsed.updatedAt) parsed.updatedAt = '__TIMESTAMP__';
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a full slug that clashes on BOTH axes at once, asked of both mutation verbs
   * .why = `set` and `del` each guard a full slug on org AND on env, and only the guard that
   *        runs FIRST is ever reported. so the guard ORDER is the observable, and the two verbs
   *        must share it — otherwise one input yields two different refusals, picked by which
   *        verb a human typed (`rule.forbid.surprises`, nielsen heuristic 4).
   *
   * ⚠️ .why.this.row = an env-first guard order on one verb beside an org-first order on the
   *        other is invisible to every single-axis test: a slug that clashes on ONE axis reports
   *        the same message either way. only a DOUBLY-clashed slug can tell the two orders
   *        apart, so this row is the one shape that can catch it
   *        (`rule.require.clamp-edge-cases`).
   * .note.teeth = under the env-first order this row goes red on `set` — it renders the `--env`
   *        clash where the assert demands the org one — while `del` stays green. that asymmetry
   *        IS the defect, and it is what the row exists to refuse.
   */
  given('[case3] a full slug that clashes on BOTH org and env', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // the slug names `foreign-org` AND `prod`; the flags say `--env test`. both guards fire
    const slugClashed = 'foreign-org.prod.AWS_PROFILE';

    when('[t0] set is given that slug with a clashing --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            slugClashed,
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
          stdin: 'test-value\n',
        }),
      );

      then('it refuses on the ORG axis, never the env one', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('does not match manifest org');
        expect(output).not.toContain('conflicts with env in slug');
      });

      then('the human-seen refusal matches snapshot', () => {
        // ⚠️ .why = the row above pins WHICH guard fired; this pins what the human READS
        //    when it does. the pair-assert is satisfied by any render that carries the org
        //    sentence — one that also dumps a stack, echoes the secret from stdin, or
        //    spells the class name passes it untouched. this row is the doubly-clashed
        //    refusal, and it reads against its single-axis peers in [case1] and [case2]
        //    (`rule.require.contract-snapshot-exhaustiveness`)
        expect(asRefusalMasked({ result })).toMatchSnapshot();
      });
    });

    when('[t1] del is given the same slug with the same clashing --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'del', '--key', slugClashed, '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it refuses on the ORG axis too — the two verbs agree', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('does not match manifest org');
        expect(output).not.toContain('conflicts with env in slug');
      });

      then('the human-seen refusal matches snapshot', () => {
        // ⚠️ .why = snapped as a PAIR with [t0]. the case exists to hold that one input
        //    yields one answer on both verbs, and a `toContain` on a shared sentence proves
        //    only that both name the org axis — never that they name it the same way. the
        //    two snapshots sit adjacent in the snap file, so a reviewer reads the two
        //    renders side by side and sees any drift between them as a diff, which is the
        //    exact defect this case was written to refuse (`rule.forbid.surprises`)
        expect(asRefusalMasked({ result })).toMatchSnapshot();
      });
    });
  });
});
