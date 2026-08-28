import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack session commands', () => {
  /**
   * test case: status command when daemon not reachable
   * verifies graceful handling when no daemon is active
   */
  given('[case1] repo with keyrack manifest, daemon not active', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] status command is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('output indicates daemon not reachable or no keys', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/daemon|not reachable|no keys|empty/i);
      });
    });
  });

  /**
   * test case: relock command (should work even if nothing unlocked)
   * verifies relock is idempotent
   */
  given('[case2] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] relock is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      // .note = `toBeDefined()` was a failhide: a status is ALWAYS defined once a binary
      //         has run, so the assertion passed for a crash exactly as for a success.
      //         relock is idempotent by design, so the honest claim is exit 0
      then('it exits 0 — relock with no keys held is a no-op, not a fault', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] relock with --key flag is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock', '--key', 'TEST_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0 — a named key that holds no grant is a no-op too', () => {
        expect(result.status).toEqual(0);
      });
    });
  });

  /**
   * test case: unlock command (may fail without real vault setup)
   * verifies command is recognized and attempts unlock flow
   */
  given('[case3] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] unlock with duration is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--env', 'test', '--duration', '1h'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('command is recognized', () => {
        // command should be recognized, may fail due to vault setup
        const output = result.stdout + result.stderr;
        expect(output).not.toMatch(/unknown command/i);
      });

      // .note = "not unknown" alone would pass on a crash. this fixture has no vault, so
      //         the honest claim is a NAMED outcome: either the unlock runs, or it is
      //         refused for the reason a human could act on — never a bare stack trace
      then('the outcome is named, whichever way it goes', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/🔓 keyrack unlock|🔐 keyrack unlock|blocked:/);
        expect(output).not.toMatch(/^\s+at .*\(.*:\d+:\d+\)$/m);
      });
    });
  });

  /**
   * test case: `--reach` is a published contract, and its one hard constraint holds
   *
   * .why = a reach names ONE reach of ONE key, so it cannot ride a bulk sweep. that
   *        guard carries the most weight in the design, and it is stated on a cli flag —
   *        so it is owed a clamp at the surface a human actually types, not only at the
   *        domain operation beneath it
   * .note = needs no vault, daemon, or credential: the guard is the first statement of
   *         each handler, so it fires before any lookup
   *
   * .note = ⚠️ this block once carried a deferral of the SUCCESS path to
   *         `5.3.verification`, on the ground that "a successful unlock needs a real
   *         os.secure vault… to provision one is vault setup, not contract exercise".
   *         **that reason was FALSE, and it was false by my own hand** — the
   *         `with-keyrack-reach-source` fixture, which i wrote for the `source` suite,
   *         already provisions two reaches of one key with distinct secrets, in
   *         plaintext `os.direct`, with no age identity and no network. the vehicle that
   *         refutes the deferral sat in the repo while the deferral read as settled.
   *         the success path is now clamped at `[case6]` below, and the lesson is
   *         recorded at `term=miss._.choice.reason.md`: a deferral is a claim with an
   *         expiry date, and the date is never written on it
   */
  given('[case4] a reach named without the key it belongs to', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] unlock names a reach but no key', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('the flag is published, not rejected as unknown', () => {
        const output = result.stdout + result.stderr;
        expect(output).not.toMatch(/unknown option/i);
      });

      then('it is refused, and the refusal names the key as the fix', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--reach requires a key');
        expect(output).toContain('beav@ehmpathy.com');
      });

      // .note = exit 2 is a CONTRACT, not decoration: 2 says "caller-fixable", 1 says
      //         "defect" (`rule.require.exit-code-semantics`). without this line a crash
      //         whose stack trace happened to hold the same words would satisfy every
      //         other assertion in the block, and a caller that reads `$?` would be told
      //         a clear refusal was a malfunction
      then('it exits 2 — a caller-fixable refusal, never a defect', () => {
        expect(result.status).toEqual(2);
      });

      // .note = the assertions above verify the CONTENT; this snaps the whole rendered
      //         experience, so a change to the turtle-blocked tree's structure shows up
      //         in the pr diff rather than only in a terminal a human happens to run
      // .note = ⚠️ this snapshot LOST a leading blank line when unlock's reach guard moved to
      //         the cli boundary (see `[case7]`), and the loss is the fix rendered. that line
      //         came from a bare `console.log('')` whose own comment reads "blank line before
      //         passphrase prompt" — a spacer that exists to pad a prompt. the refusal now
      //         fires BEFORE that prompt is ever set up, so the spacer padded no prompt at
      //         all and is gone. a refusal that opens with a stray newline was the artifact
      // ⚠️ .note = snapped as TWO streams, never as `stdout + stderr`. a concatenation is
      //         BLIND to the exact drift this snapshot exists to catch: content that migrates
      //         from one stream to the other leaves the concatenation byte-identical, so the
      //         snapshot stays green while a refusal quietly moves onto stdout — where a
      //         caller who pipes stdout would then eval it
      //         (rule.require.contract-snapshot-exhaustiveness)
      then('the refusal renders the whole blocked tree: stdout', () => {
        expect(result.stdout).toMatchSnapshot('stdout');
      });

      then('the refusal renders the whole blocked tree: stderr', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });

    when('[t1] get names a reach across a whole-repo sweep', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--for',
            'repo',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('the flag is published on get too', () => {
        const output = result.stdout + result.stderr;
        expect(output).not.toMatch(/unknown option/i);
      });

      then('it is refused rather than silently narrowed to one key', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--reach requires a key');
      });

      then('it exits 2 — a caller-fixable refusal, never a defect', () => {
        expect(result.status).toEqual(2);
      });

      // two streams, never concatenated — see the note at [t0]
      then('the refusal renders the whole blocked tree: stdout', () => {
        expect(result.stdout).toMatchSnapshot('stdout');
      });

      then('the refusal renders the whole blocked tree: stderr', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = the same refusal, from a human who ALREADY named the key
     * .why = `--for repo` wins over `--key` downstream — the `opts.for === 'repo'` branch
     *        asks `for: { repo: true }` and reads neither flag — so this ask genuinely
     *        resolves to a sweep and `keyed: false` is correct. what is NOT correct is to
     *        answer it with `[t1]`'s hint, "name the key", when the human's command line
     *        already holds `--key API_KEY`. that walks them down a road that cannot work:
     *        they add the flag they already typed and meet the identical refusal
     *        (`rule.require.errors-name-the-fix`).
     *
     *        this is the SAME defect shape the collision guard's axis precedence fixed —
     *        a hint is only a fix if it names the axis that actually separates the two.
     *
     * .note = `[t1]` is the twin that must stay still: no `--key`, so "name the key" IS
     *         the fix there, and its snapshot may not move. the two together clamp the
     *         BRANCH, not merely the string — a hint made unconditional in either
     *         direction turns exactly one of them red
     */
    when('[t2] get names a reach AND the key, across a whole-repo sweep', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--for',
            'repo',
            '--key',
            'API_KEY',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it is still refused — a reach cannot ride a sweep', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--reach requires a key');
      });

      // THE clamp. the fix named must be the one the human has NOT applied
      then('the hint names the sweep as the flag to drop', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('drop --for repo');
      });

      // the negative half — without it, a hint that printed BOTH sentences would pass above
      then('it does not tell them to name a key they already named', () => {
        const output = result.stdout + result.stderr;
        expect(output).not.toContain('name the key');
      });

      // the hint must be copy-pasteable: it echoes the key they typed, not a placeholder
      then('the suggested command carries their own key, not $KEY', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--key API_KEY --reach beav@ehmpathy.com');
        expect(output).not.toContain('$KEY');
      });

      then('it exits 2 — a caller-fixable refusal, never a defect', () => {
        expect(result.status).toEqual(2);
      });

      // two streams, never concatenated — see the note at [t0]
      then('the refusal renders the whole blocked tree: stdout', () => {
        expect(result.stdout).toMatchSnapshot('stdout');
      });

      then('the refusal renders the whole blocked tree: stderr', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * .what = e6 at the CLI grain — an unlock aimed at a reach no key was ever cut for
   * .why = this is the DESIGN'S HEADLINE GUARANTEE. under the wish's mint-time shape an
   *        unset reach would have been derived, and the derivation could hand back the
   *        wrong org's token. under reach-as-identity there is no peer to fall back to, so
   *        the ask must fail LOUD — and what a human sees when it does is the whole proof
   *
   * .note = the key NAME exists here and the REACH does not, which is the exact shape a
   *         reach-blind unlock would get wrong: it would find the name, mint, and hand back
   *         a credential for a reach nobody asked for. so this clamps that an addressed
   *         miss stays a miss, at the grain a human actually meets it
   * .note = `unlockKeyrackKeys.test.ts` clamps the message; only this clamps the rendered
   *         experience — the turtle blocked tree, the `keyrack set` hint that names the fix,
   *         and the exit code together (`rule.require.errors-name-the-fix`)
   */
  given('[case5] a key held reachless, asked for at a reach never cut', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // cut the key WITHOUT a reach, so the name exists and the reach does not
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'UNCUT_REACH_KEY',
          '--env',
          'test',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'reachless-secret\n',
      }),
    );

    when('[t0] unlock names a reach that was never cut', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'UNCUT_REACH_KEY',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      // THE clamp. a reach-blind unlock would find the reachless key by name and succeed,
      // so a test that only asserted "it did not crash" would pass while the wish's
      // hardest guarantee was broken
      then('it is refused rather than answered by the reachless key', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain("credential at reach 'beav@ehmpathy.com'");
        expect(output).toContain('does not exist');
      });

      // .note = e6 is the design's headline guarantee, so its exit code carries the most
      //         weight of any in this file: a defect (exit 1) whose text happened to name
      //         the reach and the fix would pass every other assertion here, and the
      //         hardest guarantee would break while the suite stayed green
      then('it exits 2 — a caller-fixable refusal, never a defect', () => {
        expect(result.status).toEqual(2);
      });

      // .note = the WHY is clamped in the HUMAN's words, never the mechanism's. the tree
      //         renders the found slug one line below the refusal, so a bare "not found"
      //         invites "you just printed it, why not use it?" — this line is the answer
      //         to that, and it must stay legible to a human who has no view of the
      //         lookup beneath it (`rule.forbid.ambiguous-labels`)
      then('the refusal says WHY, in plain words', () => {
        expect(result.stdout + result.stderr).toContain(
          'each reach needs its own key',
        );
      });

      then('the refusal names the fix as a copy-paste set command', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack set');
        expect(output).toContain('--reach beav@ehmpathy.com');
      });

      // .note = `asSnapshotSafe`, not a raw snap: this case provisions a real vault, so the
      //         daemon spawns and prints its PID. a raw snapshot would bake that pid in and
      //         fail on the very next run — a flake that gets `--resnap`'d reflexively,
      //         which is how a genuine drift ends up accepted
      // .note = ⚠️ this snapshot opens with TWO blank lines where `[case4]` opens with one,
      //         and the difference is real rather than a capture artifact. both are the same
      //         command, refused for the same class of reason; they differ only in HOW DEEP
      //         the refusal fires:
      //         - `[case4]` is refused at the cli boundary, BEFORE the unconditional
      //           `console.log('')` spacer, so the only blank is the blocked report's own
      //         - `[case5]` is refused inside `unlockKeyrackKeys`, AFTER that spacer has
      //           already fired, so the spacer's blank and the report's blank stack
      //         it is pinned here as the extant truth, NOT smoothed over in the test: the
      //         snapshot is what a human at a terminal actually sees (stdout and stderr
      //         interleave), so a trim here would hide a cadence a human meets
      // .note = the fix is a CLEAN REWORK, deliberately not taken inside this wish's bound —
      //         and the bound was MEASURED rather than asserted. the cause is one shared
      //         cadence: the same unconditional spacer sits on both `unlock`
      //         (invokeKeyrack.ts:1571) and `get` (:1297), and every snapshot of either
      //         command has that blank baked in. counted 2026-08-10 —
      //
      //           grep -U '"\n🔓 keyrack unlock' blackbox/**/*.snap
      //             → 16 entries across 10 files
      //
      //         eight of those files are outside the reach axis entirely (`keyrack.sudo`,
      //         `keyrack.vault.osDirect` / `.osDaemon` / `.osSecure` / `.awsIamSso`,
      //         `keyrack.daemon`, `keyrack.unlock-requires-env`), and the `get` spacer adds
      //         more on top. so to make the spacer fire only when it pads a prompt is a
      //         repo-wide render change, well past a reach axis — flagged for the wisher
      //         rather than smuggled in here (`rule.forbid.surprises` names the defect; the
      //         wish's `.scope` bound names why the fix waits)
      // two streams, never concatenated — see the note at [case4][t0]
      then('the whole blocked tree is snapped: stdout', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('the whole blocked tree is snapped: stderr', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * [case6] THE success path — `unlock --key --reach` end to end, with a read-back
   *
   * .what = a key cut at two reaches, unlocked at ONE of them by name, then read back
   *         to prove the value returned is that reach's and not its peer's
   * .why = this is the wish's core acceptance criterion, and until now it had no clamp at
   *        the grain a human runs. `[case5]` proves the REFUSAL when no key was cut;
   *        without this, the suite proved keyrack could say no and never that it says yes
   *
   * .note = `[case5]` and `[case6]` are the pair, and neither means much alone. together
   *         they are the A/B on the one axis that matters: same command, same key name —
   *         a reach that WAS cut answers, one that was NOT refuses
   * .note = the read-back carries the weight. an unlock that exits 0 and renders a
   *         `reach:` leaf proves the render; only the VALUE proves the address. the two
   *         secrets in the fixture are deliberately distinct strings so the assertion can
   *         name which reach answered (e18: never a peer's credential)
   * .note = fully hermetic — `os.direct` is plaintext on disk, so no age identity, no
   *         network, no credential. this is the vehicle the stale deferral above claimed
   *         did not exist
   *
   * .note = ⚠️ WHICH seam this clamps. `[t1]` runs `get` as its OWN command, after `[t0]`
   *         already unlocked — so it takes `getKeyrackKeyGrants`' pure first-pass read and
   *         never its unlock/re-get branch. dogfooded: drop `reach` from that first-pass
   *         call and `[t1]` turns red. the sdk twin at `blackbox/sdk/keyrack.reach [case4]`
   *         asks with `with: { unlock: true }`, so it clamps the RE-GET instead. two cases,
   *         two seams — a revert that reddens one leaves the other fully green
   */
  given('[case6] a key cut at two reaches, unlocked at one', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-source' }),
    );

    when('[t0] unlock names the key and one of its reaches', () => {
      const result = useThen('it completes', () =>
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
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0 — a reach that was cut answers', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree names the key and the reach it opened', () => {
        expect(result.stdout).toContain('testorg.test.API_KEY');
        expect(result.stdout).toContain('reach: beav@ehmpathy.com');
      });

      // both streams — this is the SUCCESS path, where the empty stderr earns its keep: a
      // stray warn or debug print that appeared there would be invisible to a stdout-only
      // snapshot, and an unlock is the command a human trusts most to be quiet
      then('the unlock tree renders as snapped: stdout', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('the unlock tree renders as snapped: stderr', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });

    // the read-back half — `get --key --reach` (q11) must answer for that reach
    //
    // .note = `get` renders a STATUS tree by design; it never prints a secret. so this
    //         clamps that the ADDRESS resolves — keyrack found a key at that reach
    //         and reports it granted. the VALUE proof is owed too, and it is not deferred:
    //         it lives at the sdk grain, where a grant carries `.key.secret`, in
    //         `blackbox/sdk/keyrack.reach.acceptance.test.ts [case4]`. cli proves the
    //         address, sdk proves the value; between them e18 is closed at both surfaces
    // .note = ⚠️ `keyrack source` takes `--key` but NOT `--reach`, so a shell caller
    //         cannot eval a reach-key's value today — a sweep resolves the reachless key
    //         only (which is deliberate, see `keyrack.source.reach.acceptance.test.ts`),
    //         and a keyed source has no way to name a reach. flagged for the wisher
    when('[t1] the unlocked reach is read back', () => {
      const result = useThen('it completes', () =>
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
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0 — the reach answers a get too', () => {
        expect(result.status).toEqual(0);
      });

      // THE clamp on this half. `[case5]`'s reach reports refused; this one must
      // report GRANTED, off the same command and the same key name
      then('the reach reports granted, not absent', () => {
        expect(result.stdout).toContain('testorg.test.API_KEY');
        expect(result.stdout).toContain('granted');
        expect(result.stdout).not.toContain('absent');
      });

      // ⚠️ the `granted` branch's reach leaf, asserted OUTSIDE the snapshot on purpose. up to
      //    now this leaf was captured by `toMatchSnapshot` alone — and a snapshot-only clamp is
      //    resnappable: delete the leaf, run `--resnap`, and every assertion above stays green
      //    while the one fact the feature exists to surface disappears from the command a
      //    consumer actually calls. `[t0]` asserts the same leaf on the UNLOCK tree; this is
      //    the GET tree, a second render with its own branch in `emitKeyrackKeyBranch`
      then('the get tree names WHICH reach answered', () => {
        expect(result.stdout).toContain('reach: beav@ehmpathy.com');
      });

      // both streams — see the note at [t0]. `get` matters most of the three: its stdout is
      // what a caller reads for a secret, so a line that drifted onto it from stderr would
      // land inside the value a consumer parses
      then('the get tree renders as snapped: stdout', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('the get tree renders as snapped: stderr', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = e10 at the cli grain — a re-unlock of ONE reach is idempotent, and does
     *         not disturb the peer key held beside it
     * .why = e10 was proven only in memory, at `daemonKeyStore.test.ts`. that store is a
     *        `Map` keyed by address, so of course a second `set` at one address replaces one
     *        row — the claim is trivially true there. what it CANNOT see is the path a human
     *        runs: cli → unix socket → daemon, where the address is rebuilt from flags on
     *        each hop. an address rebuilt even slightly differently on the second pass would
     *        write a THIRD row, or overwrite the peer, and no unit test would move
     *
     * .note = the peer here is the REACHLESS key, unlocked between the two reach unlocks.
     *         that sequence is deliberate: it puts a write to a different address in
     *         between, so the re-unlock cannot pass merely because the store sat untouched
     * .note = ⚠️ the two halves catch OPPOSITE regressions, and it is worth naming which is
     *         which — an earlier draft of this note asserted the peer half was the one with
     *         teeth, and the dogfood said otherwise:
     *         - `still answers a get` catches a store keyed by the BARE SLUG. dogfooded:
     *           reverted `daemonKeyStore.set` to `store.set(grant.slug, …)` and this went
     *           red (with `[t1]`'s three), because the peer unlock in between overwrote the
     *           one row and the REACH key is what was lost
     *         - `REACHLESS peer is untouched` catches the mirror: a write that resolves the
     *           reach key onto the peer's address. that one stayed GREEN under the slug-only
     *           revert, which is exactly why both halves are here — neither implies the
     *           other (`rule.require.clamp-edge-cases`)
     */
    when('[t2] the SAME reach is unlocked a second time', () => {
      const unlockPeer = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      const reUnlock = useBeforeAll(async () =>
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
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      // load-bearing precondition: absent this, every claim below could be about a rack
      // that never held the peer at all
      then('the reachless peer really was held first', () => {
        expect(unlockPeer.status).toEqual(0);
      });

      then('the re-unlock exits 0 — idempotent, not a conflict', () => {
        expect(reUnlock.status).toEqual(0);
        expect(reUnlock.stdout).toContain('reach: beav@ehmpathy.com');
      });

      then('the reach still answers a get', () => {
        const result = invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'API_KEY',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('granted');
      });

      // the mirror clamp — the peer must survive a re-unlock aimed at its neighbour.
      // green under the slug-only revert, by design: see the note on this `when`
      then('its REACHLESS peer is untouched by the re-unlock', () => {
        const result = invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'API_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('granted');
        expect(result.stdout).not.toContain('absent');
      });
    });
  });

  /**
   * .what = `[case4]`'s exact ask, on a host whose manifest cannot be decrypted
   * .why = ⚠️ `[case4]`'s own note claims the guard "is the first statement of each handler,
   *        so it fires before any lookup". that was TRUE of `get` and **FALSE of `unlock`**:
   *        unlock's guard lived inside `unlockKeyrackKeys`, which the cli reaches only AFTER
   *        it reads the gitroot, reads the repo manifest, and DECRYPTS the host manifest
   *
   * .note = `[case4]` could not catch that, and the reason is worth a record. its fixture
   *         starts with no host manifest at all, so the decrypt is a silent no-op and the
   *         late guard produces bytes identical to an early one. a hermetic harness that
   *         always holds a healthy manifest makes the two orders indistinguishable — which is
   *         exactly how the defect survived a suite that already covered the refusal
   * .note = so this case supplies the ONE condition that separates them: a manifest that
   *         exists and cannot be read. under the late guard the caller met a raw
   *         `UnexpectedCodePathError` about ssh identities — a cause with zero relation to
   *         the flag they actually got wrong. under the boundary guard they meet the refusal
   * .note = found by a real terminal runthrough, never by a read of the code
   *         (`rule.prefer.prevent-over-correct`, rung 3: catch it early, before the cost)
   */
  given('[case7] a reach without its key, on an unreadable host manifest', () => {
    const repo = useBeforeAll(async () => {
      const made = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      // plant a manifest that EXISTS and cannot be decrypted. plain bytes, not age
      // ciphertext — the point is only that the read fails, and a fake identity would be a
      // second artifact to keep in sync with the age contract for no gain
      await mkdir(join(made.path, '.rhachet', 'keyrack'), { recursive: true });
      await writeFile(
        join(made.path, '.rhachet', 'keyrack', 'keyrack.host.age'),
        'not-age-ciphertext',
      );

      return made;
    });

    when('[t0] unlock names a reach but no key', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      // ⚠️ THE clamp. under the late guard this is `1` — the decrypt blew up first, and a
      //    caller who reads `$?` was told their flag mistake was a defect of ours
      then('it exits 2 — the flag mistake is judged before the manifest is opened', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal is the reach one, and it names the fix', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--reach requires a key');
        expect(output).toContain('beav@ehmpathy.com');
      });

      // the second half of the clamp, and it is not redundant: an exit code alone would pass
      // for any refusal, and what makes this a defect is which cause the human was handed
      then('the ssh-identity error never surfaces — it was never the cause', () => {
        const output = result.stdout + result.stderr;
        expect(output).not.toContain('no identity could decrypt manifest');
        expect(output).not.toContain('UnexpectedCodePathError');
      });
    });
  });
});
