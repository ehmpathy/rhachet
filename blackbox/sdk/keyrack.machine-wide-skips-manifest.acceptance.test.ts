import { spawnSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genBrokenKeyrackManifestYml } from '@/blackbox/.test/infra/genBrokenKeyrackManifestYml';
import { asSnapshotSafe } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = the SDK-grain clamp for `a machine-wide ask must not load a repo manifest it never
 *         consults` — the sdk twin of blackbox/cli/keyrack.machine-wide-skips-manifest
 * .why = `rule.require.separate-cli-sdk-acceptance-tests`. `keyrack.get` publishes BOTH a cli
 *        and an sdk contract, so a scenario proven on one and not the other is a parity gap
 *
 * .note = this is NOT a duplicate of the cli clamp. the two surfaces disagree on exactly the
 *         input this wish turns on: the cli DEFAULTS `--org` to '@this' (invokeKeyrack.ts:432),
 *         while the sdk declares `org?: string` with no default, so an ask that names no org
 *         arrives here as `undefined`. that is the vision's e10, and it is the overstatement
 *         hazard's home — a predicate written as `org !== '@this'` would read every one of
 *         these sdk calls as machine-wide and retire the ORG_MISMATCH guard wholesale. only
 *         this surface can catch that
 * .note = the sdk is also where a manifest throw is most costly. a bare BadRequestError is NOT
 *         caught by getAllKeyrackGrantsOrEmitBlocked (it catches ConstraintError only), so it
 *         escapes as a malfunction rather than a blocked render
 */
