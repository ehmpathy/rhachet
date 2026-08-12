import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack del', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  /**
   * [uc1] del accepts full slug as --key
   * full slug should not be double-prefixed
   */
  given('[case1] del with full slug', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_FULL_SLUG_KEY',
          '--env',
          'test',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with full slug (testorg.test.DEL_FULL_SLUG_KEY)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'testorg.test.DEL_FULL_SLUG_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains correct slug (not double-prefixed)', () => {
        // should show testorg.test.DEL_FULL_SLUG_KEY
        // NOT testorg.all.testorg.test.DEL_FULL_SLUG_KEY
        expect(result.stdout).toContain('testorg.test.DEL_FULL_SLUG_KEY');
        expect(result.stdout).not.toContain('testorg.all.testorg');
        expect(result.stdout).not.toContain('testorg.test.testorg');
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.DEL_FULL_SLUG_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc2] del with raw key and --env
   * standard usage: raw key name + explicit env
   */
  given('[case2] del with raw key and --env', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_RAW_KEY',
          '--env',
          'test',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with raw key and --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'DEL_RAW_KEY',
            '--env',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains correct slug', () => {
        expect(result.stdout).toContain('testorg.test.DEL_RAW_KEY');
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.DEL_RAW_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc3] del infers env from full slug
   * when full slug provided, --env should be optional
   */
  given('[case3] del infers env from full slug', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_INFER_KEY',
          '--env',
          'prod',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with full slug, no --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'testorg.prod.DEL_INFER_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains correct slug with prod env', () => {
        expect(result.stdout).toContain('testorg.prod.DEL_INFER_KEY');
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.prod.DEL_INFER_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc4] del with full slug org mismatch
   * full slug org must match manifest org
   */
  given('[case4] del with full slug org mismatch', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] del with full slug from different org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'wrongorg.test.SOME_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      // ⚠️ `2`, not merely non-zero. `del` refused this input with a bare `BadRequestError`
      //    that escaped to the global handler, which exits 1 — the code that means "the
      //    SERVER broke", for a plain caller typo. only an exact match can tell those apart
      //    (`rule.require.exit-code-semantics`)
      then('exits 2 — caller-fixable, not a defect', () => {
        expect(result.status).toEqual(2);
      });

      then('error mentions org mismatch', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/org.*mismatch|does not match/i);
      });

      // ⚠️ THE clamp. every assertion above this point passed while `del` dumped a raw
      //    `BadRequestError: …` stack — a phrase match is satisfied by a stack trace that
      //    happens to contain the phrase, and `not.toEqual(0)` by any crash at all. `del`
      //    was the ONE command whose refusal read that way; `set`, `source`, and `unlock`
      //    each render the blocked tree for the identical error class
      //    (`rule.forbid.surprises`)
      then('the refusal renders as the blocked tree, never a raw class dump', () => {
        const output = result.stdout + result.stderr;
        // .note = keyrack roots EVERY output — success or blocked — on its own lock glyph,
        //         never the generic treestruct shell `🐚` and never a role mascot. a keyrack
        //         refusal is about a credential, not about whichever role typed the command
        //         (`rule.require.keyrack-emoji-palette`)
        expect(output).toContain('🔐 keyrack del');
        expect(output).toContain('✋ blocked:');

        // ⛔ the mascot must never come back. a `🐢 bummer dude...` banner is a DEFECT here by
        //    that same rule, and this branch carried one until it was rebased onto the fix —
        //    so the regression net stays
        expect(output).not.toContain('bummer dude');
        expect(output).not.toContain('🐢');

        // the class name is an internal fact; a human owes none of it
        expect(output).not.toContain('BadRequestError');
        expect(output).not.toContain('ConstraintError');
      });

      // a refusal that only names the symptom has done half its job
      // (`rule.require.errors-name-the-fix`)
      then('the refusal names the fix', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('hint:');
        expect(output).toContain('--org @all');
      });
    });
  });

  /**
   * [uc5] del with full slug and mismatched --env
   * if both provided, they must match
   */
  given('[case5] del with full slug and mismatched --env', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    when('[t0] del with full slug (test env) and --env prod', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'testorg.test.SOME_KEY',
            '--env',
            'prod',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits 2 — caller-fixable, not a defect', () => {
        expect(result.status).toEqual(2);
      });

      then('error mentions env mismatch', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/env.*mismatch|does not match|conflicts/i);
      });

      // .note = the second of `del`'s two input refusals, clamped for the same reason
      //         `[case4]` is. these are the two a human is far likelier to hit than any
      //         vault-level refusal, so a fix that wrapped only the domain call would have
      //         left BOTH of them raw and still read as done
      then('the refusal renders as the blocked tree, never a raw class dump', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('🔐 keyrack del');
        expect(output).toContain('✋ blocked:');
        expect(output).not.toContain('bummer dude');
        expect(output).not.toContain('🐢');
        expect(output).not.toContain('BadRequestError');
        expect(output).not.toContain('ConstraintError');
      });

      // the fix here is the more useful half: it names the env the slug actually carries,
      // which is the one fact the human did not have
      then('the refusal names the fix, with the env the slug carries', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('hint:');
        expect(output).toContain('--env test');
      });
    });
  });

  /**
   * [uc6] del accepts --env camp
   * proves the camp env passes del's isValidKeyrackEnv gate end-to-end
   * (the camp-tagged set in setup also exercises set's camp gate)
   */
  given('[case6] del with raw key and --env camp', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // set a camp-tagged key first so we can delete it
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEL_CAMP_KEY',
          '--env',
          'camp',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'test-secret-value\n',
      }),
    );

    when('[t0] del with raw key and --env camp', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'del', '--key', 'DEL_CAMP_KEY', '--env', 'camp'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (camp is accepted, not rejected)', () => {
        expect(result.status).toEqual(0);
      });

      then('output does not reject camp as an invalid env', () => {
        const output = result.stdout + result.stderr;
        expect(output).not.toContain('invalid --env');
      });

      then('output contains the camp-tagged slug', () => {
        expect(result.stdout).toContain('testorg.camp.DEL_CAMP_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });

      then('key is no longer in list', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.camp.DEL_CAMP_KEY']).toBeUndefined();
      });
    });
  });

  /**
   * [uc-reach] del addresses ONE reach, and leaves its peers alone
   *
   * .what = drives the built binary to cut one key name at two reaches, del exactly one,
   *         and clamps that the other survives untouched
   * .why = a `del` names one ADDRESS, exactly as a `set` does. addressed by bare slug it has
   *        two silent failure shapes: a key cut only for a reach reads as `not_found`
   *        while it sits on disk, and a slug that holds both loses only one with no signal
   *
   * .note = ⚠️ this is deliberately NOT the `relock` shape. relock sweeps every reach of
   *         a slug (q1), because a human who locks a key means THE key. a del is ADDRESSED.
   *         to grant is narrow, to revoke is wide, and to destroy is exact
   * .note = `[t1]` is the clamp with teeth: under a bare-slug del the peer would be gone too,
   *         and a test that only asserted "the target is gone" would stay green
   */
  given('[case-reach] one key name held at two reaches', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // cut the SAME key name at two reaches — two addresses, two keys
    useBeforeAll(async () => {
      const setResults = [];
      for (const exid of ['beav@ehmpathy.com', 'vlad@ehmpathy.com']) {
        setResults.push(
          await invokeRhachetCliBinary({
            args: [
              'keyrack',
              'set',
              '--key',
              'MULTI_REACH_KEY',
              '--env',
              'test',
              '--vault',
              'os.direct',
              '--reach',
              exid,
            ],
            cwd: repo.path,
            env: { HOME: repo.path },
            stdin: `secret-for-${exid}\n`,
          }),
        );
      }
      return { setResults };
    });

    when('[t0] del ONE reach by its address', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'MULTI_REACH_KEY',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the output names the reach it destroyed', () => {
        expect(result.stdout).toContain('MULTI_REACH_KEY');
        expect(result.stdout).toContain('beav@ehmpathy.com');
      });

      // .note = the `toContain` pair above clamps the two FACTS a human must see; this
      //         snapshot clamps the TREE they render in. a `del` at a reach is the
      //         one destructive path that carries a reach, so its render is exactly where
      //         a human must be able to read WHICH key died at a glance — a connector or
      //         leaf-order change that no phrase match notices is still a regression here
      //         (`rule.forbid.friction-hazards`, and the shape `[case6]` already sets)
      //         BOTH streams, the empty one too — a stdout-only snap is blind to content
      //         that APPEARS on the unsnapped stream, and the empty stderr snap is what
      //         proves the absent stream stays absent
      then('the destruction renders as snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });

    when('[t1] the rack is read back', () => {
      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('the addressed reach is gone', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(
          parsed['testorg.test.MULTI_REACH_KEY@beav@ehmpathy.com'],
        ).toBeUndefined();
      });

      then('its PEER reach is left whole', () => {
        const parsed = JSON.parse(listResult.stdout);

        // THE clamp: a del addressed by bare slug would take both, and a test that only
        // asserted the target's absence would pass while a credential was destroyed silently
        expect(
          parsed['testorg.test.MULTI_REACH_KEY@vlad@ehmpathy.com'],
        ).toBeDefined();
        expect(
          parsed['testorg.test.MULTI_REACH_KEY@vlad@ehmpathy.com'].reach.exid,
        ).toEqual('vlad@ehmpathy.com');
      });

      // .note = the two assertions above read one key each — the gone one and the whole
      //         one. the snapshot reads the WHOLE rack, so it also clamps what neither
      //         names: that no THIRD entry appeared, and that the survivor's own shape is
      //         intact rather than merely present. an addressed del is a destructive act,
      //         and the strongest evidence it was surgical is the full rack after it
      then('the rack after an addressed del renders as snapped', () => {
        expect(asSnapshotSafe(listResult.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(listResult.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = the ERROR path — a del aimed at a reach this host never held
     * .why = a human WILL hit this: they mistype an exid, or aim at a reach a
     *        teammate holds and they do not. the reply is a user-faced render like any
     *        other, so it is owed a snapshot too
     *
     * .note = the key NAME exists here and the REACH does not, which is the exact
     *         shape a bare-slug del would get wrong in the opposite direction: it would
     *         find the name, report success, and destroy a key the human never aimed at.
     *         so this case also clamps that an addressed miss stays a miss
     */
    when('[t2] del a reach this host never held', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'MULTI_REACH_KEY',
            '--env',
            'test',
            '--reach',
            'nobody@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // .note = an addressed miss is a NO-OP, not a failure — a del is idempotent, so a
      //         reach that was never held is already in the state the human asked for
      //         (`rule.forbid.nonidempotent-mutations`). without this line every other
      //         assertion below would still pass on a CRASH, because a stack trace that
      //         happens to name the exid satisfies both the `toContain` and the snapshot
      then('exits with status 0 — an addressed miss is a no-op, not a crash', () => {
        expect(result.status).toEqual(0);
      });

      then('the peer that IS held is not destroyed as a side effect', () => {
        const listResult = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(
          parsed['testorg.test.MULTI_REACH_KEY@vlad@ehmpathy.com'],
        ).toBeDefined();
      });

      then('the reply names the reach it looked for', () => {
        expect(result.stdout + result.stderr).toContain('nobody@ehmpathy.com');
      });

      then('the reply is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * .what = an addressed `del` read through `--json` — the ROBOT contract for the one
   *         destructive command that carries a reach
   * .why = `[case-reach]` clamps the human tree in full and never once passes `--json`, so
   *        the payload a machine consumes was unproven. that gap matters MOST here: a
   *        caller that automates cleanup reads this json to learn what it destroyed, and a
   *        reach dropped from the payload would report a slug-wide del it never performed
   *
   * .note = its own fixture, because `[case-reach]`'s del already ran — a destructive case
   *         cannot share a rack with another destructive case and still say what it proved
   * .note = the peer that lives is asserted here too. `--json` is the surface an automation
   *         trusts, so "the del was surgical" must be legible on the robot path, not only
   *         on the human one
   */
  given('[case-reach-json] an addressed del, read as json', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-daemon' }),
    );

    // cut the SAME key name at two reaches — two addresses, two keys — plus ONE
    // reachless key, which is what `[t2]` needs to prove the payload did not move
    const seed = useBeforeAll(async () => {
      const setResults = [];
      for (const exid of ['beav@ehmpathy.com', 'vlad@ehmpathy.com']) {
        setResults.push(
          await invokeRhachetCliBinary({
            args: [
              'keyrack',
              'set',
              '--key',
              'JSON_REACH_KEY',
              '--env',
              'test',
              '--vault',
              'os.direct',
              '--reach',
              exid,
            ],
            cwd: repo.path,
            env: { HOME: repo.path },
            stdin: `secret-for-${exid}\n`,
          }),
        );
      }
      setResults.push(
        await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'JSON_PLAIN_KEY',
            '--env',
            'test',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'secret-for-nobody\n',
        }),
      );
      return { setResults };
    });

    // .note = the load-bearing precondition. if either `set` failed, every claim below
    //         would be about a rack that holds ONE key (or none), and the case would pass
    //         while it proved no such thing
    when('[t0] both reaches are cut', () => {
      then('every set succeeds — the rack really holds all three keys', () => {
        for (const setResult of seed.setResults)
          expect(setResult.status).toEqual(0);
      });
    });

    when('[t1] del ONE reach with --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'JSON_REACH_KEY',
            '--env',
            'test',
            '--reach',
            'beav@ehmpathy.com',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 and parses as json', () => {
        expect(result.status).toEqual(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      // ⚠️ THE clamp on the payload: a reach dropped here would report a slug-wide del
      //    that never happened, to a caller with no other way to learn otherwise
      then('the payload names the reach it destroyed', () => {
        expect(result.stdout).toContain('beav@ehmpathy.com');
      });

      // .note = the field SPLIT is its own claim, and it needs its own clamp. `slug` is a
      //         field this payload has published since long before reach existed, so the
      //         reach must ride beside it rather than inside it — the moment `slug`
      //         holds an address, one word means two things across `del` and `list`
      //         (rule.forbid.ambiguous-labels). worse, a reachless consumer would still
      //         read it correctly while a reach one silently read a lie. a snapshot alone
      //         would move quietly with such a change; this refuses it by name
      then('slug stays the bare slug, and reach rides beside it', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.JSON_REACH_KEY');
        expect(parsed.reach).toEqual({ exid: 'beav@ehmpathy.com' });
      });

      then('its peer lives on, and the json says so', () => {
        const listResult = invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(
          parsed['testorg.test.JSON_REACH_KEY@vlad@ehmpathy.com'],
        ).toBeDefined();
        expect(
          parsed['testorg.test.JSON_REACH_KEY@beav@ehmpathy.com'],
        ).toBeUndefined();
      });

      then('the del json renders as snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = the SAME payload, for a key that carries no reach at all
     * .why = the emit note claims a reachless del is byte-identical to what it emitted
     *        before this feature existed (e1). that is an ABSOLUTE, and until now not one
     *        case held it — every `--json` del in this suite passes a `--reach`, so a
     *        `reach` field that leaked out as `null` on the reachless path would break
     *        every machine consumer on earth and no test would have moved
     *
     * .note = `'reach' in parsed` is the assertion, NOT `toBeUndefined()`. the two differ
     *         exactly where it matters: `parsed.reach === undefined` is TRUE for an absent
     *         key AND for an explicit `"reach": null`, so it would pass on the one shape
     *         e16 forbids. only the `in` check can tell the field apart from its value
     */
    when('[t2] del a REACHLESS key with --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'JSON_PLAIN_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it exits 0 and parses as json', () => {
        expect(result.status).toEqual(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      // ⚠️ THE e1/e16 clamp on this payload: the field must be ABSENT, never `null`
      then('no reach field is emitted at all — absent, never null', () => {
        const parsed = JSON.parse(result.stdout);
        expect('reach' in parsed).toEqual(false);
        expect(parsed.slug).toEqual('testorg.test.JSON_PLAIN_KEY');
        expect(parsed.effect).toEqual('deleted');
      });

      then('the reachless del json renders as snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });
});
