import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack set', () => {
  /**
   * [uc3] set --key --mech --vault
   * creates host entry, persists to config
   */
  given('[case1] repo without host manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack set --key NEW_KEY --mech PERMANENT_VIA_REPLICA --vault os.direct --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_KEY',
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
          stdin: 'new-key-test-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.NEW_KEY');
        expect(parsed.mech).toEqual('PERMANENT_VIA_REPLICA');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list after set', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ANOTHER_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'another-key-test-value\n',
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows configured key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.ANOTHER_KEY']).toBeDefined();
        expect(parsed['testorg.test.ANOTHER_KEY'].mech).toEqual('PERMANENT_VIA_REPLICA');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(listResult.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc11] keyrack set --at (custom path)
   * writes key to custom keyrack.yml path for role-level keyracks
   */
  given('[case2] keyrack set --at with custom path', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] init custom keyrack then set key', () => {
      const customPath = 'src/roles/mechanic/keyrack.yml';

      // first init the custom keyrack
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'customorg', '--at', customPath],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // then set a key to it
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ROLE_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--at',
            customPath,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'role-key-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key slug uses org from custom keyrack', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('customorg.test.ROLE_KEY');
      });

      then('key appears in custom keyrack.yml', () => {
        const fullPath = join(repo.path, customPath);
        const content = readFileSync(fullPath, 'utf8');
        expect(content).toContain('ROLE_KEY');
      });

      then('root keyrack.yml is NOT modified', () => {
        const rootPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(rootPath, 'utf8');
        expect(content).not.toContain('ROLE_KEY');
      });
    });
  });

  /**
   * [uc11.error] keyrack set --at when custom path doesn't exist
   * should fail with helpful error
   */
  given('[case3] keyrack set --at when path not found', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set --at nonexistent path', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SOME_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--at',
            'nonexistent/keyrack.yml',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'some-value\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions keyrack not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack not found');
      });

      then('error suggests keyrack init --at', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack init');
      });
    });
  });

  /**
   * [uc4] regular credential dual storage
   * non-sudo set stores in BOTH encrypted host manifest AND keyrack.yml
   */
  given('[case4] regular credential dual storage (non-sudo)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set --key with --env test (non-sudo)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DUAL_STORE_KEY',
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
          stdin: 'dual-store-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key appears in keyrack.yml', () => {
        const keyrackYmlPath = join(repo.path, '.agent', 'keyrack.yml');
        expect(existsSync(keyrackYmlPath)).toBe(true);
        const content = readFileSync(keyrackYmlPath, 'utf8');
        expect(content).toContain('DUAL_STORE_KEY');
      });

      then('host manifest is also updated (encrypted)', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
        const stats = statSync(manifestPath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });

  /**
   * [uc-multiline] multiline json via stdin roundtrips correctly
   * fixes bug where only first line was read from piped stdin
   */
  given('[case5] multiline json via stdin', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    // multiline json with embedded newlines (like RSA key content)
    const multilineJson = JSON.stringify(
      {
        appId: '3234162',
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\nMIIE...line2\nline3\n-----END RSA PRIVATE KEY-----',
        installationId: '120377098',
      },
      null,
      2,
    );

    when('[t0] set with multiline json piped via stdin', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MULTILINE_JSON_KEY',
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
          stdin: multilineJson,
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set output contains configured key', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toEqual('testorg.test.MULTILINE_JSON_KEY');
      });
    });

    when('[t1] unlock and get the key', () => {
      // unlock the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'MULTILINE_JSON_KEY',
            '--env',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'MULTILINE_JSON_KEY',
            '--env',
            'test',
            '--allow-dangerous',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('secret matches exact input (round-trip)', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual(multilineJson);
      });

      then('secret is parseable json with all fields', () => {
        const parsed = JSON.parse(getResult.stdout);
        const secret = JSON.parse(parsed.grant.key.secret);
        expect(secret.appId).toEqual('3234162');
        expect(secret.privateKey).toContain('BEGIN RSA');
        expect(secret.installationId).toEqual('120377098');
      });
    });
  });

  /**
   * [uc-camp] set accepts --env camp
   * proves the camp env passes set's isValidKeyrackEnv gate (via
   * asResolvedEnvForSet) and stores a camp-tagged slug
   */
  given('[case6] set --key --env camp', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set --key CAMP_KEY --env camp --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CAMP_KEY',
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
          stdin: 'camp-key-value\n',
        }),
      );

      then('exits with status 0 (camp is accepted, not rejected)', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the camp-tagged slug', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.camp.CAMP_KEY');
        expect(parsed.mech).toEqual('PERMANENT_VIA_REPLICA');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc-reach] set --reach cuts a key per reach
   *
   * .what = drives the built binary to cut one key name at two addresses, and clamps the
   *         two guarantees that make a reach an IDENTITY axis rather than a modifier
   * .why = `set --reach` is the command the whole feature rests on — a key must be cut for a
   *        lock before it can be unlocked for one — and its cli output had no acceptance
   *        coverage at all. every prior reach acceptance test drives `source` or the sdk
   *
   * .note = `[t2]` is the one with teeth. it clamps at the CLI grain what a unit test clamps
   *         at the operation grain: a REACH set must NOT declare the key in keyrack.yml,
   *         because a repo manifest states what the REPO needs while a reach is what THIS
   *         HOST holds (q8). the defect it guards shipped, and its own file's header comment
   *         claimed the opposite
   * .note = `[t0]` is the e1 baseline in the same breath — a reachless set still writes the
   *         yml, so `[t2]` cannot pass by a blanket refusal to write
   */
  given('[case7] one key name, cut at two reaches', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set WITHOUT a reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CLAUDE_TOKEN',
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
          stdin: 'reachless-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('carries NO reach field — absent, never null (e16)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.CLAUDE_TOKEN');
        expect('reach' in parsed).toBe(false);
      });

      then('declares the key in keyrack.yml — today, unchanged (e1)', () => {
        const content = readFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          'utf8',
        );
        expect(content).toContain('CLAUDE_TOKEN');
      });
    });

    when('[t1] set the SAME key name at a reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CLAUDE_TOKEN',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--reach',
            'beav@ehmpathy.com',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'reach-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('carries the reach it was cut for', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.CLAUDE_TOKEN');
        expect(parsed.reach.exid).toEqual('beav@ehmpathy.com');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot('stdout');
      });

      // ⚠️ the stderr half matters MORE on a `--json` variant than anywhere else: a caller
      // pipes stdout into a parser, so any line that drifted onto it breaks the parse — and
      // the only way to catch that drift is to record what the OTHER stream holds. an empty
      // snapshot is the positive record of that absence
      // (rule.require.contract-snapshot-exhaustiveness)
      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });

    when('[t2] a name cut ONLY at a reach, never reachless', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'REACH_ONLY_TOKEN',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--reach',
            'vlad@ehmpathy.com',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'reach-only-value\n',
        }),
      );

      then('the set itself succeeds', () => {
        expect(result.status).toEqual(0);
        expect(JSON.parse(result.stdout).reach.exid).toEqual(
          'vlad@ehmpathy.com',
        );
      });

      then('keyrack.yml declares NO requirement for it (q8)', () => {
        const content = readFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          'utf8',
        );

        // THE clamp. the key NAME is what a reach set would wrongly findsert — never the
        // exid, which the yml has no field for. so the name must be a name no reachless
        // set ever wrote, or `[t0]`'s own write would mask the defect entirely
        expect(content).not.toContain('REACH_ONLY_TOKEN');

        // and no keyrack command authors a `reaches:` line — a human commits that by hand
        expect(content).not.toContain('reaches');
      });
    });

    when('[t3] list shows the rack', () => {
      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('both reaches coexist under one key name', () => {
        const parsed = JSON.parse(listResult.stdout);

        // one name, two addresses — neither evicts the other, because they were never
        // the same key. this is the whole of "cut a key per lock"
        expect(parsed['testorg.test.CLAUDE_TOKEN']).toBeDefined();
        expect(
          parsed['testorg.test.CLAUDE_TOKEN@beav@ehmpathy.com'],
        ).toBeDefined();
      });

      then('the reachless entry carries no reach, the other does', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect('reach' in parsed['testorg.test.CLAUDE_TOKEN']).toBe(false);
        expect(
          parsed['testorg.test.CLAUDE_TOKEN@beav@ehmpathy.com'].reach.exid,
        ).toEqual('beav@ehmpathy.com');
      });

      // .note = the assertions above read FIELDS; this clamps the SHAPE they sit in. a
      //         rename, a reorder, or a field added beside them passes every `toBeDefined`
      //         and still changes the payload a robot consumes — `--json` is a contract for
      //         machines, so its structure IS its promise (`rule.forbid.friction-hazards`)
      // .note = the human twin is snapped at `[t6]`. json and tree are two contracts off one
      //         command, and a change to either can leave the other untouched
      then('the two-reach json renders as snapped', () => {
        expect(asSnapshotSafe(listResult.stdout)).toMatchSnapshot('stdout');
      });

      // both streams — see the note at [t1]
      then('the two-reach json leaves stderr empty', () => {
        expect(listResult.stderr).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = the HUMAN render of `list` while two reaches of one name are held
     * .why = `[t3]` above reads `--json`, which is a different contract from the tree a
     *        human reads. the json proves the DATA holds two addresses; this proves the
     *        human can SEE both, and can tell which is which
     *
     * .note = this is the same blind spot `[t4]` exposed on `set` — a reach `when` that
     *         passes `--json` routes around the render branch entirely, so the suite goes
     *         green whether or not the tree ever mentions a reach
     */
    when('[t6] list rendered for a human (no --json)', () => {
      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(listResult.status).toEqual(0);
      });

      then('the tree shows the reach of the reach key', () => {
        expect(listResult.stdout).toContain('CLAUDE_TOKEN');
        expect(listResult.stdout).toContain('beav@ehmpathy.com');
      });

      then('the render is snapped', () => {
        expect(asSnapshotSafe(listResult.stdout)).toMatchSnapshot('stdout');
      });

      // both streams — see the note at [t1]
      then('the render leaves stderr empty', () => {
        expect(listResult.stderr).toMatchSnapshot('stderr');
      });
    });

    /**
     * .what = the HUMAN render of a reach set — no `--json`
     * .why = every `when` above passes `--json`, so not one of them touches the tree a
     *        human reads. `set` accepted `--reach` and then printed a bare slug, while
     *        `del`, `list`, `status`, and `unlock` all showed the reach. a human who
     *        cut a key at a reach could not confirm where it landed
     *
     * .note = ⚠️ this `when` exists because the suite was BLIND to that defect. 48 tests
     *         passed both before and after the render was fixed, because `--json` routes
     *         around the branch entirely. a green suite that cannot see a change is not
     *         evidence about it
     */
    when('[t4] set at a reach, rendered for a human (no --json)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'HUMAN_RENDER_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'human-render-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree names the ADDRESS, not the bare slug', () => {
        expect(result.stdout).toContain(
          'testorg.test.HUMAN_RENDER_KEY@beav@ehmpathy.com',
        );
      });

      then('the render is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      // both streams — see the note at [t1]
      then('the render leaves stderr empty', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });

    /**
     * .note = the e1 twin of `[t4]`. a reachless set must render EXACTLY as it did before
     *         the reach axis existed — `asKeyrackKeySlugAtReach` returns the bare slug byte
     *         for byte when no reach is given, and this holds it to that
     */
    when('[t5] set with NO reach, rendered for a human (e1)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'REACHLESS_RENDER_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'reachless-render-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree carries the bare slug, with no `@` appended', () => {
        expect(result.stdout).toContain('testorg.test.REACHLESS_RENDER_KEY');
        expect(result.stdout).not.toContain('REACHLESS_RENDER_KEY@');
      });

      then('the render is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      // ⚠️ both streams, and on THIS case the stderr half carries the e1 claim: "byte for
      // byte as before the reach axis existed" is a claim about the whole contract, and a
      // stdout-only pair can only ever prove half of it
      then('the render leaves stderr empty', () => {
        expect(result.stderr).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * .what = a reach aimed at a vault whose storage address has no reach axis
   * .why = a reach PARTITIONS storage: two reaches of one key are two values, filed
   *        apart. a vault whose address is a flat name has nowhere to put the second, so it
   *        must REFUSE rather than accept and collapse both onto one address
   *
   * .note = the refusal is a user-faced contract like any success render, so it is owed a
   *         snapshot at the same grain. the unit test for `assertKeyrackReachAddressable`
   *         clamps the MESSAGE; only this clamps what a human actually sees — the turtle
   *         blocked tree, the hint, and the exit code together
   *
   * ⚠️ .note = the vault here is `github.secrets`, NOT `os.envvar`, and the difference
   *         decides whether the guard is reached at all. the two vaults guard OPPOSITE
   *         directions:
   *
   *           github.secrets — guards `write` (set + del): its address is a flat repo-secret
   *                            name, so a second reach would OVERWRITE the first
   *           os.envvar      — guards `read` only: its `set` is unconditionally read-only
   *                            (env vars are set by the caller, never by keyrack), so a
   *                            `set --vault os.envvar --reach` throws on the read-only
   *                            guard FIRST and never reaches the reach guard at all
   *
   *         so `github.secrets` is the one vault where a `set --reach` actually meets this
   *         refusal. the `os.envvar` read direction is clamped at the unit grain, and is
   *         unreachable from the cli without a ci-shaped env fixture
   * .note = the guard fires BEFORE the github repo lookup, so this needs no network and no
   *         fixture beyond a bare repo — the refusal is the whole interaction
   */
  given('[case8] a reach aimed at a vault that cannot file one', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set --vault github.secrets with a --reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CI_BLOB_KEY',
            '--env',
            'test',
            '--vault',
            'github.secrets',
            // .note = `--mech` is REQUIRED here, and not as boilerplate: github.secrets
            //         supports two mechs, so without it the cli prompts for a choice and
            //         the refusal is never reached. the guard sits behind the prompt
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--reach',
            'beav@ehmpathy.com',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'ci-secret-value\n',
          logOnError: false,
        }),
      );

      then('the flag is published, not rejected as unknown', () => {
        expect(result.stdout + result.stderr).not.toMatch(/unknown option/i);
      });

      then('it is refused, and the refusal names the vault as the cause', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('github.secrets');
        expect(output).toContain('--reach');
      });

      // the WRITE consequence must be said out loud: a shared flat address means the second
      // reach OVERWRITES the first, and a credential is lost with no signal. a message
      // that only said "unsupported" would leave a human to guess whether their first key
      // survived (`rule.require.errors-name-the-fix`)
      then('the refusal names the harm it prevents, not just the rejection', () => {
        expect(result.stdout + result.stderr).toContain('overwrite');
      });

      // .note = the same blind spot the note below names, applied to the EXIT CODE: a
      //         change that kept this exact tree while it dropped the exit to 1 would go
      //         unseen, and a human who checked `$?` would read a clear refusal as a crash
      //         (`rule.require.exit-code-semantics`)
      then('it exits 2 — a caller-fixable refusal, never a defect', () => {
        expect(result.status).toEqual(2);
      });

      // ⚠️ the two `toContain` assertions above are what give this case teeth. a snapshot
      //    ALONE would have passed here even when the command dumped a raw stack trace — a
      //    first-write snapshot accepts whatever it is handed. the snapshot clamps DRIFT;
      //    only the content assertions clamp CORRECTNESS
      // ⚠️ two streams, never `stdout + stderr`. a concatenation is blind to a stream
      // migration — the bytes are identical either way — and on a REFUSAL that is the very
      // drift that matters: a blocked tree which slid onto stdout would be eval'd by a
      // caller who pipes it (rule.require.contract-snapshot-exhaustiveness)
      then('the whole blocked tree is snapped: stdout', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('the whole blocked tree is snapped: stderr', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });
});