describe('keyrack machine-wide skips manifest (sdk)', () => {
  beforeAll(() => killKeyrackDaemonForTests());

  const rhachetDistPath = resolve(
    process.cwd(),
    'dist',
    'contract',
    'sdk.keyrack.js',
  );

  /**
   * .what = a temp repo whose .agent/keyrack.yml extends a file that is not there
   * .why = the exact premise of ehmpathy/rhachet#467 — a manifest that cannot hydrate
   *
   * .note = the manifest BODY comes from shared infra (genBrokenKeyrackManifestYml) so this
   *         clamp and the cli twin cannot drift apart on the premise they both test
   * .note = the repo AROUND it is built here rather than by genTestTempRepo, deliberately.
   *         this clamp spawns a module that must `import` the built dist, so it needs
   *         `node_modules` symlinked — which genTestTempRepo does not offer, since its
   *         fixture-copy path serves cli asks that need a host manifest and ssh keys instead.
   *         genTempDir from test-fns still does the temp-dir work, so no temp dir is
   *         hand-rolled here (rule.forbid.adhoc-gentempdir-reimpl)
   */
  const genBrokenManifestRepo = (input: { slug: string }): string => {
    const testDir = genTempDir({
      slug: input.slug,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
      git: true,
    });
    const agentDir = join(testDir, '.agent');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(
      join(agentDir, 'keyrack.yml'),
      genBrokenKeyrackManifestYml({ repoKey: '__TEST_SDK_MW_REPO_KEY__' }),
    );
    // ⚠️ .why.assert = a DISCARDED status here is a silent wrong baseline. this whole file's
    //    premise is a repo whose committed manifest cannot hydrate; if `git` fails — an index
    //    lock, a hook, an unset identity — the commit never lands, and every row below reads
    //    green for a cause unrelated to its name. that is the worst shape a clamp can take,
    //    since it reports a guarantee it never exercised (`rule.require.failloud`)
    const asCommitted = (input: {
      args: string[];
      env?: Record<string, string>;
    }): void => {
      const ran = spawnSync('git', input.args, {
        cwd: testDir,
        encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
        env: { ...process.env, ...input.env },
      });
      if (ran.status !== 0)
        throw new MalfunctionError('the test fixture could not be committed', {
          args: input.args,
          status: ran.status,
          stderr: ran.stderr,
          fix: 'the fixture repo is what this suite reads; check git is usable in a temp dir',
        });
    };

    asCommitted({ args: ['add', '.'] });
    asCommitted({
      args: ['commit', '-m', 'add keyrack.yml'],
      env: {
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test@test.com',
        GIT_COMMITTER_NAME: 'test',
        GIT_COMMITTER_EMAIL: 'test@test.com',
      },
    });
    return testDir;
  };

  const runModule = (input: {
    testDir: string;
    name: string;
    body: string;
    secrets: Record<string, string>;
  }): { status: number | null; stdout: string; stderr: string } => {
    const modulePath = join(input.testDir, `${input.name}.mjs`);
    writeFileSync(modulePath, input.body);
    const spawned = spawnSync('node', [modulePath], {
      cwd: input.testDir,
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
      env: {
        ...process.env,
        HOME: input.testDir,
        XDG_RUNTIME_DIR: join(input.testDir, '.xdg-runtime'),
        ...input.secrets,
      },
    });
    return {
      status: spawned.status,
      stdout: spawned.stdout,
      stderr: spawned.stderr,
    };
  };

  /**
   * .what = swap the run's temp dir for `/TMP_REPO`, under BOTH names it answers to
   *
   * ⚠️ .why.two-names = `genTempDir` hands back a REPO-LOCAL symlink path
   *        (`<repo>/.temp/genTempDir.symlink/<stamp>._.<slug>.<hash>`), but a spawned child
   *        given that as its `cwd` reports `process.cwd()` RESOLVED — `/tmp/test-fns/<repo>/
   *        .temp/<stamp>._.<slug>.<hash>`. two strings, one directory. a swap on the handed-back
   *        name alone matches not one occurrence, and the raw per-run path (a timestamp AND a
   *        hash) lands in the committed snapshot — green exactly once, on the run that wrote it
   *        (`rule.require.snapshot-verified-on-independent-run`)
   * .note = this was not theorized; the first two resnap attempts BOTH left the raw path in the
   *         diff, and the cause only surfaced once `genTempDir`'s return was printed
   */
  const asTempDirMasked = (input: {
    output: string;
    testDir: string;
  }): string =>
    [input.testDir, realpathSync(input.testDir)].reduce(
      (masked, dir) => masked.split(dir).join('/TMP_REPO'),
      input.output,
    );

  /**
   * .what = the published sdk answer, every volatile axis masked, ready to snap
   * .why = the rows below pin named FIELDS (`attempt.grant.slug`, `attempt.status`). a field
   *        reorder, an extra key, or a changed shape in the returned object passes every one of
   *        them and reaches a consumer unreviewed — which is what a contract snapshot exists to
   *        catch (`rule.require.contract-snapshot-exhaustiveness`). the cli twin snaps each of
   *        its renders; per `rule.require.separate-cli-sdk-acceptance-tests` the sdk is its own
   *        published contract and owes the same vibecheck in a pr
   * .note = the SECRET is masked, never snapped. this is a credential surface and a snapshot is
   *         a committed file, so a real value here would be a leak by construction. the mask is
   *         by EXACT value, so it cannot over-mask an unrelated field
   * .note = absolute paths and timestamps are masked for the usual reason — each is green
   *         exactly once otherwise (`rule.require.snapshot-verified-on-independent-run`)
   *
   * ⚠️ .why.vocab = the placeholders are the repo's SHARED ones (`/TMP_REPO`, `__TIMESTAMP__`,
   *         `$SECRET`), never a private set. an earlier draft rolled its own `<PATH>`/`<SECRET>`/
   *         `<TIMESTAMP>` and this file became the only one in `blackbox/` that spoke them — the
   *         same concept under two names, four lines from its cli twin. one vocabulary per
   *         concept (`rule.require.ubiqlang`)
   * ⚠️ .why.composed = it delegates to `asSnapshotSafe`, the ONE masker every blackbox suite
   *         shares, rather than hand-rolls the two regexes it needs today. that inherits every
   *         volatile the shared masker already knows (ansi bytes, daemon pids, home paths, iso
   *         timestamps, clone serials) — each of which a private mask would let through silently
   * ⚠️ .why.order = the exact-dir swap runs BEFORE `asSnapshotSafe`. the temp dir's name carries
   *         a uuid, and `asSnapshotSafe` rewrites uuids to `__SERIAL__` — so the reverse order
   *         mangles the path first and the exact swap then matches not one occurrence
   */
  const asSdkAnswerMasked = (input: {
    stdout: string;
    secret: string;
    testDir: string;
  }): unknown =>
    JSON.parse(
      asSnapshotSafe(
        asTempDirMasked({ output: input.stdout, testDir: input.testDir }),
      )
        .split(input.secret)
        .join('$SECRET'),
    );

  /**
   * .what = the twin of `asSdkAnswerMasked` for a render that is NOT json — the refusal an sdk
   *         caller catches, printed as `error.name:` / `error.message:` lines
   * .why = the guard row's answer is a throw, so the json mask cannot reach it. it is a
   *        published contract all the same (`rule.require.contract-snapshot-exhaustiveness`)
   * .note = the mask is the SAME exact-dir swap the json twin uses, and that is deliberate
   *         rather than incidental. a loose `\/[^\s]+` regex also matches the RELATIVE
   *         `.agent/keyrack.does-not-exist.yml`, so it eats the filename that names the cause —
   *         a mask that erases the find leaves a snapshot green over a blank
   * ⚠️ .note = the exact swap is also STRICTLY more legible than the `"<PATH>"` an earlier draft
   *         used. that one collapsed the whole quoted path, filename and all; this one replaces
   *         only the volatile ROOT, so `/TMP_REPO/.agent/does-not-exist/keyrack.yml` survives
   *         into the snapshot — and the path that names the cause is the fact a reviewer reads
   */
  const asSdkSaidMasked = (input: { said: string; testDir: string }): string =>
    asSnapshotSafe(
      asTempDirMasked({ output: input.said, testDir: input.testDir }),
    );

  given('[case1] a repo whose keyrack.yml extends an absent file', () => {
    const machineKey = '__TEST_SDK_MW_MACHINE_KEY__';
    const machineValue = 'sdk-machine-secret';

    when('[t0] the ask is an @all slug, with NO org named — THE REPRO', () => {
      // .why = the sdk surface passes NO org at all, so `org` is `undefined` here. the ask is
      //        machine-wide only because the SLUG says so, which is the precedence this wish
      //        turns on. the cli twin cannot prove this row: its --org default fills in '@this'
      // .why.hoisted = see [t2] — bound here so the mask swaps the dir this row actually used
      const testDir = genBrokenManifestRepo({ slug: 'keyrack-sdk-mw-slug' });
      const result = useBeforeAll(async () =>
        runModule({
          testDir,
          name: 'test-mw-slug',
          secrets: { [machineKey]: machineValue },
          body: `
import { keyrack } from '${rhachetDistPath}';

const result = await keyrack.get({ for: { key: '@all.camp.${machineKey}' } });
console.log(JSON.stringify(result, null, 2));
`,
        }),
      );

      then('it exits 0 — the broken manifest is never loaded', () => {
        expect(result.status).toEqual(0);
      });

      then('the slug keeps its machine-wide org', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt?.grant?.slug).toEqual(`@all.camp.${machineKey}`);
      });

      then('the secret is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt?.status).toEqual('granted');
        expect(parsed.attempt?.grant?.key?.secret).toEqual(machineValue);
      });

      then('the shape a consumer receives is snapped', () => {
        // the three pins above prove three FIELDS; this pins the whole contract, so a reviewer
        // sees in the pr exactly what an sdk caller gets back
        expect(
          asSdkAnswerMasked({
            stdout: result.stdout,
            secret: machineValue,
            testDir,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the ask is a bare key with org @all', () => {
      // .why.hoisted = see [t2] — bound here so the mask swaps the dir this row actually used
      const testDir = genBrokenManifestRepo({ slug: 'keyrack-sdk-mw-flag' });
      const result = useBeforeAll(async () =>
        runModule({
          testDir,
          name: 'test-mw-flag',
          secrets: { [machineKey]: machineValue },
          body: `
import { keyrack } from '${rhachetDistPath}';

const result = await keyrack.get({ for: { key: '${machineKey}' }, env: 'camp', org: '@all' });
console.log(JSON.stringify(result, null, 2));
`,
        }),
      );

      then('it exits 0 — the two spellings agree on this surface too', () => {
        expect(result.status).toEqual(0);
      });

      then('the secret is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt?.status).toEqual('granted');
        expect(parsed.attempt?.grant?.key?.secret).toEqual(machineValue);
      });

      then('the shape a consumer receives is snapped', () => {
        // snapped SEPARATELY from [t0] on purpose: the two spellings reach this answer by two
        // routes (a slug that names the org vs an `org` argument), so one shared snapshot would
        // hide a divergence between them rather than catch it
        expect(
          asSdkAnswerMasked({
            stdout: result.stdout,
            secret: machineValue,
            testDir,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] the ask is repo-scoped, with NO org named — THE GUARD', () => {
      // .why = this row is what gives the clamp teeth on the sdk surface, and it is the row a
      //        negated predicate (`org !== '@this'`) would break: `org` is `undefined` here,
      //        exactly as in [t0], yet this ask MUST still load the manifest and fail loud
      // ⚠️ .why.hoisted = the dir is bound HERE, never read back off `result`. `useBeforeAll`
      //         hands back a deferred proxy, and a `result.testDir` read off it did not agree
      //         with the `result.stdout` the same row snapped — so the exact-dir swap matched
      //         not one occurrence and a per-run path (timestamp + hash) landed in the committed
      //         snapshot, green exactly once. a plain closure binding cannot drift from itself
      const testDir = genBrokenManifestRepo({ slug: 'keyrack-sdk-mw-guard' });
      const result = useBeforeAll(async () =>
        runModule({
          testDir,
          name: 'test-mw-guard',
          secrets: { __TEST_SDK_MW_REPO_KEY__: 'repo-secret' },
          body: `
import { keyrack } from '${rhachetDistPath}';

try {
  const result = await keyrack.get({ for: { key: '__TEST_SDK_MW_REPO_KEY__' }, env: 'test' });
  console.log('unexpected success:', JSON.stringify(result));
} catch (error) {
  console.log('error.name:', error.name);
  console.log('error.message:', error.message);
  process.exit(error.code?.exit ?? 1);
}
`,
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

      then('the refusal a consumer catches is snapped', () => {
        // the REFUSAL is a published contract too — a consumer branches on `error.name` and
        // shows `error.message` to a human, so a rename or a reworded cause breaks them, and
        // the two loose `toMatch` rows above would sail straight through it
        expect(
          asSdkSaidMasked({ said: result.stdout, testDir }),
        ).toMatchSnapshot();
      });
    });
  });
});
