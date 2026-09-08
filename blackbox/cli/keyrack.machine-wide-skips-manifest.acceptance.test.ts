import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genBrokenKeyrackManifestYml } from '@/blackbox/.test/infra/genBrokenKeyrackManifestYml';
// ⚠️ .why.src-import = this ONE helper lives under `src/.test/` rather than beside its peers in
//        `blackbox/.test/`, because an integration test needs it too. a temp-dir helper copied
//        into both trees is a CLEANUP CONTRACT maintained twice — and this helper's contract is
//        exactly the kind that rots when copied: it leaked one dir per spawn until its
//        `SIGINT`/`SIGTERM` handlers were added, a repair a second copy would not have received.
//        so it is hoisted to the one tree both tiers can reach
//        (`rule.require.shared-test-fixtures`)
// .note = `rule.require.acceptance.blackbox` bounds what an acceptance test may INVOKE — the
//        subject must be reached through the published contract, which it is
//        (`invokeRhachetCliBinary`, every row). that rule leaves SETUP free, and this import is
//        setup: it makes a directory and asserts none of the behavior under test
import { genTestTempDirNonRepo } from '@src/.test/infra/genTestTempDirNonRepo';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the cli-grain clamp for `a machine-wide ask must not load a repo manifest it never
 *         consults` — the reported repro of ehmpathy/rhachet#467, end to end
 * .why = the operation-grain clamp (genContextKeyrackGrantGet.integration.test.ts) proves the
 *        branch. this one proves the REPRO: a real git repo, a real broken manifest, the real
 *        binary. a fix that satisfied the operation clamp but left a cli verb that fetches the
 *        gitroot or manifest above its own `@all` branch would pass there and fail here
 *
 * .note = the GUARD row of each case is what gives this clamp teeth. a repo-scoped ask must
 *         STILL fail loud on the same broken manifest — the contract narrows WHEN the manifest
 *         loads, never HOW it fails
 * .note = every ask below is spelled twice where the cli allows it — once by `--org @all`, once
 *         by an `@all.`-prefixed slug — because the two are separate reads of the ask's org and
 *         a fix could serve one without the other
 */
/**
 * .what = swap a run's temp cwd for a stable token, so a render that echoes it can be snapped
 * .why = a refusal that names the cwd is the whole POINT of the [case3] rows — it is the
 *        sentence a human needs to know which directory was rejected. but the path carries a
 *        per-run suffix, so a raw snapshot is green exactly once, on the run that wrote it
 * .note = the swap is on the EXACT path this run used, never a `/tmp/...` pattern, so a real
 *         path a render should have kept cannot be masked by a near-miss match
 * .note = it composes `asSnapshotSafe` FIRST, which strips ansi sgr bytes among other run
 *         volatiles. `emitKeyrackKeyBranch` paints every `tip:` line with `\x1b[2m…\x1b[0m`, so
 *         any row whose render carries a tip would otherwise commit raw escape bytes — the
 *         blemish `rule.forbid.snapshot-visual-blemishes` forbids, and one the peer suites
 *         (`keyrack.get.output`) already avoid by this same call
 * .why.composed = the strip is folded into the ONE masker every snapshot row here already calls,
 *         rather than bolted onto the row that carries a tip today. a per-row fix would leave the
 *         next row that renders a tip free to reintroduce the escapes silently — the axis would
 *         be guarded at one value instead of guarded
 */
const asTempCwdMasked = (input: { output: string; cwd: string }): string =>
  asSnapshotSafe(input.output).split(input.cwd).join('$TESTCWD');

