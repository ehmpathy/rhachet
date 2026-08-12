import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asKeyrackStatusSnapshotSafe,
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = e23 at the CLI — what `keyrack source` emits while two reaches of one slug
 *         are held at once
 * .why = `assertKeyrackExportNamesDistinct` guards the one failure shape in this design
 *        that SUCCEEDS: a shell variable name carries no reach, so two reaches of one
 *        slug would emit the same `export FOO=` and the last line would silently win. it
 *        was proven only in isolation, on the domain op — never through the CLI wiring
 *        that invokes it (`rule.require.test-coverage-by-grain`: a contract needs an
 *        acceptance test, and its absence is a blocker)
 *
 * .note = fully hermetic. `os.direct` is a plaintext store on disk, so two reaches can
 *         be held with no vault, no network, and no credential
 */
describe('keyrack source reach', () => {
  // kill any stale daemon so the store below is the only one in play
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * .what = the demo, cut down to two reaches of one name
   * .why = `API_KEY` is declared once in the repo manifest, yet the host holds TWO keys for
   *        it — one reachless, one at `beav@ehmpathy.com`. both reduce to the same shell
   *        variable name, which is exactly the collision e23 names
   */
  given('[case1] one slug held at two reaches at once', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] both reaches are unlocked', () => {
      const unlockReachless = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      const unlockReached = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('the reachless unlock succeeds', () => {
        expect(unlockReachless.status).toEqual(0);
      });

      // .note = this is the load-bearing precondition. if the reach unlock failed, every
      //         claim below would be about a rack that holds ONE key, and the case would
      //         pass while it proved no such thing
      then('the reach unlock succeeds — the second reach really is held', () => {
        expect(unlockReached.status).toEqual(0);
        expect(unlockReached.stdout).toContain('beav@ehmpathy.com');
      });
    });

    when('[t1] the rack is read back', () => {
      const status = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('both reaches appear — the daemon holds two keys, not one', () => {
        expect(status.stdout).toContain('testorg.test.API_KEY');
        expect(status.stdout).toContain('reach: beav@ehmpathy.com');
      });

      // .note = `status` is where a human goes to ask "what do i hold right now?", and a
      //         reach key is a NEW variant of that answer. the two `toContain` lines above
      //         clamp that the reach is named; this clamps the tree it is named in —
      //         which leaf it hangs from, and how a reachless key sits beside a reached
      //         one. only a snapshot surfaces that shift on the pr diff
      then('the reply is snapped', () => {
        expect(asSnapshotSafe(status.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(status.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = the same rack, read through `status --json` — the ROBOT contract
     * .why = `[t1]` proves a human can see both reaches. `--json` is a second, entirely
     *        separate contract off the same command, and it had no test at all: a field
     *        rename or a dropped `reach` would leave `[t1]`'s tree untouched and still break
     *        every machine consumer (`rule.forbid.friction-hazards`)
     *
     * .note = the pair is the point. a render change moves `[t1]`; a payload change moves
     *         this. neither case can see the other's regression, which is exactly why one
     *         command owes two clamps
     */
    when('[t2] the rack is read back as json', () => {
      const status = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 and parses as json', () => {
        expect(status.status).toEqual(0);
        expect(() => JSON.parse(status.stdout)).not.toThrow();
      });

      // ⚠️ THE clamp on the payload: a reach-blind serializer would emit two entries that
      //    a machine cannot tell apart, which is the whole axis lost at the robot surface
      then('the reached reach carries its exid in the payload', () => {
        expect(status.stdout).toContain('beav@ehmpathy.com');
      });

      // .note = `asKeyrackStatusSnapshotSafe`, NOT `asSnapshotSafe`. this payload carries a
      //         live `ttlLeftMs` countdown and a per-daemon `socketPath` hash, and neither
      //         is reached by the generic scrub — so a raw snap here is green on the run
      //         that writes it and red for every run after
      then('the reply is snapped', () => {
        expect(
          asKeyrackStatusSnapshotSafe({ stdout: status.stdout }),
        ).toMatchSnapshot('stdout');
        // ⚠️ the quiet stream matters MORE on a `--json` contract than on a tree. a machine
        //    consumer parses stdout; a stray warn that drifted onto stdout would break the
        //    parse, and one that stayed on stderr must be visible here rather than absorbed
        expect(asSnapshotSafe(status.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * ⚠️ .note = this fixture's reach is AD-HOC — unlocked on the host, declared in no repo
     *         manifest. the distinction carries weight rather than merely colors the case:
     *           - the sweep enumerates from `KeyrackKeySpec.reaches`, the REPO manifest's
     *             declared set — the one `fill` provisions for every developer here
     *           - so the sweep alone cannot see this reach, and the INJECTION half stays
     *             reach-blind by construction: one variable name holds one value
     *
     * ⚠️ .what changed 2026-08-09 = this note used to end *"to list peers would need a protocol
     *         addition and a round-trip on a path whose stdout is eval'd"*, and it declared the
     *         ad-hoc half a documented uncovered edge. **that was wrong on the clause it rested
     *         on.** `daemonAccessStatus` already yields one row per (slug, reach), WITH `reach`
     *         on the row — no protocol addition, one socket round-trip, and the notice lands on
     *         STDERR, which no shell evals. the cli now announces this reach, and `[t3]`
     *         below clamps that it does
     *
     * .note = so the PAIR with `keyrack.source.reach.enumerate` still holds, and now draws a
     *         sharper line: that case proves the DECLARED announce; this one proves the AD-HOC
     *         announce plus the injection boundary that survives it — one export, reachless,
     *         with the other reach named rather than dropped
     */
    when('[t3] source is run while both are held', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--env', 'test'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it emits exactly ONE export for the name, never two', () => {
        const exports = result.stdout
          .split('\n')
          .filter((line) => line.startsWith('export API_KEY='));
        expect(exports).toHaveLength(1);
      });

      // .note = WHICH one it emits is the whole point. a sweep names no reach, so it
      //         must yield the reachless key — the one whose reach the repo's own org
      //         implies. to yield the reach key would hand a caller a credential for a
      //         reach they never named (e6, e18)
      then('the one it emits is the reachless reach, not the reached one', () => {
        expect(result.stdout).toContain('sk-reachless-aaa111');
        expect(result.stdout).not.toContain('sk-beav-bbb222');
      });

      then('it exits 0 — two held reaches are not a fault to source', () => {
        expect(result.status).toEqual(0);
      });

      // ⚠️ THE clamp on the SILENCE, and it must live here rather than at the unit grain: only
      //    an end-to-end run can prove the cli emits no announce, since a unit test of an
      //    operation that no longer exists proves no such thing
      // .why = a per-reach announce was built (2026-08-07, the ENUMERATE decision) and cut
      //        (2026-08-12). it fired on every `source` for any repo that holds a reach, always
      //        the same lines, never actionable differently — alarm fatigue, whose real cost is
      //        that it trains a human to ignore keyrack stderr and so weakens the two notices
      //        that DO vary: the export-name collision refusal, and the uncut-reach throw
      // .note = silence here is safe because no WRONG credential is handed back — the reachless
      //         value emitted above is the correct one. "fewer than exist", never "the wrong
      //         one". the disclosure lives on the rack: `keyrack list` renders a `reach:` leaf
      // .note = this asserts on the RENDERED words rather than an absent import, so it goes red
      //         if any future announce returns by any route
      then('stderr says no word about the reach it could not carry', () => {
        expect(result.stderr).not.toContain('not sourced');
        expect(result.stderr).not.toContain('beav@ehmpathy.com');
        expect(result.stderr).not.toContain('(held)');
      });

      // ⚠️ holds regardless of what this path announces, so it outlives either decision: both
      //    secrets are inches away in memory here, and a render that reached one field too far
      //    would print one to a stream ci logs
      then('no secret reaches stderr, from either reach', () => {
        expect(result.stderr).not.toContain('sk-beav-bbb222');
        expect(result.stderr).not.toContain('sk-reachless-aaa111');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    /**
     * .what = `keyrack get --key X --reach Y --json` — the CLI's own robot contract for a
     *         reach-scoped fetch
     * .why = the successful reach-GET was covered at SDK grain only
     *        (`blackbox/sdk/keyrack.reach.acceptance.test.ts [case4]`). the CLI reaches the
     *        same `attemptResolved`, but it OWNS a separate serializer and a separate flag
     *        parse — so a `--reach` the cli dropped, or a `reach` its json omitted, would
     *        leave every sdk case green (`rule.require.test-coverage-by-grain`)
     *
     * .note = this rides `[case1]`'s rack rather than stands up its own. both reaches are
     *         already held by `[t0]`, and that is the ONLY state this claim needs — a fixture
     *         of its own would restate the setup and prove the same fact more slowly
     * .note = `--json` and not the tree, deliberately: the tree's reach leaf is already
     *         clamped by `[t1]`. this is the payload half of the pair `[t1]`/`[t2]` draws for
     *         `status`, now drawn for `get`
     */
    when('[t4] one reach is fetched by name, as json', () => {
      const fetched = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'API_KEY',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
            '--json',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 and parses as json', () => {
        expect(fetched.status).toEqual(0);
        expect(() => JSON.parse(fetched.stdout)).not.toThrow();
      });

      // ⚠️ THE clamp, and it is the SECRET rather than the exid. a cli that parsed
      //    `--reach` and then dropped it before the lookup would still print the exid back
      //    (it holds the string), yet hand over the REACHLESS credential — a live key for a
      //    reach the caller never named (e18). only the secret tells those apart
      then('the secret is THAT reach\u2019s, never its peer\u2019s', () => {
        expect(fetched.stdout).toContain('sk-beav-bbb222');
        expect(fetched.stdout).not.toContain('sk-reachless-aaa111');
      });

      // .note = parsed, never matched against the raw text. the cli PRETTY-PRINTS its json
      //         (`"status": "granted"`, with a space) while the sdk emits it compact — so a
      //         `toContain('"status":"granted"')` copied from the sdk case fails here for a
      //         layout reason that has no relation to the claim. a parse asserts the DATA,
      //         which is what both grains actually share
      then('it reports granted, and carries the exid it was asked for', () => {
        const parsed = JSON.parse(fetched.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.reach.exid).toEqual('beav@ehmpathy.com');
      });

      // the payload SHAPE, which the three assertions above cannot see: a renamed or dropped
      // field leaves every `toContain` green while it breaks each machine consumer
      then('the reply is snapped', () => {
        const redacted = fetched.stdout.replace(
          /"expiresAt":"[^"]*"/g,
          '"expiresAt":"__EXPIRES_AT__"',
        );
        expect(asSnapshotSafe(redacted)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(fetched.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = `keyrack get --for repo` — the bulk sweep, run while a peer reach is held
     * .why = the sweep's reach-blindness was proven at TWO surfaces (`keyrack source` at
     *        `[t3]`, and the sdk `sourceAllKeysIntoEnv`) and never at this one, though all
     *        three share `getAllKeyrackGrantsByRepo`. to share the call is not to share the
     *        contract: `source` emits shell text and `get` emits a payload, off separate
     *        serializers, so a reach that leaked into one would leave the other's cases green
     *
     * ⚠️ .note = the wisher picked "teach the sweep", so a DECLARED reach is now
     *         enumerated here and announced by `source` — see
     *         `keyrack.source.reach.enumerate`. this case survives that decision unchanged
     *         because its reach is AD-HOC: held on the host, declared in no manifest, so
     *         the manifest-driven enumerate cannot see it. what this case clamps changed
     *         meaning without changing bytes — it was the whole tradeoff, and it is now the
     *         BOUNDARY of the fix. that shift is exactly why the note is rewritten rather
     *         than left to read as though the sweep were still blind by design
     * .note = the assertion is the SECRET on both halves, never the exid. a sweep that
     *         accidentally resolved the reach key would still print `API_KEY` either way
     */
    when('[t5] the whole repo is swept while a peer reach is held', () => {
      const swept = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 and parses as json', () => {
        expect(swept.status).toEqual(0);
        expect(() => JSON.parse(swept.stdout)).not.toThrow();
      });

      // ⚠️ THE clamp. a sweep names no reach, so it must yield the reachless key — to
      //    yield the reached one would hand a caller a credential for a reach they never
      //    named (e6, e18), and to yield BOTH would be the silent loss e23 guards
      then('the sweep yields the reachless secret, never its reached peer', () => {
        expect(swept.stdout).toContain('sk-reachless-aaa111');
        expect(swept.stdout).not.toContain('sk-beav-bbb222');
      });

      // .note = one entry per declared slug, never two — because this fixture declares no
      //         `reaches:` line, so the sweep's target expansion yields exactly the reachless
      //         target per slug. the held reach is OMITTED rather than overwritten, so
      //         the collision guard never sees it, which is why `[t3]` exits 0 rather than
      //         refuses. a repo that DOES declare the reach yields two entries here —
      //         clamped at `keyrack.source.reach.enumerate [t1]`
      // .note = the payload is a BARE ARRAY of attempts, verified at `invokeKeyrack.ts:576`
      //         (`JSON.stringify(attempts, …)`), not an object with an `attempts` key. a first
      //         draft here guessed `parsed.attempts ?? parsed.granted`, which would have read
      //         `[]` off a live payload and passed a length check it never actually made
      then('exactly one entry carries the name — the peer is omitted, not merged', () => {
        const parsed = JSON.parse(swept.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        const entries = (parsed as { grant?: { slug?: string } }[]).filter(
          (entry) => entry.grant?.slug === 'testorg.test.API_KEY',
        );
        expect(entries).toHaveLength(1);
        expect(entries[0]!.grant).toBeDefined();
        expect(
          (entries[0]! as { grant: { reach?: unknown } }).grant.reach,
        ).toBeUndefined();
      });
    });
  });

  /**
   * .what = the collision the guard CAN see, and it has no relation to reach
   * .why = `asKeyrackKeyName` drops the org AND the env, so `testorg.prep.SHARED_API_KEY`
   *        and `testorg.prod.SHARED_API_KEY` both reduce to `SHARED_API_KEY`. an `--env all`
   *        sweep resolves both, so both would emit the same `export SHARED_API_KEY=` and the
   *        last would silently win — the identical silent LOSS e23 names, one axis over
   *
   * .note = this collision PREDATES reach. it is reachable today on any repo that declares
   *         one key name under two envs, which the `with-keyrack-multi-env` fixture does.
   *         the guard is what makes it loud; this case is what proves the guard fires
   * .note = `--lenient` is load-bearing, not incidental. this fixture also holds keys that
   *         grant for no env, and strict mode bails on those BEFORE the emit loop — so a
   *         strict run exits 2 on the wrong gate and proves no claim about the collision
   */
  given('[case2] one key name declared under two envs', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] every env is unlocked, then sourced together', () => {
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--env', 'all', '--lenient'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // .note = exit 2 EXACTLY, not merely non-zero. `not.toEqual(0)` would pass on a crash
      //         as readily as on the refusal (rule.require.exit-code-semantics)
      then('it refuses rather than emits a set with a silent overwrite', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the variable that two keys would claim', () => {
        expect(result.stderr).toContain('would both export');
        expect(result.stderr).toContain('SHARED_API_KEY');
      });

      // .note = this is the `source`-side twin of the i002 `get` fix: the SAME error class
      //         must render the SAME blocked tree on every command, or one rule reads two
      //         ways per which command a human typed (rule.forbid.surprises)
      then('it renders the blocked treestruct, not a raw error dump', () => {
        // rooted on keyrack's own lock, never the generic `🐚` nor a role mascot
        // (`rule.require.keyrack-emoji-palette`)
        expect(result.stderr).toContain('🔐 keyrack source');
        expect(result.stderr).not.toContain('bummer dude');
        expect(result.stderr).not.toContain('🐢');
        expect(result.stderr).not.toContain('[args]');
      });

      then('no export line is emitted — a partial eval is worse than none', () => {
        expect(result.stdout).not.toContain('export ');
      });

      // .note = the stdout half pairs with the `not.toContain('export ')` above rather than
      //         replaces it. the assertion forbids a partial eval by name; the snapshot
      //         records that the stream is empty ENTIRELY, which catches a stray line that
      //         is not an `export` and would slip past the name check
      then('the reply is snapped', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });
  });

  /**
   * .what = the OTHER refusal `source` can raise about a reach — q2's "a reach requires a
   *         key" — proven to render the same treestruct `[case2]` above proves for e23
   * .why = one command can refuse a reach for two distinct reasons, and until 2026-08-09 the
   *        two rendered DIFFERENTLY: the export collision wore the turtle tree, while the
   *        requires-key rule threw bare and surfaced as a raw `ConstraintError:` dump trailed
   *        by an `[args] keyrack,source,…` echo. so a human met one shape or the other by
   *        which mistake they made — `rule.forbid.surprises`, and nielsen's heuristic 4
   *
   * ⚠️ .why THIS suite = the identical rule was already proven on `get` and on `unlock`, and
   *        both passed the whole time this defect was live. that is the lesson worth a note:
   *        a per-command render can only be proven per command. coverage at two of three
   *        boundaries reads exactly like coverage at three
   *
   * .note = fully hermetic and credential-free. the guard fires at the cli boundary, above
   *         the gitroot read and the context gen, so no manifest and no vault is touched
   */
  given('[case3] a reach named on a sweep, with no key to anchor it', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] source is asked for a reach but given no key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // .note = exit 2 EXACTLY. a bare throw ALSO exits 2 here, so this assertion alone
      //         cannot separate the fixed shape from the broken one — the render assertions
      //         below are what carry the clamp
      then('it refuses with a constraint exit', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the rule and echoes the exid back', () => {
        expect(result.stderr).toContain('--reach requires a key');
        expect(result.stderr).toContain('beav@ehmpathy.com');
      });

      // ⚠️ THE clamp. a bare throw prints `✋ ConstraintError:` with no `🔐` root and trails
      //    an `[args]` echo of the raw argv — both are asserted against here, so a revert of
      //    the catch turns this red on two independent lines
      then('it renders the blocked treestruct, not a raw error dump', () => {
        expect(result.stderr).toContain('🔐 keyrack source');
        expect(result.stderr).not.toContain('bummer dude');
        expect(result.stderr).not.toContain('🐢');
        expect(result.stderr).not.toContain('[args]');
        expect(result.stderr).not.toContain('ConstraintError:');
      });

      // .note = the hint must name `source`, never `get` or `unlock`. that is precisely why
      //         `assertKeyrackReachRequiresKey` shares its message and keeps hints per-caller
      then('the hint is copy-paste and names THIS command', () => {
        expect(result.stderr).toContain('rhx keyrack source');
        expect(result.stderr).toContain('--key');
      });

      then('no export line is emitted', () => {
        expect(result.stdout).not.toContain('export ');
      });

      then('the reply is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });
  });
});