describe('keyrack machine-wide skips manifest', () => {
  given('[case1] a repo whose keyrack.yml extends an absent file', () => {
    // ⚠️ .note.shared-session = `[case1]`'s rows share ONE repo and run in order — `[t0]` seeds
    //        the rack, `[t8]` deletes from it, and the rows between read what the rows before
    //        them wrote. that order is DELIBERATE, and it is what the case is for: the subject is
    //        a rack that survives a manifest which cannot hydrate, and a claim like "the
    //        key `set` wrote is the key `source` yields" can only be made by a case that carries
    //        state across verbs. a per-row repo would test each verb against a rack it seeded
    //        itself, which is a weaker question and the one `[case2]` already asks
    // .the cost, and how it is bounded = an ordered case can hide a defect behind a neighbour's
    //        state. so every MUTATION states its reach in its own `.why`, and the rows after a
    //        `del` name their OWN slugs rather than lean on what is left. the cases that must be
    //        order-free are separate givens — `[case3]` and `[case4]` each build a fresh cwd
    // .note = the decision lives beside the code it governs, so a reader finds it without a
    //         review-file hunt
    const repo = useBeforeAll(async () => {
      const made = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      const { writeFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      writeFileSync(
        join(made.path, '.agent', 'keyrack.yml'),
        genBrokenKeyrackManifestYml({ repoKey: 'REPO_KEY' }),
      );
      return made;
    });

    when('[t0] a machine-wide key is set by --org @all', () => {
      // .why = `set` fetched a STRICT gitroot and then the manifest, both above its own
      //        `--org @all` branch — so the verb advertised a flag its own preamble forbade
      const result = useThen('the set succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MACHINE_KEY',
            '--env',
            'camp',
            '--org',
            '@all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'machine-secret-value\n',
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the slug is machine-wide, never the repo org', () => {
        const parsed = JSON.parse(result.stdout) as { slug: string };
        expect(parsed.slug).toEqual('@all.camp.MACHINE_KEY');
      });
    });

    when('[t1] that key is unlocked by --org @all', () => {
      const result = useThen('the unlock succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'MACHINE_KEY',
            '--env',
            'camp',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('only the machine-wide key is swept', () => {
        const parsed = JSON.parse(result.stdout) as {
          unlocked: Array<{ slug: string }>;
        };
        expect(parsed.unlocked.map((k) => k.slug)).toEqual([
          '@all.camp.MACHINE_KEY',
        ]);
      });

      // ⚠️ .why.snapped = the row above pins which slugs the sweep touched; this pins the tree a
      //        human reads. an unlock render carries a per-key branch and a tally line, and a
      //        warn about the manifest it skipped would ride beside them — unseen by a slug-list
      //        equality on the parsed json
      // ⚠️ .why.masked = `unlock --json` emits the SECRET in its payload, beside a
      //        `protection: "plaintext"` grade. that is the verb's real contract and the
      //        snapshot must show it — but the VALUE is replaced. a snapshot is a committed,
      //        human-read artifact, and a credential-shaped literal in one teaches the next
      //        author that a snapped secret is normal. `$SECRET` keeps the shape, the grade,
      //        and the position, which is the whole fact a reviewer needs
      then('the render a human sees is snapped', () => {
        const asSecretMasked = (output: string): string =>
          asTempCwdMasked({ output, cwd: repo.path })
            .split('machine-secret-value')
            .join('$SECRET');

        expect({
          stdout: asSecretMasked(result.stdout),
          stderr: asSecretMasked(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t2] that key is read by an @all slug — THE REPRO', () => {
      const result = useThen('the get succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.camp.MACHINE_KEY',
            '--value',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 — the broken manifest is never loaded', () => {
        expect(result.status).toEqual(0);
      });

      then('the secret is yielded', () => {
        expect(result.stdout.trim()).toEqual('machine-secret-value');
      });

      // ⚠️ .why.snapped = the row above pins the VALUE; this pins the RENDER. a `--value` read
      //        is a credential-helper contract, so a stray banner, a warn about the manifest
      //        that could not hydrate, or an extra newline at the end of stderr each break a
      //        consumer that pipes it — and each passes a `.trim()` equality untouched. this is
      //        the reported repro itself, so its render is the one a human reviews in a diff
      //        (`rule.require.acceptance-journey-coverage`)
      then('both streams match snapshot', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    when('[t3] that key is read by --org @all', () => {
      const result = useThen('the get succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'MACHINE_KEY',
            '--env',
            'camp',
            '--org',
            '@all',
            '--value',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 — the two spellings agree', () => {
        expect(result.status).toEqual(0);
      });

      then('the secret is yielded', () => {
        expect(result.stdout.trim()).toEqual('machine-secret-value');
      });

      // ⚠️ .why.snapped = the flag form must render byte for byte like the slug form snapped in
      //        [t2]. the asserts above compare a trimmed value, so an extra newline, a banner,
      //        or a warn reached by this form alone would pass them untouched — and the two
      //        snapshots sit four rows apart, which is what makes a divergence visible
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    when('[t3a] a STILL-LOCKED machine-wide key is read with --unlock', () => {
      // .why = the one row that reaches the SECOND manifest load
      //        (getKeyrackKeyGrants.ts:179-182). t2/t3 read a key that [t1] had already
      //        unlocked, so they return from the first pass and never touch it. a fix applied
      //        only to genContextKeyrackGrantGet would pass every other row here and still die
      //        on the reported repro, because that repro passes --unlock
      // .note = env is `prep`, deliberately — [t1]'s sweep was scoped to `camp`, so this key is
      //         guaranteed still locked when the read below asks for it
      const setResult = useThen('the set succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'LOCKED_KEY',
            '--env',
            'prep',
            '--org',
            '@all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'locked-secret-value\n',
        }),
      );

      then('the key is staged as machine-wide', () => {
        const parsed = JSON.parse(setResult.stdout) as { slug: string };
        expect(parsed.slug).toEqual('@all.prep.LOCKED_KEY');
      });

      const result = useThen('the get succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.prep.LOCKED_KEY',
            '--unlock',
            '--value',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 — neither load ran', () => {
        expect(result.status).toEqual(0);
      });

      then('the secret is yielded through the unlock pass', () => {
        expect(result.stdout.trim()).toEqual('locked-secret-value');
      });

      // ⚠️ .why.snapped = this is the one row whose read grants a key on its way, so its render
      //        is the only place the unlock pass can leak. a grant line, a daemon notice, or a
      //        prompt emitted onto stdout would corrupt a credential-helper pipe and still pass
      //        the trimmed-value equality above
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    when('[t3b] that key is SOURCED by --org @all', () => {
      // .why = `source` forwards the ask to getOneKeyrackGrantByKey, and that call hardcoded
      //        `org: undefined` — correct while the verb had no --org, a gap the moment it
      //        gained one. the flag skipped the manifest and then could not build the slug, so
      //        a bare key fell through every branch and threw 'no keyrack.yml found in repo'
      //        for a key that needs no keyrack.yml. a skip that cannot then answer is worse
      //        than no skip at all, so this row is not optional
      const result = useThen('the source succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'source',
            '--key',
            'MACHINE_KEY',
            '--env',
            'camp',
            '--org',
            '@all',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it emits an export for the machine-wide key', () => {
        expect(result.stdout).toContain('MACHINE_KEY');
      });

      // ⚠️ .why.snapped = a `toContain` on the key name passes for any line that merely mentions
      //        it. stdout here is eval'd by the caller's shell, so only the render pins the
      //        export form — one line per key, its quotes, and a stderr that stays clear of the
      //        stream a shell will run
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    when('[t9] a MACHINE-WIDE set is asked with --at, from INSIDE the repo', () => {
      // ⚠️ .why = THE clamp for the cwd-keyed refusal. `--at` + `--org @all` is a contradiction
      //        in the ASK, so it must refuse identically wherever it runs. keyed on `!gitroot`
      //        instead, this exact command found a gitroot here and went on to HYDRATE the
      //        broken manifest — which recreates the reported defect one flag over: a
      //        machine-wide set that dies on an `extends` it never needed
      // .note = case1's manifest extends an absent file, so a hydrate here throws loud. that is
      //         what makes this row able to tell a refusal from a hydrate
      const result = useThen('the set is attempted', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'FOO',
            '--env',
            'camp',
            '--org',
            '@all',
            '--at',
            '.agent/keyrack.yml',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'x\n',
          logOnError: false,
        }),
      );

      then('it refuses on the contradiction, never on the extends', () => {
        expect(result.status).toEqual(2);
        const output = result.stdout + result.stderr;
        expect(output).toContain('contradictory');
        // the tell: a hydrate would name the absent extends target instead
        expect(output).not.toMatch(/extended keyrack not found|does-not-exist/i);
      });

      // ⚠️ .why = the row above pins WHY it refused; this pins what a human READS. a render
      //    that loses the `🔐 keyrack` tree, dumps a class name, or drops the `fix:` leaf
      //    still exits 2 and still holds the word "contradictory", so it sails through both
      //    asserts. `[case3][t2]` snaps this same contradiction from a NON-repo cwd — the two
      //    are the in-repo and out-of-repo halves of one refusal, and only the pair can show
      //    they agree (`rule.require.contract-snapshot-exhaustiveness`)
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    when('[t4] a REPO-scoped key is read from the same repo — THE GUARD', () => {
      // .why = this row is what makes the clamp bite. the fix narrows WHEN the manifest loads;
      //        it must not soften HOW it fails for an ask that genuinely needs one
      const result = useThen('the get is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'REPO_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits non-zero', () => {
        expect(result.status).not.toEqual(0);
      });

      then('it still names the absent extends target', () => {
        expect(result.stdout + result.stderr).toMatch(
          /extended keyrack not found|does-not-exist/i,
        );
      });

      // ⚠️ .why.snapped = the regex above proves the refusal MENTIONS the absent target; it
      //        cannot prove the refusal still READS as one. the contract narrows when a manifest
      //        loads, and the promise it must not break is that an ask which genuinely needs
      //        one fails LOUD — so the shape of that failure is the contract, not just its
      //        substring. a refusal degraded to a bare stack trace, or one that lost its `fix:`
      //        leaf, satisfies the regex and fails the promise
      then('the refusal render matches snapshot', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t5] a repo SWEEP is asked from the same repo — THE GUARD', () => {
      const result = useThen('the get is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits non-zero', () => {
        expect(result.status).not.toEqual(0);
      });

      then('it still names the absent extends target', () => {
        expect(result.stdout + result.stderr).toMatch(
          /extended keyrack not found|does-not-exist/i,
        );
      });

      // .why.snapped = the sweep twin of [t4]'s guard — same promise, the other ask shape
      then('the refusal render matches snapshot', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t6] the rack is LISTED by --org @all', () => {
      // .why = `list` and `status` are class-1 verbs — they had no --org at all, so the path
      //        from flag to filter is entirely new. the transformer that expands the flag is
      //        clamped on its own (cli/getOneKeyrackFilterOrg.integration.test.ts), but a
      //        transformer that is never reached serves no one. this row proves it is reached
      const result = useThen('the list succeeds', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 — a rack read needs no repo manifest either', () => {
        expect(result.status).toEqual(0);
      });

      then('every slug listed is machine-wide', () => {
        const hosts = JSON.parse(result.stdout) as Record<string, unknown>;
        const slugs = Object.keys(hosts);
        expect(slugs.length).toBeGreaterThan(0);
        expect(slugs.every((slug) => slug.startsWith('@all.'))).toEqual(true);
      });

      then('the machine-wide keys set above are the ones listed', () => {
        const hosts = JSON.parse(result.stdout) as Record<string, unknown>;
        expect(Object.keys(hosts).sort()).toEqual([
          '@all.camp.MACHINE_KEY',
          '@all.prep.LOCKED_KEY',
        ]);
      });

      // ⚠️ .why.snapped = the rows above pin WHICH keys the filter yields; this pins the SHAPE
      //        each one is spelled in. `--json` is a machine contract, so a renamed field, an
      //        extra key, or a dropped one is a breaking change to every consumer — and every
      //        such change passes a `Object.keys(hosts)` assertion untouched
      //        (`rule.require.contract-snapshot-exhaustiveness`)
      // .why.field-names = the NAMES are snapped rather than the values, because an entry's
      //        values carry per-run volatiles (vault coordinates, mint times) while its shape
      //        is the part a consumer binds to. this keeps the snapshot stable by construction
      //        rather than by a mask that must be maintained
      then('each listed entry keeps its declared field shape', () => {
        const hosts = JSON.parse(result.stdout) as Record<
          string,
          Record<string, unknown>
        >;
        expect(
          Object.fromEntries(
            Object.entries(hosts).map(([slug, entry]) => [
              slug,
              Object.keys(entry).sort(),
            ]),
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t7] the session is STATUSED by --org @all', () => {
      const result = useThen('the status succeeds', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the machine-wide keys unlocked above are the ones reported', () => {
        // ⚠️ .why = the set is PINNED, never merely `.every(...)`. `[].every()` is `true`, so an
        //         `.every` row alone stays green when the filter wrongly empties the rack — a
        //         test that passes while it verifies no behavior at all
        //         (code.test/rule.forbid.failhide). the guard below is what gives it teeth
        const parsed = JSON.parse(result.stdout) as {
          keys?: Array<{ slug: string; org: string }>;
        };
        const keys = parsed.keys ?? [];

        // .note = BOTH machine-wide keys set earlier in this case are held by the session, so
        //         both are owed. the point of the pin is that the SET is named, never that it is
        //         small — a filter that dropped one would be as wrong as one that added a repo key
        expect(keys.length).toBeGreaterThan(0);
        expect(keys.map((key) => key.slug).sort()).toEqual([
          '@all.camp.MACHINE_KEY',
          '@all.prep.LOCKED_KEY',
        ]);
        expect(keys.every((key) => key.org === '@all')).toEqual(true);
      });

      // .why.snapped = the `status --json` twin of [t6]'s shape clamp — same machine contract,
      //        same blind spot, same volatility-free form (field names, never their values)
      then('each reported key keeps its declared field shape', () => {
        const parsed = JSON.parse(result.stdout) as {
          keys?: Array<Record<string, unknown>>;
        };
        expect(
          (parsed.keys ?? []).map((key) => Object.keys(key).sort()),
        ).toMatchSnapshot();
      });
    });


    when('[t8] a machine-wide key is DELETED by --org @all', () => {
      // .why = `del` is the twin of [t0]'s `set` — both are class-2 verbs whose STRICT gitroot
      //        sat above their own `--org @all` branch (invokeKeyrack.ts:1070 for set, :1308 for
      //        del), and both carry the identical repair. with only the `set` row
      //        present, a revert of the `del` half of that repair left every other cli row green
      // ⚠️ .note.order = this row is MACHINE_KEY's teardown, so it must follow every row that
      //         READS that key — [t2], [t3], [t6] — because the repo and the daemon are shared
      //         across the whole case. rows below it ([t10], [t11]) name their OWN slugs and
      //         touch MACHINE_KEY not at all, so they sit after the teardown safely. a NEW row
      //         that reads MACHINE_KEY belongs ABOVE here, never below
      const result = useThen('the del succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'MACHINE_KEY',
            '--env',
            'camp',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 — the broken manifest is never loaded', () => {
        expect(result.status).toEqual(0);
      });

      then('it never names the absent extends target', () => {
        expect(result.stdout + result.stderr).not.toMatch(
          /extended keyrack not found|does-not-exist/i,
        );
      });

      then('the key is gone from the rack', async () => {
        const listed = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const hosts = JSON.parse(listed.stdout) as Record<string, unknown>;
        expect(Object.keys(hosts)).not.toContain('@all.camp.MACHINE_KEY');
      });

      // ⚠️ .why.snapped = the rows above pin the exit code, the absence of the extends text, and
      //        the rack after. none of the three shows what the human is told a del just did —
      //        so a render that named the wrong slug, or that dropped its tree for a bare line,
      //        stays green on all of them
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    /**
     * .why = [t0] and [t8] spell `--org @all` explicitly, so both passed while `set`/`del`
     *        accepted ONLY that form. but a full slug NAMES its own org — which is how [t2]
     *        (`get`) and [t3b] (`source`) already take a machine-wide key with no flag at all.
     *        so a human who learns the slug idiom from the read verbs met a refusal on the write
     *        verbs, for an ask whose manifest the very same command had just skipped
     * .note = these two rows are the ONLY ones that go red on the flag-keyed org read. every
     *         `--org @all` row above stays green under it — so a suite without these two rows
     *         cannot detect the gap at all (rule.require.clamp-edge-cases)
     */
    when('[t10] a machine-wide key is set by a BARE @all slug — no --org flag', () => {
      const result = useThen('the set succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            '@all.camp.SLUG_KEY',
            '--env',
            'camp',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'slug-secret-value\n',
          logOnError: false,
        }),
      );

      then('it exits 0 — the slug names the org, so no flag is owed', () => {
        expect(result.status).toEqual(0);
      });

      then('it never refuses for want of a keyrack.yml', () => {
        expect(result.stdout + result.stderr).not.toMatch(
          /no keyrack\.yml found/i,
        );
      });

      then('the slug is machine-wide, and is not re-prefixed', () => {
        const parsed = JSON.parse(result.stdout) as { slug: string };
        expect(parsed.slug).toEqual('@all.camp.SLUG_KEY');
      });

      // ⚠️ .why.snapped = the parsed field proves the org was not re-prefixed; the render proves
      //        what the human is told about it. a set that echoed back the flag-form slug in its
      //        prose while the json field stayed correct, or that added a warn about the
      //        manifest it skipped, passes every assert above
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });

    when('[t11] that same key is deleted by a BARE @all slug — no --org flag', () => {
      // ⚠️ the rack is read BEFORE the del, so `gone` below has teeth. asked only after, the
      //    assert passes whether the key was removed or was never written under that name at
      //    all — which is exactly what happened while `set` re-prefixed the slug: [t10] wrote
      //    `@all.camp.@all.camp.SLUG_KEY`, so a `not.toContain('@all.camp.SLUG_KEY')` was true
      //    by accident (rule.forbid.failhide)
      // .note = held one level INSIDE an object — a bare array from `useThen` is a lazy proxy,
      //         and a proxy is not iterable, so `toContain` throws rather than asserts
      const listedBefore = useThen('the rack holds the key [t10] set', async () => {
        const listed = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return {
          slugs: Object.keys(
            JSON.parse(listed.stdout) as Record<string, unknown>,
          ),
        };
      });

      then('the key is present under its exact slug, before the del', () => {
        expect(listedBefore.slugs).toContain('@all.camp.SLUG_KEY');
      });

      const result = useThen('the del succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            '@all.camp.SLUG_KEY',
            '--env',
            'camp',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0 — the twin of [t10], through the same one read', () => {
        expect(result.status).toEqual(0);
      });

      then('it never refuses for want of a keyrack.yml', () => {
        expect(result.stdout + result.stderr).not.toMatch(
          /no keyrack\.yml found/i,
        );
      });

      then('the key is gone from the rack', async () => {
        const listed = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const hosts = JSON.parse(listed.stdout) as Record<string, unknown>;
        expect(Object.keys(hosts)).not.toContain('@all.camp.SLUG_KEY');
      });

      // ⚠️ .why.snapped = the twin of [t10] on the delete half, and the render is where the two
      //        can drift apart. the asserts pin the exit code and the rack before and after, so
      //        only the snapshot holds the sentence a human gets when a bare machine-wide slug
      //        is dropped — and holds it to the same shape the `--org @all` del emits in [t8]
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({ output: result.stdout, cwd: repo.path }),
          stderr: asTempCwdMasked({ output: result.stderr, cwd: repo.path }),
        }).toMatchSnapshot();
      });
    });
  });

  /**
   * .why = [case1]'s rack holds ONLY machine-wide keys, because its manifest is too broken to
   *        set a repo key against. so its `--org @all` rows would pass with the filter deleted
   *        — a clamp with no teeth (rule.require.clamp-edge-cases). this case gives the filter
   *        something it MUST exclude, and is the only place `--org @this` can be exercised end
   *        to end, since that sigil expands through a manifest that must actually load
   */
  given('[case2] a HEALTHY repo whose rack holds both provenances', () => {
    const repo = useBeforeAll(async () => {
      const made = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      const { writeFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      writeFileSync(
        join(made.path, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - REPO_KEY
`,
      );
      return made;
    });

    const setRepoKey = useThen('a repo-scoped key is set', async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'REPO_KEY',
          '--env',
          'test',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault',
          'os.direct',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'repo-secret\n',
      }),
    );

    const setAllKey = useThen('a machine-wide key is set', async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'MACHINE_KEY',
          '--env',
          'camp',
          '--org',
          '@all',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault',
          'os.direct',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'machine-secret\n',
      }),
    );

    then('the rack now holds one slug of each provenance', () => {
      expect((JSON.parse(setRepoKey.stdout) as { slug: string }).slug).toEqual(
        'testorg.test.REPO_KEY',
      );
      expect((JSON.parse(setAllKey.stdout) as { slug: string }).slug).toEqual(
        '@all.camp.MACHINE_KEY',
      );
    });

    when('[t0] the rack is listed with NO --org — THE GUARD', () => {
      // .why = the default must stay "no filter". this row asserts the new flag changed no
      //        extant behavior, and it is the row that would go red on a stray default
      const result = useThen('the list succeeds', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('BOTH provenances are listed', () => {
        const slugs = Object.keys(
          JSON.parse(result.stdout) as Record<string, unknown>,
        );
        expect(slugs.filter((s) => s.startsWith('@all.'))).toEqual([
          '@all.camp.MACHINE_KEY',
        ]);
        expect(slugs.filter((s) => s.startsWith('testorg.'))).toContain(
          'testorg.test.REPO_KEY',
        );
      });
    });

    when('[t1] the rack is listed by --org @all', () => {
      const result = useThen('the list succeeds', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('every repo slug is excluded', () => {
        const slugs = Object.keys(
          JSON.parse(result.stdout) as Record<string, unknown>,
        );
        expect(slugs).toEqual(['@all.camp.MACHINE_KEY']);
      });
    });

    when('[t2] the rack is listed by --org @this', () => {
      // .why = `@this` is a SIGIL, never a literal slug segment. compared verbatim it matches
      //        zero slugs and renders an empty rack, which a human reads as "you have no repo
      //        keys" rather than "that flag needs an expansion"
      const result = useThen('the list succeeds', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@this', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('the sigil expands to the manifest org, so repo slugs show', () => {
        const slugs = Object.keys(
          JSON.parse(result.stdout) as Record<string, unknown>,
        );
        // ⚠️ .note = the length is pinned FIRST, so the `.every` below can never be the vacuous
        //         `[].every() === true`. the `toContain` above happens to guarantee it today,
        //         which makes the guarantee incidental — one edit away from an `.every` that
        //         verifies no behavior at all (code.test/rule.forbid.failhide)
        expect(slugs.length).toBeGreaterThan(0);
        expect(slugs).toContain('testorg.test.REPO_KEY');
        expect(slugs.every((s) => s.startsWith('testorg.'))).toEqual(true);
        expect(slugs.filter((s) => s.startsWith('@all.'))).toEqual([]);
      });
    });

    when('[t2a] the rack is STATUSED by --org, as a HUMAN reads it', () => {
      // ⚠️ .why = every other `status --org` row asserts through `JSON.parse`, which pins the
      //        DATA and proves none of the render. `status` is a class-1 sweep verb whose `--org`
      //        is new, and a human reads its tree, never its json. a lost label, a
      //        stray `└─`, a wrong branch glyph, a mascot that crept back — each of those passes
      //        every json assert and reaches a human unchanged. `list`'s success trees are
      //        snapped just above; its peer verb's were not
      //        (`rule.forbid.friction-hazards`: a reviewer must see the actual experience)
      //
      // .note = this case is the HEALTHY repo, so BOTH narrows succeed here. in `[case1]`, whose
      //         manifest cannot load, `--org @this` correctly refuses — that split is the
      //         subject of its own rows there, never of a success snapshot
      // ⚠️ .note = the rack is UNLOCKED first, and that is what makes this row a test of the
      //         filter. `status` reads the SESSION, never the manifest — so against a cold
      //         daemon both narrows render the same `daemon: not found` tree, and a snapshot of
      //         that pins no claim about `--org` at all. the bare unlock is the union default,
      //         so it holds one key of EACH provenance — exactly the set the two narrows must
      //         then split (`code.test/rule.forbid.failhide`: a snapshot over an empty subject
      //         is green for a reason unrelated to its name)
      const results = useThen('both narrows succeed', async () => {
        const shared = { cwd: repo.path, env: { HOME: repo.path } };
        // .note = TWO envs, because this case's two keys live in different ones —
        //         `testorg.test.REPO_KEY` and `@all.camp.MACHINE_KEY`. both bare (no `--org`),
        //         so each takes the union default and the session ends up with one key of each
        //         provenance, which is the set the narrows below must split
        // ⚠️ .note = the seeds are CAPTURED, never fire-and-forget. an unlock that fails leaves a
        //         cold session, and the two `toContain` pins below then go red against the
        //         FILTER — a cause that is not the true one. so the seeds are asserted first,
        //         and a failed seed reports itself (`rule.require.failloud`: a symptom must name
        //         its own source rather than borrow the next assert's)
        const seeds = ['test', 'camp'].map((env) =>
          invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'unlock', '--env', env],
          }),
        );
        return {
          seeds,
          all: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'status', '--org', '@all'],
          }),
          this: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'status', '--org', '@this'],
          }),
        };
      });

      then('both seed unlocks succeed — the session is warm before it is read', () => {
        // .why = `status` reads the SESSION. an unattributed seed failure would surface two
        //        asserts later as a filter defect, so it is caught here instead
        expect(results.seeds.map((seed) => seed.status)).toEqual([0, 0]);
      });

      then('each exits 0', () => {
        expect({ all: results.all.status, this: results.this.status }).toEqual({
          all: 0,
          this: 0,
        });
      });

      then('each render carries the keys its narrow owns, and only those', () => {
        // ⚠️ .why = the teeth the snapshot below cannot grow on its own. a snapshot records
        //         whatever it is handed, so an empty rack (a cold daemon, a filter that
        //         excluded everything) snaps just as green as a correct one. these two pins are
        //         what make the snapshot a record of the FILTER rather than of a blank tree
        expect(results.all.stdout).toContain('@all.camp.MACHINE_KEY');
        expect(results.all.stdout).not.toContain('testorg.test.REPO_KEY');
        expect(results.this.stdout).toContain('testorg.test.REPO_KEY');
        expect(results.this.stdout).not.toContain('@all.camp.MACHINE_KEY');
      });

      then('neither render wears a role mascot', () => {
        // .why = keyrack roots on `🔐` and its own palette, so this cli surface takes no one
        //        role's face (`rule.require.keyrack-emoji-palette`)
        for (const result of [results.all, results.this])
          expect(result.stdout + result.stderr).not.toContain('🐢');
      });

      then('the filtered rack each human reads is snapped', () => {
        // ⚠️ .note = the DURATIONS are masked. a held key renders the ttl it has left, which
        //         counts down between the two invocations above — so a raw snapshot of it is
        //         green exactly once, on the run that wrote it. the labels, the tree, and which
        //         slugs appear under which narrow are what this row pins, and none of those
        //         vary (`rule.require.snapshot-verified-on-independent-run`)
        const asDurationMasked = (output: string): string =>
          asSnapshotSafe(output)
            .replace(/\d+h\s*\d+m/g, '<TTL>')
            .replace(/\d+m\s*\d+s/g, '<TTL>')
            .replace(/\b\d+[hms]\b/g, '<TTL>');
        expect({
          all: asDurationMasked(results.all.stdout),
          this: asDurationMasked(results.this.stdout),
        }).toMatchSnapshot();
      });
    });

    when('[t2b] the SAME warm rack is narrowed to an org that holds none', () => {
      // ⚠️ .why = this is the journey `define.invariant.empty-render-names-its-cause` governs,
      //        and it is clamped elsewhere only at the RENDERER grain
      //        (`asKeyrackListTreestruct.test.ts [case3]`, `asKeyrackStatusEmptyNotice.test.ts
      //        [case1]/[case4]`). a pure clamp proves the sentence is right when it is handed the
      //        right arguments; it proves none of whether the ORCHESTRATOR hands them over.
      //        `countBefore` is computed in `invokeKeyrack.ts` and passed down — so a wrong count,
      //        an unwired narrow, or a fix line built from the expanded org rather than the
      //        spelled one all pass every unit row and reach a human unchanged
      //
      // .note = the two `[t2a]` narrows are both NON-empty by design, and `[t5]`/`[t5b]` snap the
      //         `@all` sweep, which is empty BY CONSTRUCTION. neither is this case: here the rack
      //         genuinely holds keys and the filter matched none of them — the one shape where the
      //         honest answer and the lying answer are the same bytes
      // .note = `someorg` rather than a near-miss typo like `@al`: an org that simply holds no key
      //         on this box is the LEGITIMATE ask whose honest answer is an empty set, so it pins
      //         exit 0 as well as the sentence. a typo would test the same branch and invite a
      //         reader to think the exit code should have moved
      const results = useThen('both narrows answer', async () => {
        const shared = { cwd: repo.path, env: { HOME: repo.path } };
        // .note = the seeds are the SAME two the row above uses, and they are asserted below for
        //         the same reason: against a cold daemon `status` renders `daemon: not found`,
        //         which would satisfy "no key is listed" for a cause that is not the filter
        // ⚠️ .why.awaited = the seeds are AWAITED before the reads are even started. `status`
        //        reads the SESSION, so a read that races its own seed hits a cold daemon and
        //        renders `daemon: not found` — which satisfies "no key is listed" for a cause
        //        that is not the filter, and would make this row green for the wrong reason
        //        (`code.test/rule.forbid.failhide`). the sibling rows in this `given` are safe
        //        from that only because an earlier row happened to warm the daemon first; this
        //        row does not lean on its neighbours
        const seeds = await Promise.all(
          ['test', 'camp'].map((env) =>
            invokeRhachetCliBinary({
              ...shared,
              args: ['keyrack', 'unlock', '--env', env],
            }),
          ),
        );
        return {
          seeds,
          status: await invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'status', '--org', 'someorg'],
          }),
          list: await invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'list', '--org', 'someorg'],
          }),
        };
      });

      then('both seed unlocks succeed — the rack is warm and non-empty', () => {
        expect(results.seeds.map((seed) => seed.status)).toEqual([0, 0]);
      });

      then('each exits 0 — an empty narrow is an answer, never a refusal', () => {
        // .why = `--org someorg` for an org with no key on this box is a legitimate ask. an empty
        //        narrow answers through the SENTENCE, never through the exit code
        //        (`rule.require.exit-code-semantics`)
        expect({
          status: results.status.status,
          list: results.list.status,
        }).toEqual({ status: 0, list: 0 });
      });

      then('the FILTER bit — neither render lists a key', () => {
        // ⚠️ the teeth the snapshot cannot grow on its own: without these, a render that listed
        //    every key would snap just as green as one that listed none
        for (const result of [results.status, results.list]) {
          expect(result.stdout).not.toContain('@all.camp.MACHINE_KEY');
          expect(result.stdout).not.toContain('testorg.test.REPO_KEY');
        }
      });

      then('each names the FILTER as the cause, never the rack', () => {
        // ⚠️ the invariant itself: the lying render says "you have no keys" for a rack that holds
        //    them. these two pins are what tell the honest empty answer from the lying one
        expect(results.list.stdout).toContain('no keys matched this filter');
        expect(results.list.stdout).toContain('--org someorg');
        expect(results.status.stdout).toContain('someorg');
        for (const result of [results.status, results.list]) {
          expect(result.stdout).not.toContain('no keys configured on host');
          expect(result.stdout).not.toContain('(no keys unlocked)');
        }
      });

      then('the count BEFORE the narrow reaches the human', () => {
        // .why = `countBefore` is computed in the orchestrator and handed down. a unit clamp can
        //        only prove the renderer spells whatever number it is given; this proves the
        //        number is the rack's true size rather than the filtered zero
        expect(results.list.stdout).toContain('keys held on this host');
      });

      then('each render carries a runnable next move', () => {
        // `rule.require.errors-name-the-fix` — an empty answer owes a next move, same as an error
        expect(results.list.stdout).toContain('fix:');
        expect(results.status.stdout).toContain('--org');
      });

      then('the empty render each human reads is snapped', () => {
        // ⚠️ .note = the host key COUNT is masked. this repo's fixture rack grows whenever a
        //         sibling row sets a key, so a raw count is green exactly once
        //         (`rule.require.snapshot-verified-on-independent-run`)
        const asCountMasked = (output: string): string =>
          asSnapshotSafe(output).replace(
            /of: \d+ keys held/g,
            'of: <N> keys held',
          );
        expect({
          status: asCountMasked(results.status.stdout),
          list: asCountMasked(results.list.stdout),
        }).toMatchSnapshot();
      });
    });

    when('[t3] a FULL repo slug is sourced with --org @all — THE GUARD', () => {
      // ⚠️ .why = `--org` carries TWO arities, and this row pins the boundary between them. on a
      //        SWEEP it FILTERS the set; on a KEYED ask it SELECTS the slug segment. the keyed
      //        path already honors it as a selector, and a full slug outranks the flag there
      //        (getOneKeyrackGrantByKey.ts:45-50 returns the slug verbatim) — so `@all` here
      //        still yields `testorg.test.REPO_KEY`, correctly.
      //
      //        to ALSO run the sweep filter over that result applies one flag twice under two
      //        senses: the resolved slug carries org `testorg`, an `@all` filter excludes it,
      //        and the human who named a key by its full slug gets an EMPTY export with no
      //        error — a silent wrong answer, not a failure. that is why the filter is gated to
      //        the sweep path, and why this row exists to hold the gate shut
      const result = useThen('the source succeeds', async () => {
        // .why = `source` emits only GRANTED keys and has no --unlock of its own, so the repo
        //        key must be unlocked first. without this the verb refuses it as locked (exit
        //        2) — a true refusal, but one that says zero about the filter arity this row
        //        exists to hold, and it would mask the very drop it guards against
        // ⚠️ .note = the seed is CAPTURED and asserted below. discarded, a failed unlock would
        //         surface as an empty export — which is the exact defect this row hunts, so the
        //         row would report the wrong cause (`rule.require.failloud`)
        const seed = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--key', 'REPO_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });

        const sourced = invokeRhachetCliBinary({
          args: [
            'keyrack',
            'source',
            '--key',
            'testorg.test.REPO_KEY',
            '--org',
            '@all',
            // .why = `source` declares --env REQUIRED, so it must be spelled even where the
            //        slug makes it inert: a full slug carries its own env and
            //        getOneKeyrackGrantByKey returns it verbatim without a read of this flag
            //        (:45-53). to omit it fails at commander, BEFORE the arity gate under test
            //        is ever reached — so the row would report a failure whose cause is
            //        unrelated to the boundary it exists to hold
            '--env',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });

        return { seed, sourced };
      });

      then('the seed unlock succeeds — the key is granted before it is sourced', () => {
        expect(result.seed.status).toEqual(0);
      });

      // .note = stderr rides in the assertion deliberately. an exit-code-only expectation
      //         reports `1 !== 0` and hides WHY — an absent `--env`, say, whose cause only the
      //         message names (`rule.require.failloud`)
      then('it exits 0', () => {
        expect({
          status: result.sourced.status,
          stderr: result.sourced.stderr,
        }).toEqual({
          status: 0,
          stderr: '',
        });
      });

      then('the repo key is still exported — the flag did not filter it away', () => {
        expect(result.sourced.stdout).toContain('REPO_KEY');
      });

      // ⚠️ .why.snapped = the assert above proves the key survived the filter by substring alone.
      //        the render proves it was exported under its full repo slug and that no empty-narrow
      //        notice rode along beside it — the silent wrong answer this row guards would look
      //        near identical to a `toContain` on the key name
      then('the render a human sees is snapped', () => {
        expect({
          stdout: asTempCwdMasked({
            output: result.sourced.stdout,
            cwd: repo.path,
          }),
          stderr: asTempCwdMasked({
            output: result.sourced.stderr,
            cwd: repo.path,
          }),
        }).toMatchSnapshot();
      });
    });

    when('[t4] a BARE repo key is read by --org @this on both keyed verbs', () => {
      // ⚠️ .why = the SELECTOR twin of [t2]'s filter row. on a keyed ask
      //        `@this` must arrive at the lookup ABSENT, because absent is how that lookup
      //        spells "take the manifest's org". handed the sigil verbatim it hits the mismatch
      //        guard and throws `org '@this' does not match manifest org 'testorg'` — for the
      //        one value that names that very manifest
      //
      //        BOTH verbs ride this row on purpose: `get` hand-rolled the expansion inline and
      //        `source` simply lacked it, so one flag carried two behaviors on two verbs. the
      //        rule now has a name (asKeyrackSelectorOrg) and this row holds them to one answer
      const results = useThen('both reads succeed', async () => {
        // ⚠️ .note = CAPTURED and asserted below. a discarded seed whose unlock failed would
        //         make both reads refuse as locked — a refusal that says not one word about the
        //         sigil expansion this row exists to hold (`rule.require.failloud`)
        const seed = invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--key', 'REPO_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });

        const shared = {
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        };
        return {
          seed,
          get: invokeRhachetCliBinary({
            ...shared,
            args: [
              'keyrack',
              'get',
              '--key',
              'REPO_KEY',
              '--env',
              'test',
              '--org',
              '@this',
              '--value',
            ],
          }),
          source: invokeRhachetCliBinary({
            ...shared,
            args: [
              'keyrack',
              'source',
              '--key',
              'REPO_KEY',
              '--env',
              'test',
              '--org',
              '@this',
            ],
          }),
        };
      });

      then('the seed unlock succeeds — the key is granted before it is read', () => {
        expect(results.seed.status).toEqual(0);
      });

      // .note = stderr rides in each assertion deliberately — an exit-code-only expectation
      //         reports `1 !== 0` and hides the ORG_MISMATCH message that names the defect
      then('get exits 0 and yields the repo secret', () => {
        expect({
          status: results.get.status,
          stderr: results.get.stderr,
          value: results.get.stdout.trim(),
        }).toEqual({ status: 0, stderr: '', value: 'repo-secret' });
      });

      then('source exits 0 and exports the repo key', () => {
        expect({
          status: results.source.status,
          stderr: results.source.stderr,
        }).toEqual({ status: 0, stderr: '' });
        expect(results.source.stdout).toContain('REPO_KEY');
      });

      // ⚠️ .why.snapped = two verbs must answer one sigil the same way, and the asserts above see
      //        a trimmed value and one substring. only the two renders side by side show that
      //        agreement — a `get` that gained a trailing newline, or a `source` whose export
      //        quotes drifted from its peer, stays green on both rows and breaks both consumers
      then('the render each human sees is snapped', () => {
        expect({
          get: {
            stdout: asTempCwdMasked({
              output: results.get.stdout,
              cwd: repo.path,
            }),
            stderr: asTempCwdMasked({
              output: results.get.stderr,
              cwd: repo.path,
            }),
          },
          source: {
            stdout: asTempCwdMasked({
              output: results.source.stdout,
              cwd: repo.path,
            }),
            stderr: asTempCwdMasked({
              output: results.source.stderr,
              cwd: repo.path,
            }),
          },
        }).toMatchSnapshot();
      });
    });

    when('[t5] a repo sweep is filtered to --org @all', () => {
      // ⚠️ .why = this narrow is empty BY CONSTRUCTION — a sweep yields only slugs the manifest
      //        declares, and a repo manifest derives every slug from its own org, so it can
      //        never emit an `@all.*` key. the empty set is the true answer; SILENCE is not.
      //        a human who reads `--org @all (machine-wide keys)` in the help and reaches for it
      //        here gets an empty export and exit 0 — the notice is the only word of why
      const result = useThen('the source succeeds', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--env', 'test', '--org', '@all'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0 — an empty narrow is an answer, not a failure', () => {
        expect(result.status).toEqual(0);
      });

      then('the note names the fix, and rides on stderr so an eval is safe', () => {
        // .why = stdout is EVAL'd by the caller (`eval "$(rhx keyrack source ...)"`), so a
        //        guidance line there would be executed as shell. the human must see it and
        //        the shell must not
        expect(result.stderr).toContain('--key @all.test.<name>');
        expect(result.stdout).toEqual('');
      });

      then('the note a human reads is snapped', () => {
        // ⚠️ .why = the SUCCESS-path render, which the asserts above cannot see. they check that
        //        one substring is present and that stdout is empty — both stay green while the
        //        tree mis-renders, or while the glyph wears a role mascot instead of keyrack's
        //        own palette. a `🐢` here shipped exactly that way until it was read
        //        (`rule.require.keyrack-emoji-palette`, `rule.prefer.emoji-language`)
        // .note = `💡`, never `✋` — this run EXITS 0. the sweep answered truthfully, so there is
        //         no caller fault to name
        // .note = through `asSnapshotSafe` like every other row here, so a future edit that
        //         paints this notice cannot commit raw escape bytes
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t5b] the SAME narrow is asked of get --for repo — the fifth sweep', () => {
      // ⚠️ .why = `--org` was made a real filter on `unlock`, `source`, `list`, and `status`,
      //        and `get --for repo` was missed — it accepted the flag and consulted it never,
      //        so `--org @all` on a repo sweep returned EVERY repo key. a flag a human can
      //        read but the code does not read is a published contract that partly works
      // ⚠️ .why.pair = the filter and its empty-case notice ship together. to add the filter
      //        alone would mint the exact silent-empty answer [t5]'s notice exists to close —
      //        so this row asserts BOTH, and would go red on either half alone
      // .note = the twin of [t5] one row up, deliberately adjacent: the two sweeps must answer
      //         the same narrow the same way, and adjacency is what makes a divergence visible
      const result = useThen('the get succeeds', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--for',
            'repo',
            '--env',
            'test',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits 0 — an empty narrow is an answer, not a failure', () => {
        expect(result.status).toEqual(0);
      });

      then('the FILTER bit — the repo keys are gone, not merely unmentioned', () => {
        // ⚠️ .why = the half that goes red if `--org` is dropped again. without the filter this
        //        repo's own keys come back, so an empty array is the whole assert
        expect(JSON.parse(result.stdout)).toEqual([]);
      });

      then('the NOTICE bit — the fix names THIS verb, and rides on stderr', () => {
        // ⚠️ .why = the emitter was widened by a `verb` input for exactly this line. a `get`
        //        that answered `rhx keyrack source --key …` would hand a human a different
        //        command than the one they ran (`rule.require.errors-name-the-fix`)
        expect(result.stderr).toContain('rhx keyrack get --key @all.test.<name>');
        // ⚠️ .why = stdout is PARSED here (`--json`), so a guidance line ON it breaks the parse.
        //        the `JSON.parse` above proves stdout is VALID json; these two prove the notice
        //        is not on it — together that is what "stderr, never stdout" means here. the
        //        same rule holds for [t5]'s `source`, reached by a different route (eval, not
        //        parse). a bare `stderr !== ''` adds no coverage over the toContain above
        expect(result.stdout).not.toContain('heads up');
        expect(result.stdout).not.toContain('rhx keyrack get --key');
      });

      // ⚠️ .why = the [t5] twin one row up snaps ITS stderr notice, and these two notices are
      //    distinct renders — the emitter interpolates the verb, so `get` and `source` yield
      //    different text from one template. the `toContain` above pins the one interpolated
      //    line; a notice that lost the sentence around it, or its `heads up` header, still
      //    carries that line. the snap is what makes this notice readable against its twin
      then('the notice a human reads is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t6] the rack is listed by each provenance — the SUCCESS renders', () => {
      // ⚠️ .why = `[t1]`/`[t2]` assert the JSON keys, which proves the FILTER and says none of
      //        what a human reads. the refuse renders are snapped ([case3]); their success twins
      //        were not, so a stray `└─` or a lost label would pass the whole suite
      const results = useThen('both listings succeed', async () => {
        const shared = {
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        };
        return {
          all: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'list', '--org', '@all'],
          }),
          this: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'list', '--org', '@this'],
          }),
        };
      });

      then('each exits 0', () => {
        expect({ all: results.all.status, this: results.this.status }).toEqual({
          all: 0,
          this: 0,
        });
      });

      then('neither render wears a role mascot', () => {
        // .why = keyrack roots on `🔐` and its own palette. the assert is cheap and it is the
        //        one a resnap cannot paper over — a mascot that returns still "renders fine"
        for (const result of Object.values(results))
          expect(result.stdout + result.stderr).not.toContain('🐢');
      });

      then('the filtered rack each human reads is snapped', () => {
        // .note = through `asSnapshotSafe` like every other row here — the `list` render carries
        //         no `tip:` today, but the strip is what keeps that true rather than lucky
        expect({
          all: asSnapshotSafe(results.all.stdout),
          this: asSnapshotSafe(results.this.stdout),
        }).toMatchSnapshot();
      });
    });

    /**
     * ⚠️ .why = `--env` is taught by NINE keyrack verbs and by `status`, the OTHER sweep over
     *        this same rack. `list` alone declined it — and only incidentally, through
     *        commander's `unknown option` at exit 1: no keyrack tree, no fix, and an asymmetry
     *        between two verbs over one rack that a human cannot predict
     * .note = this case is the only place the axis can be exercised end to end, because its
     *         rack holds one slug per env AND one per org — so an `--env` narrow that silently
     *         kept everything would still look correct against a single-env rack
     */
    when('[t7] the rack is narrowed by --env, and by both axes at once', () => {
      const results = useThen('all three listings succeed', async () => {
        const shared = {
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        };
        return {
          camp: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'list', '--env', 'camp', '--json'],
          }),
          test: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'list', '--env', 'test', '--json'],
          }),
          both: invokeRhachetCliBinary({
            ...shared,
            args: [
              'keyrack',
              'list',
              '--env',
              'camp',
              '--org',
              '@all',
              '--json',
            ],
          }),
        };
      });

      then('each exits 0 — the flag is declared, never refused', () => {
        expect({
          camp: results.camp.status,
          test: results.test.status,
          both: results.both.status,
        }).toEqual({ camp: 0, test: 0, both: 0 });
      });

      then("no render carries commander's raw unknown-option line", () => {
        for (const result of Object.values(results))
          expect(result.stdout + result.stderr).not.toContain('unknown option');
      });

      then('each render carries the asked env, and only that env', () => {
        // ⚠️ the assertion is the AXIS PROPERTY, never an exact roster — the fixture's
        //    keyrack.yml declares further `test` keys of its own, so a roster would pin this
        //    clamp to the fixture rather than to the narrow. teeth are intact either way: an
        //    unfiltered render carries BOTH envs, so it fails the segment test below
        const asSlugs = (stdout: string): string[] =>
          Object.keys(JSON.parse(stdout) as Record<string, unknown>).sort();
        // .note = a slug with no env segment folds to `<none>` rather than dropping out of
        //         the set — it must FAIL the equality below, never vanish silently
        const envsOf = (slugs: string[]): string[] =>
          [
            ...new Set(slugs.map((slug) => slug.split('.')[1] ?? '<none>')),
          ].sort();

        expect({
          camp: envsOf(asSlugs(results.camp.stdout)),
          test: envsOf(asSlugs(results.test.stdout)),
        }).toEqual({ camp: ['camp'], test: ['test'] });
      });

      then("each env's seeded slug stands, and its twin is excluded", () => {
        // ⚠️ the pair that gives the row above its bite: this case seeded ONE slug per env,
        //    so each must survive its own narrow and fall out of the other's
        const asSlugs = (stdout: string): string[] =>
          Object.keys(JSON.parse(stdout) as Record<string, unknown>);

        expect(asSlugs(results.camp.stdout)).toContain('@all.camp.MACHINE_KEY');
        expect(asSlugs(results.camp.stdout)).not.toContain(
          'testorg.test.REPO_KEY',
        );
        expect(asSlugs(results.test.stdout)).toContain('testorg.test.REPO_KEY');
        expect(asSlugs(results.test.stdout)).not.toContain(
          '@all.camp.MACHINE_KEY',
        );
      });

      then('the two axes COMPOSE — neither overrides the other', () => {
        // .why = `--env camp` and `--org @all` each keep the same one slug here, so the row
        //        that proves composition is the CONTRADICTORY pair below, never this one
        expect(
          Object.keys(
            JSON.parse(results.both.stdout) as Record<string, unknown>,
          ),
        ).toEqual(['@all.camp.MACHINE_KEY']);
      });

      then('a contradictory pair yields an empty rack, not one axis alone', async () => {
        // ⚠️ THE COMPOSITION CLAMP. `--env test` keeps only the repo slug; `--org @all` keeps
        //    only the machine-wide one. together they must keep NEITHER. an implementation
        //    where one axis silently overrode the other would return a non-empty rack here and
        //    stay green on every row above
        const result = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--env', 'test', '--org', '@all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
        expect(result.status).toEqual(0);
        expect(
          Object.keys(JSON.parse(result.stdout) as Record<string, unknown>),
        ).toEqual([]);
      });

      then('an invalid --env refuses the same way status does', async () => {
        const result = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--env', 'bogus'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
        expect(result.status).toEqual(2);
        expect(result.stdout + result.stderr).toContain('🔐 keyrack');
        expect(result.stdout + result.stderr).toContain('invalid --env');
      });

      // ⚠️ .why.snapped = every assert above parses the payload and pins slug SETS. the snapshot
      //        pins the payload itself — the per-entry field shape and the order the narrows
      //        emit — which is the part a jq pipe binds to and the part a key-set equality
      //        cannot see. stderr rides along so a stray warn on a `--json` read shows
      // ⚠️ .why.camp-and-both-only = the `test` narrow is DELIBERATELY excluded from this raw
      //        payload snap, and pinned by field shape below instead. the fixture's own
      //        keyrack.yml declares further `test` keys, so a raw snap of that narrow would
      //        bind this clamp to the fixture roster — the exact bind the axis-property
      //        comment above refuses. `camp` and `both` each hold one SEEDED slug, so they
      //        carry no roster to bind to and snap in full
      then('the render each human sees is snapped', () => {
        expect({
          camp: {
            stdout: asTempCwdMasked({
              output: results.camp.stdout,
              cwd: repo.path,
            }),
            stderr: asTempCwdMasked({
              output: results.camp.stderr,
              cwd: repo.path,
            }),
          },
          both: {
            stdout: asTempCwdMasked({
              output: results.both.stdout,
              cwd: repo.path,
            }),
            stderr: asTempCwdMasked({
              output: results.both.stderr,
              cwd: repo.path,
            }),
          },
        }).toMatchSnapshot();
      });

      // ⚠️ .why.shape-only = the `test` narrow's VALUE set belongs to the fixture, but its
      //        per-entry FIELD SHAPE belongs to the contract — and the shape is what a jq pipe
      //        binds to. so this pins the field names alone: it goes red on a renamed or
      //        dropped field, and stays green when the fixture gains or loses a `test` key
      then("the test narrow's per-entry field shape is snapped", () => {
        const rack = JSON.parse(results.test.stdout) as Record<
          string,
          Record<string, unknown>
        >;
        expect([
          ...new Set(
            Object.values(rack).map((entry) =>
              Object.keys(entry).sort().join(','),
            ),
          ),
        ]).toMatchSnapshot();
      });
    });
  });

  given('[case3] a cwd that is not a git repo at all', () => {
    // .why = the refuse-loud renders owed from a non-repo cwd. the expansion RULE is
    //        unit-clamped, but the render a human actually reads — the tree, the exit code,
    //        the fix text — is only provable at the cli grain
    const cwd = useBeforeAll(async () =>
      genTestTempDirNonRepo({ label: 'keyrack' }),
    );

    when('[t0] the rack is listed by --org @this', () => {
      const result = useThen('the list is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', '@this'],
          cwd: cwd.path,
          env: { HOME: cwd.path },
          logOnError: false,
        }),
      );

      then('it refuses loud rather than render an empty rack', () => {
        expect(result.status).toEqual(2);
      });

      then('the render a human sees is snapped', () => {
        // ⚠️ .note.branch = READ THE SNAPSHOT, not the row title. this ask trips `list`'s
        //        HOST-manifest guard, which sits ABOVE the `@this` expansion — because HOME
        //        is the temp dir, so no host rack exists either. so what this row proves is
        //        the REFUSAL QUALITY from a non-repo cwd: exit 2, a branded tree, a named
        //        fix, no stack trace. it does NOT prove the `@this` expansion refuses, and a
        //        reader who assumed otherwise would think that rule clamped when it is not
        // ⇒ the `@this` expansion RULE is clamped at its own grain
        //        (`getOneKeyrackFilterOrg.integration.test.ts` [case3][t0]), and its render
        //        through this boundary is clamped at [case4][t3], whose repo carries a host
        //        rack so the ask can reach the expansion
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: cwd.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a REPO-scoped set is asked — THE CRASH GUARD', () => {
      // ⚠️ .why = this ask genuinely needs a repo, so a refusal is correct. what was NOT correct
      //        is HOW: the strict gitroot lookup threw a raw `BadRequestError: Not inside a Git
      //        repository`, which reached the top-level catch and printed a node stack trace
      //        plus a `Node.js v22.x` footer. a human who ran `keyrack set` from their home
      //        directory got a crash report where they needed one sentence that names the fix
      // .note = the snapshot is the whole point of this row — a stack trace and a named refusal
      //         both "fail", so only the RENDER can tell them apart
      const result = useThen('the set is attempted', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'FOO',
            '--env',
            'test',
            '--at',
            '.agent/keyrack.yml',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: cwd.path,
          env: { HOME: cwd.path },
          stdin: 'x\n',
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(result.status).toEqual(2);
      });

      then('the render carries a fix, and no stack trace', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--org @all');
        expect(output).not.toContain('Node.js v');
        expect(output).not.toMatch(/\bat async \w+ \(/);
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: cwd.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] a MACHINE-WIDE set is asked with --at — the contradiction', () => {
      // ⚠️ .why = `--at` names a repo keyrack; `--org @all` declares a key that consults none.
      //        the pair is incoherent WHEREVER it runs, so the refusal must be keyed on the ask
      //        rather than the cwd — see [case1][t9] for the same command inside a repo
      const result = useThen('the set is attempted', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'FOO',
            '--env',
            'camp',
            '--org',
            '@all',
            '--at',
            '.agent/keyrack.yml',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: cwd.path,
          env: { HOME: cwd.path },
          stdin: 'x\n',
          logOnError: false,
        }),
      );

      then('it names the contradiction, never the cwd', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout + result.stderr).toContain('contradictory');
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: cwd.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] the OTHER three sweep verbs are asked by --org @this', () => {
      // ⚠️ .why = every sweep verb, asked from a cwd that is set up for
      //        none of this, must refuse as a CONSTRAINT with a branded tree and a named fix
      //        — never an empty rack at exit 0, and never a stack trace. a quality held by one
      //        verb is not a rule; it is a coincidence
      // ⚠️ .note.branch = the three verbs refuse for TWO different causes, and the snapshot is
      //        what says so: `source` trips the absent repo keyrack.yml, while `status` and
      //        `unlock` both trip the `@this` expansion. that split is correct — each names the
      //        FIRST fault on its own path — but it means this row clamps the refusal QUALITY
      //        across verbs, and the expansion for only two of the three
      // ⚠️ .note.order = `unlock` names the `@this` expansion fault ahead of the absent HOST
      //        manifest, because `asKeyrackFilterOrg` sits ABOVE the decrypt. that order is the
      //        right one on its own merits: `--org @this` is a fault in what the CALLER typed,
      //        and a caller's own error must be named ahead of an environment state they may not
      //        even need to fix. it is also what holds `unlock` and `status` to one answer, the
      //        property [t3] exists for
      // ⇒ `source`'s expansion render, which trips an earlier guard on every fixture, is the
      //        one route with no cli-grain clamp
      // .note = a sweep is asked deliberately: `--org` FILTERS here, and `@this` names a repo
      //         there is none of, so the honest answer is a refusal rather than an empty set
      const results = useThen('all three are attempted', async () => {
        const shared = {
          cwd: cwd.path,
          env: { HOME: cwd.path },
          logOnError: false,
        };
        return {
          source: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'source', '--env', 'test', '--org', '@this'],
          }),
          status: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'status', '--org', '@this'],
          }),
          unlock: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'unlock', '--env', 'test', '--org', '@this'],
          }),
        };
      });

      then('each refuses as a CONSTRAINT (exit 2), like [t0]', () => {
        expect({
          source: results.source.status,
          status: results.status.status,
          unlock: results.unlock.status,
        }).toEqual({ source: 2, status: 2, unlock: 2 });
      });

      then('none renders an empty rack on stdout', () => {
        // ⚠️ .why = the row that would go red on a soft fallback. `source`'s stdout is EVAL'd
        //        by the caller, so an empty export there is not merely unhelpful — it is a
        //        no-op that reads as a success and leaves the shell without the credential it
        //        asked for, with no word of why
        expect({
          source: results.source.stdout,
          status: results.status.stdout,
        }).toEqual({ source: '', status: '' });
      });

      then('no verb crashes — a refusal is never a stack trace', () => {
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).not.toContain('Node.js v');
          expect(output).not.toMatch(/\bat async \w+ \(/);
        }
      });

      then('the render each human sees is snapped', () => {
        // .why = three verbs, three renders, one rule. only a snapshot can show that the
        //        turtle treestruct is what all three emit — an exit-code assertion cannot
        //        tell a named refusal from a raw class dump
        expect({
          source: asTempCwdMasked({
            output: results.source.stdout + results.source.stderr,
            cwd: cwd.path,
          }),
          status: asTempCwdMasked({
            output: results.status.stdout + results.status.stderr,
            cwd: cwd.path,
          }),
          unlock: asTempCwdMasked({
            output: results.unlock.stdout + results.unlock.stderr,
            cwd: cwd.path,
          }),
        }).toMatchSnapshot();
      });
    });

    when('[t4] the last two repo-scoped verbs are asked — fill and firewall', () => {
      // ⚠️ .why = [t1]'s crash shape, in the two verbs that never adopted the cure.
      //        `getOneKeyrackRepoScopeForAsk` was cut precisely because a strict gitroot lookup
      //        throws a raw `BadRequestError` a human meets as a crash, and `set`/`del`/`unlock`
      //        were migrated to it — `fill` and `firewall` were not.
      //
      //        `fill` is the sharper case: its blocked-report guard opens its `try` one line
      //        BELOW the gitroot lookup, so the guard is live and the crash walks straight over
      //        it — one verb, two refusal qualities, for two faults that are both "you are not
      //        set up here". `firewall` carries no guard at all
      // .note = both verbs genuinely NEED a repo, so the refusal is correct either way. what is
      //         under test is the RENDER, and only a snapshot can tell a named refusal from a
      //         stack trace — the exact gap `rule.require.snapshots.[lesson]` names
      const results = useThen('both are attempted', async () => {
        const shared = {
          cwd: cwd.path,
          env: { HOME: cwd.path },
          logOnError: false,
        };
        return {
          fill: invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'fill', '--env', 'test', '--owner', 'ehmpath'],
          }),
          // .note = `--from`/`--into` are REQUIRED options, and both are consumed ABOVE the
          //         gitroot lookup this case exercises. an empty stdin object is the cheapest
          //         input that parses, so the run reaches the repo-scope refusal under test
          //         rather than a halt at commander's own arity check
          firewall: invokeRhachetCliBinary({
            ...shared,
            args: [
              'keyrack',
              'firewall',
              '--env',
              'test',
              '--from',
              'json(stdin://*)',
              '--into',
              'json',
            ],
            stdin: '{}',
          }),
        };
      });

      then('each refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect({
          fill: results.fill.status,
          firewall: results.firewall.status,
        }).toEqual({ fill: 2, firewall: 2 });
      });

      then('neither render carries a stack trace', () => {
        // .why = the asserts a resnap cannot paper over. a stack trace and a named refusal both
        //        "fail" and both exit non-zero, so every functional assert stays green while a
        //        human reads a crash report
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).not.toContain('Node.js v');
          expect(output).not.toMatch(/\bat async \w+ \(/);
          expect(output).not.toContain('Not inside a Git repository');
        }
      });

      then('the render each human sees is snapped', () => {
        expect({
          fill: asTempCwdMasked({
            output: results.fill.stdout + results.fill.stderr,
            cwd: cwd.path,
          }),
          firewall: asTempCwdMasked({
            output: results.firewall.stdout + results.firewall.stderr,
            cwd: cwd.path,
          }),
        }).toMatchSnapshot();
      });
    });

    when('[t5] the LAST keyed mutation is asked — del', () => {
      // ⚠️ .why = `del` is `set`'s exact shape one verb over, and it was the one keyed mutation
      //        no row in this suite ever exercised from a non-repo cwd. so its render was true
      //        by inheritance rather than by proof — and inheritance is what let [t1]'s raw dump
      //        sit in a committed snapshot unflagged. a clamp that covers 4 of 5 members of a
      //        defect class leaves the 5th free to drift on its own
      // .note = the two verbs now cite ONE fetch (`getOneKeyrackRepoScopeForAsk`) and ONE render
      //         boundary (`KeyrackCommand`), so the expected output is byte-identical to [t1] —
      //         that sameness is the assert
      const result = useThen('the del is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'del', '--key', 'FOO', '--env', 'test'],
          cwd: cwd.path,
          env: { HOME: cwd.path },
          stdin: 'y\n',
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(result.status).toEqual(2);
      });

      then('the render carries a fix, and no stack trace', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--org @all');
        expect(output).not.toContain('Node.js v');
        expect(output).not.toMatch(/\bat async \w+ \(/);
        expect(output).not.toContain('Not inside a Git repository');
      });

      then('STDOUT is untouched — a refused ask writes not one byte to it', () => {
        // ⚠️ .why = `del` opened with a `console.log('')` — a blank line for the passphrase
        //        prompt — emitted ABOVE the fetch that refuses the ask. so the output stream
        //        was mutated before the decision to fail was taken, and a human who ran
        //        `keyrack del` from their home dir got a stray blank on stdout under a refusal
        //        that earned no line at all. the blank now waits until the scope resolves
        // .note = the snapshot below would also catch it, but only as a diff a reader must
        //         interpret. this states the rule: a refused mutation emits on stderr alone
        expect(result.stdout).toEqual('');
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: cwd.path,
          }),
        ).toMatchSnapshot();
      });
    });

  });

  given('[case4] a repo with NO keyrack.yml at all', () => {
    // ⚠️ .why = every other repo in this suite provisions a manifest — a BROKEN one, but a
    //        present one. so `source --key <bare>`'s own refusal, the one that fires when
    //        there is no manifest to construct a slug from, had no row anywhere in the
    //        suite. it was the last branch of the verb family still outside the
    //        `*OrEmitBlocked` convergence, and it stayed outside because no clamp reached it
    // .note = `minimal` is a real git repo with no `.agent/` at all, so the manifest is
    //         ABSENT rather than broken — `loadManifestExplicit` yields null with no throw,
    //         which is precisely the state that reaches the keyed lookup's own refusal
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] a bare key is sourced — one only a manifest could name', () => {
      const result = useThen('the source is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--key', 'MY_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal renders as the blocked tree, never a class dump', () => {
        // .why = the assert a resnap cannot paper over. a flush-left `✋ ConstraintError:`
        //        with an `[args] keyrack,source,…` trailer and the `🔐 keyrack` tree both
        //        exit 2 and both carry the word "keyrack" — so every functional assert
        //        stays green while a human reads a raw class name and an args dump
        // ⚠️ .note = the class name is REQUIRED at the tree node and FORBIDDEN flush-left.
        //        the two asserts below are not in tension: the first demands the class
        //        survive the render (`rule.require.unabridged-error-prefix`), the second
        //        demands it arrive INSIDE the tree rather than as a raw dump beside it
        //        (`rule.forbid.helpful-error-parents`)
        const output = result.stdout + result.stderr;
        expect(output).toContain('🔐 keyrack');
        expect(output).toContain('└─ ✋ ConstraintError: ');
        expect(output).not.toMatch(/^✋ ConstraintError:/m);
        expect(output).not.toContain('[args]');
      });

      then('not one line is emitted for a shell to eval', () => {
        // ⚠️ .why = `source`'s stdout is EVAL'd by the caller. a refusal that leaked one
        //         line there would be executed as shell, so the whole render belongs on
        //         stderr — the same stream split the empty-sweep notice already honors
        expect(result.stdout).toEqual('');
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the SAME repo is asked for a machine-wide key', () => {
      // .why = the twin row that makes [t0] a statement about the ASK rather than about the
      //        repo. same cwd, same absent manifest — an `@all` slug must not meet that
      //        refusal at all, because no repo manifest can ever declare a machine-wide key
      const result = useThen('the source is attempted', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'source',
            '--key',
            '@all.camp.ABSENT_KEY',
            '--env',
            'camp',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        // ⚠️ .why = the POSITIVE anchor. the two `not.toContain` rows below say only what the
        //        refusal is NOT, and the set of sentences that name neither string is
        //        unbounded — a crash, a daemon fault, or a reworded message would satisfy them
        //        while this row pinned no part of the ask-vs-repo distinction it claims to test
        //        (`rule.forbid.failhide`). these three asserts are what bound it
        expect(result.status).toEqual(2);
      });

      then('the refusal names the machine-wide SLUG, and its absence', () => {
        // ⚠️ .why = the positive claim the row exists to make: an `@all` ask that cannot be
        //        served is refused for the ask's own reason — the key is absent from the HOST
        //        rack — never for want of a repo artifact the ask does not consult
        // .note = the `@all.camp.` prefix is what carries the machine-wide claim; the render
        //         states provenance by the SLUG rather than by the word, so the assert reads
        //         the slug. `status: absent` is the reason, and it names the rack, not a file
        const output = result.stdout + result.stderr;
        expect(output).toContain('@all.camp.ABSENT_KEY');
        expect(output).toContain('status: absent');
      });

      then('the manifest is never named as the reason', () => {
        // .note = the key itself is not vaulted on this box, so the run still refuses —
        //         but for the RIGHT reason. what this pins is that `keyrack.yml` is not
        //         the sentence a human reads for an ask no keyrack.yml could serve
        const output = result.stdout + result.stderr;
        expect(output).not.toContain('keyrack.yml');
        expect(output).not.toContain('cannot construct slug');
      });

      then('the render a human sees is snapped', () => {
        // .why = the negatives and positives above each prove a property; only the snapshot
        //        proves the sentence, and a reworded refusal that still satisfies all four is
        //        exactly what a snapshot catches
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] the two keyed MUTATIONS are asked for a repo key', () => {
      // ⚠️ .why = the last refusal branch of this verb family with no clamp anywhere. every
      //        row above reaches `set`/`del` from a NON-repo cwd, which refuses upstream at
      //        the scope fetch. this reaches them from INSIDE a real repo whose manifest is
      //        absent — the one path that falls through to their own no-manifest refusal
      // .note = a branch no clamp reaches is a branch no cleanup sweep can confirm it swept —
      //         which is how this one kept an emit-then-exit pair long after its peers were
      //         cleared of that same class
      //
      // ⚠️ .note.fixture = this row needs its OWN repo, and the reason is a REFUSAL ORDER:
      //         `set`/`del` check the HOST manifest before the repo one, so on the case's
      //         bare `minimal` repo both verbs refuse upstream with "host manifest not
      //         found" and the branch under test never runs. `with-host-manifest-only` is
      //         `minimal` plus an EMPTY host rack — a repo whose `.agent/keyrack.yml` is
      //         still absent, which is the one state that falls through to the subject.
      //         so the row would read green on a `minimal` cwd while it exercised a
      //         DIFFERENT refusal than the one it names (`rule.forbid.failhide`)
      const repoWithHostRack = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-host-manifest-only' }),
      );

      const results = useThen('both mutations are attempted', async () => {
        const shared = {
          cwd: repoWithHostRack.path,
          env: { HOME: repoWithHostRack.path },
          stdin: 'y\n',
          logOnError: false,
        };
        return {
          set: await invokeRhachetCliBinary({
            ...shared,
            args: [
              'keyrack',
              'set',
              '--key',
              'MY_KEY',
              '--env',
              'test',
              '--vault',
              'os.direct',
            ],
          }),
          del: await invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'del', '--key', 'MY_KEY', '--env', 'test'],
          }),
        };
      });

      then('each refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect({ set: results.set.status, del: results.del.status }).toEqual({
          set: 2,
          del: 2,
        });
      });

      then('each renders the blocked tree, and no class dump', () => {
        // ⚠️ .why = the assert with teeth on the emit-then-exit rework. both refusals now
        //        throw a ConstraintError that `KeyrackCommand` renders, rather than write
        //        their own lines and hard-exit — and a hard exit can truncate the very report
        //        it just wrote when stdout is a pipe
        // ⚠️ .note.teeth = revert `set`'s throw to a `console.log` + `process.exit(2)` pair and
        //         THIS row and the snapshot below both go red. the reverted render also comes
        //         back one newline short at its tail — the truncation itself, in the output
        //         (`rule.require.clamp-edge-cases`)
        // ⚠️ .note = the class is REQUIRED at the node, FORBIDDEN flush-left — see the
        //         paired note on the `[t0]` row above for why the two asserts agree
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).toContain('🔐 keyrack');
          expect(output).toContain('└─ ✋ ConstraintError: ');
          expect(output).not.toMatch(/^✋ ConstraintError:/m);
          expect(output).not.toContain('[args]');
        }
      });

      then('each names the absent keyrack.yml, and the command that makes one', () => {
        // ⚠️ .why = the assert that pins WHICH refusal ran. "host manifest not found" also
        //        exits 2 and also renders the blocked tree, so every row above would stand
        //        green on it — this sentence is the one that names the repo manifest, and
        //        so the one that proves the row reached its own subject
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).toContain('no keyrack.yml found');
          expect(output).toContain('keyrack init');
          expect(output).not.toContain('host manifest not found');
        }
      });

      then('STDOUT is untouched — a refused mutation writes not one byte to it', () => {
        // ⚠️ .why = the RULE stated, beside the snapshot that pins the sentence. a snapshot
        //        defends whatever it records, so a stray blank at the head of `del` — a byte
        //        emitted above a refusal that earned no line — would become its own baseline.
        //        `[case3][t5]` states the same rule one branch shallower, above the cwd
        //        refusal; a rule stated cannot be silently re-baselined the way a recorded
        //        diff can
        expect({ set: results.set.stdout, del: results.del.stdout }).toEqual({
          set: '',
          del: '',
        });
      });

      then('the render each human sees is snapped', () => {
        expect(
          Object.fromEntries(
            Object.entries(results).map(([verb, result]) => [
              verb,
              asTempCwdMasked({
                output: result.stdout + result.stderr,
                cwd: repoWithHostRack.path,
              }),
            ]),
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t3] the two SWEEPS are asked by --org @this — the expansion RENDER', () => {
      // ⚠️ .why = [case3][t0] and [t3] look like they clamp this and do not. there the cwd's
      //        HOME holds no host rack either, so `list` and `unlock` refuse at their
      //        HOST-manifest guard — a branch ABOVE the `@this` expansion — and their renders
      //        read green against a rule those rows never reach. only `status` gets there.
      //        this case's repo is the one state that lets them through: a host rack PRESENT
      //        (so the guard passes) and no `.agent/keyrack.yml` (so `@this` has no org to
      //        expand to, and the expansion is the next fault on the path)
      // ⚠️ .why.subject = the expansion RULE is clamped at its own grain
      //        (`getOneKeyrackFilterOrg.integration.test.ts` [case3][t0]). what only a cli row
      //        can show is that each verb ROUTES that ConstraintError through `KeyrackCommand`
      //        rather than a raw class dump — one rule, one render, on every verb that reaches
      //        it. `list` and `unlock` arrive by two different paths, and two paths is two
      //        chances to diverge
      // ⚠️ .note.scope = `source` is absent, and the omission is named rather than left as a
      //        silent gap. a bare `source` is a REPO sweep, so its absent-keyrack.yml guard
      //        fires ahead of the expansion no matter what host rack exists — no fixture in
      //        this case can move it. `status` covers that route at [case3][t3]
      const repoWithHostRack = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-host-manifest-only' }),
      );

      const results = useThen('both sweeps are attempted', async () => {
        const shared = {
          cwd: repoWithHostRack.path,
          env: { HOME: repoWithHostRack.path },
          logOnError: false,
        };
        return {
          list: await invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'list', '--org', '@this'],
          }),
          unlock: await invokeRhachetCliBinary({
            ...shared,
            args: ['keyrack', 'unlock', '--env', 'test', '--org', '@this'],
          }),
        };
      });

      then('neither refuses for the HOST rack — that guard is satisfied here', () => {
        // ⚠️ .why = the row that proves the FIXTURE worked. without it this case could pass
        //        for [case3][t0]'s reason and clamp the same branch a second time — which is
        //        the exact fault it was cut to close
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).not.toContain('no host manifest found');
          expect(output).not.toContain('host manifest not found');
        }
      });

      then('each names the @this expansion as the cause', () => {
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).toContain('@this');
          expect(output).toContain('keyrack.yml');
        }
      });

      then('each refuses as a CONSTRAINT (exit 2), never a crash', () => {
        expect({
          list: results.list.status,
          unlock: results.unlock.status,
        }).toEqual({ list: 2, unlock: 2 });
        for (const result of Object.values(results)) {
          const output = result.stdout + result.stderr;
          expect(output).not.toContain('Node.js v');
          expect(output).not.toMatch(/\bat async \w+ \(/);
        }
      });

      then('STDOUT is untouched — a refused sweep writes not one byte to it', () => {
        // ⚠️ .why = the rule stated, and the row with teeth on `unlock`'s stray blank: its
        //        `console.log('')` (which spaces a passphrase prompt) sits ABOVE the `--org`
        //        validation, so `unlock` can put a byte on stdout above a refusal it has not
        //        yet reached while `list` carries none. a snapshot defends whatever it
        //        records, so that stray would become this row's own baseline — the exact trap
        //        [t2]'s twin assert is written against, one block over
        // ⚠️ .note.deeper = the byte was the SYMPTOM. the cause was order: the refusal landed
        //        after the host rack was decrypted, so `--org @this` in a manifest-less repo
        //        asked a human for their passphrase and THEN refused the flag. the fix hoists
        //        the pure `asKeyrackFilterOrg` above both (`rule.require.solve-at-cause`), so
        //        the blank is never reached rather than made conditional
        expect({
          list: results.list.stdout,
          unlock: results.unlock.stdout,
        }).toEqual({ list: '', unlock: '' });
      });

      then('the render each human sees is snapped', () => {
        // .why = two verbs, one rule. only a snapshot can show that both route the SAME
        //        ConstraintError through the SAME boundary — an exit code cannot tell a
        //        branded tree from a raw class dump
        expect(
          Object.fromEntries(
            Object.entries(results).map(([verb, result]) => [
              verb,
              asTempCwdMasked({
                output: result.stdout + result.stderr,
                cwd: repoWithHostRack.path,
              }),
            ]),
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t4] a BARE source is asked — the SWEEP refusal', () => {
      // .why = a bare `source` names no key, so `--for repo` is its default scope — the ask a
      //        repo manifest IS the content of. it refuses inside the grant FETCH
      //        (`getAllKeyrackGrantsByRepo.ts:46`), which is one guard ABOVE the load-vs-skip
      //        branch at `invokeKeyrack.ts:1040`
      // ⚠️ .note.pair = this row and `[t1]` are a pair on the same repo — `[t1]` proves an
      //        `@all` ask is served with no manifest at all; this proves a repo sweep on the
      //        very same absent manifest still refuses. same cwd, opposite answers ⇒ the
      //        outcome keys on the ASK, never on the cwd
      const result = useThen('the source is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal is the SWEEP fetch, never one of its two neighbours', () => {
        // ⚠️ .why = `source` on this repo can refuse three ways, and all three exit 2 — so the
        //        exit code names none of them. the two `not.toContain` lines are what make this
        //        row a clamp rather than a coincidence: a refusal ORDER change that re-routed a
        //        sweep into `[t0]`'s slug guard or `[t5]`'s :1040 would read GREEN on the
        //        `toContain` alone — a presence assert cannot tell one refusal from its
        //        neighbours
        const output = result.stdout + result.stderr;
        expect(output).toContain('--for repo requires keyrack.yml');
        expect(output).not.toContain('cannot construct slug');
        expect(output).not.toContain('keyrack.yml not found');
      });

      then('not one line is emitted for a shell to eval', () => {
        // ⚠️ .why = `source`'s stdout is EVAL'd, so a refusal that leaked even a blank there is
        //         a byte the caller's shell executes. the same rule [t0] holds, at the branch
        //         one level deeper — a stray blank above a refusal is a recurrent class here,
        //         so it is stated as a rule rather than left to the snapshot to record
        expect(result.stdout).toEqual('');
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t5] a KEYED source names a real org — this wish\u0027s own branch', () => {
      // ⚠️ .why = `invokeKeyrack.ts:1040` — `if (!repoManifest && !isAskMachineWide)` — is
      //        `source`'s load-vs-skip conditional, and this is the row on its REFUSE side
      // .how = the ask must SURVIVE the grant fetch to reach it, and only a keyed ask with an
      //        explicit non-`@all` org does: `getOneKeyrackGrantByKey.ts:86` builds the slug
      //        from `--org` with no manifest read, so the fetch succeeds and :1040 is the next
      //        fault. the three rows above each miss it by a DIFFERENT guard — `[t0]`'s bare
      //        key cannot build a slug, `[t4]`'s sweep dies in the fetch, `[t1]`'s `@all` skips
      //        the branch by design
      // ⚠️ .note.route = a bare `source` looks like the way into this branch and is not: it
      //        refuses one guard earlier — that route is `[t4]` — and never arrives here. a
      //        clamp aimed at a branch it cannot reach has no teeth, so the ask here is spelled
      //        with an explicit non-`@all` org instead
      const result = useThen('the source is attempted', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'source',
            '--key',
            'MY_KEY',
            '--env',
            'test',
            '--org',
            'someorg',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal is :1040, never one of its two neighbours', () => {
        // ⚠️ .why = the assert that pins WHICH refusal ran. the exclusions are the teeth: with
        //        the condition reverted to an unconditional `if (!repoManifest)`, this
        //        row still refuses here — so only a test that also excludes the peer sentences
        //        can tell "the branch keys on the ask" from "the branch always fires"
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack.yml not found');
        expect(output).toContain('keyrack init');
        expect(output).not.toContain('cannot construct slug');
        expect(output).not.toContain('--for repo requires keyrack.yml');
      });

      then('not one line is emitted for a shell to eval', () => {
        expect(result.stdout).toEqual('');
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t6] source is filtered by --org @this — the UNREACHABLE guard', () => {
      // ⚠️ .why = no cwd reaches `source`'s `@this`-expansion refusal, so a row that claimed to
      //        clamp it would be true by inheritance rather than by proof. this row does not
      //        clamp that refusal — it proves the refusal CANNOT HAPPEN, which is the truer
      //        answer and the one a reader needs
      // ⚠️ .the reachability argument, and why each half holds:
      //        - `source` calls `getOneKeyrackFilterOrg` at `invokeKeyrack.ts:980`, BELOW the
      //          grant fetch. so a sweep in a manifest-less repo refuses in the fetch first —
      //          `[t4]`'s sentence, which is what this row asserts
      //        - in a repo WITH a manifest, `@this` expands to that manifest's org and the guard
      //          has no cause to fire at all
      //        - in a repo whose manifest cannot hydrate (`[case1]`), the load throws above :980
      //        ⇒ every cwd reaches a different fault first. there is no cwd that arrives here
      // .note = a row that cannot reach its branch is a clamp with no teeth. rather than write
      //         one, this states the property the branch actually has, and pins the render a
      //         human DOES get — so a future edit that hoists the filter validation (as
      //         `unlock`'s hoist did) changes this snapshot and says so out loud
      const result = useThen('the source is attempted', async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--env', 'test', '--org', '@this'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(result.status).toEqual(2);
      });

      then('the sweep fault is reached FIRST — the expansion guard never runs', () => {
        // ⚠️ .why = the `not.toContain` is the whole row. `list` and `unlock` on this exact ask
        //        DO render the expansion refusal ([case4][t3]), so its absence here is a fact
        //        about `source`'s guard ORDER, not about the sigil
        const output = result.stdout + result.stderr;
        expect(output).toContain('--for repo requires keyrack.yml');
        expect(output).not.toContain('@this names this repo');
      });

      then('not one line is emitted for a shell to eval', () => {
        expect(result.stdout).toEqual('');
      });

      then('the render a human sees is snapped', () => {
        expect(
          asTempCwdMasked({
            output: result.stdout + result.stderr,
            cwd: repo.path,
          }),
        ).toMatchSnapshot();
      });
    });
  });
});
