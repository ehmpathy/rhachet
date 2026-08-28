import { spawnSync } from 'node:child_process';
import { symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { asSnapshotSafe } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = sdk parity for the reach axis — the twin of `blackbox/cli/keyrack.session`'s [case4]
 * .why = `rule.require.separate-cli-sdk-acceptance-tests` demands parity wherever BOTH
 *        contracts exist, and both do here: `keyrack.get` takes a `reach` exid just as
 *        `rhx keyrack get --reach` does. the sdk is the surface a CONSUMER imports, so a
 *        reach it cannot name is a reach it cannot fetch
 * .note = needs no vault, daemon, or credential — the q2 guard fires before any lookup
 */
describe('keyrack.reach', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  const rhachetDistPath = resolve(
    process.cwd(),
    'dist',
    'contract',
    'sdk.keyrack.js',
  );

  /**
   * .what = provisions a temp repo whose manifest declares one key, then runs one
   *         sdk call in it and hands back what the process said
   * .why = every case below differs only in the call it makes, so the scaffold is
   *         shared and the case reads as its call
   */
  const runSdkCall = (input: {
    slug: string;
    call: string;
  }): { status: number | null; stdout: string; stderr: string } => {
    const testDir = genTempDir({
      slug: input.slug,
      symlink: [{ at: 'node_modules', to: 'node_modules' }],
      git: true,
    });

    const agentDir = join(testDir, '.agent');
    spawnSync('mkdir', ['-p', agentDir]);
    writeFileSync(
      join(agentDir, 'keyrack.yml'),
      `org: testorg

env.test:
  - API_KEY
`,
    );
    spawnSync('git', ['add', '.'], { cwd: testDir });
    spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

    const modulePath = join(testDir, 'test-reach.mjs');
    writeFileSync(
      modulePath,
      `
import { keyrack } from '${rhachetDistPath}';

try {
  const result = ${input.call};
  console.log('unexpected success:', JSON.stringify(result));
} catch (error) {
  console.log('error.name:', error.name);
  console.log('error.message:', error.message);
  process.exit(error.code?.exit ?? 1);
}
`,
    );

    const spawnResult = spawnSync('node', [modulePath], {
      cwd: testDir,
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
      env: {
        ...process.env,
        HOME: testDir,
        XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
      },
    });

    return {
      status: spawnResult.status,
      stdout: spawnResult.stdout,
      stderr: spawnResult.stderr,
    };
  };

  /**
   * .what = the same one-call scaffold, but seeded from a FIXTURE rather than a bare temp
   *         dir — so the repo arrives with a manifest and a filled vault already in it
   * .why = every case above exercises a refusal, which needs no store at all. the success
   *        case needs two reaches of one key to exist, and the extant
   *        `with-keyrack-reach-source` fixture already provisions exactly that in plaintext
   *        `os.direct`
   *
   * .note = it prints the whole grant, not a hand-picked field. the case asserts on the
   *         secret AND on the peer's absence, and a `JSON.stringify` of the result is the
   *         only shape that can carry both claims
   * .note = `node_modules` is symlinked in the same way `runSdkCall` does it — the sdk
   *         bundle looks its own imports up from the repo it runs in
   * .note = it overrides HOME but NOT `XDG_RUNTIME_DIR`, and that choice is deliberate.
   *         the daemon socket lives under `XDG_RUNTIME_DIR` at a path keyed by a hash of
   *         HOME (`getKeyrackDaemonSocketPath`), so a fresh HOME already yields a fresh
   *         socket — isolation is bought by HOME alone. to also point `XDG_RUNTIME_DIR`
   *         at a temp path gives the daemon a directory that does not exist to bind in,
   *         and the unlock then dies on `daemon did not become reachable within 5000ms`.
   *         the cli suites take the same shape, via `envIsolated`, for the same reason
   */
  const runSdkCallInFixture = async (input: {
    fixture: string;
    call: string;
  }): Promise<{ status: number | null; stdout: string; stderr: string }> => {
    const repo = await genTestTempRepo({ fixture: input.fixture });

    symlinkSync(
      join(process.cwd(), 'node_modules'),
      join(repo.path, 'node_modules'),
    );

    const modulePath = join(repo.path, 'test-reach-success.mjs');
    writeFileSync(
      modulePath,
      `
import { keyrack } from '${rhachetDistPath}';

const result = ${input.call};
console.log(JSON.stringify(result));
`,
    );

    const spawnResult = spawnSync('node', [modulePath], {
      cwd: repo.path,
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
      env: {
        ...process.env,
        ...envIsolated(repo.path),
      },
    });

    return {
      status: spawnResult.status,
      stdout: spawnResult.stdout,
      stderr: spawnResult.stderr,
    };
  };

  given('[case1] a reach named across a whole-repo sweep', () => {
    when('[t0] keyrack.get is called with for.repo and a reach', () => {
      const result = useBeforeAll(async () =>
        runSdkCall({
          slug: 'keyrack-sdk-reach-repo',
          call: `await keyrack.get({ for: { repo: true }, env: 'test', reach: 'beav@ehmpathy.com' })`,
        }),
      );

      then(
        'the built contract accepts the field, not rejects it as unknown',
        () => {
          expect(result.stdout + result.stderr).not.toMatch(
            /reach.*not.*(assignable|expected)/i,
          );
        },
      );

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('it is refused rather than silently narrowed to one key', () => {
        expect(result.stdout).toContain('ConstraintError');
        expect(result.stdout).toContain('--reach requires a key');
      });

      then('the refusal names the key as the fix, and echoes the exid', () => {
        expect(result.stdout).toContain('beav@ehmpathy.com');
      });

      // .note = the string assertions above clamp the FACTS a human needs; the snapshot
      //         clamps the SHAPE they arrive in. a reword that keeps every asserted phrase
      //         can still wreck the layout a human reads, and only a snapshot surfaces
      //         that on the pr diff (`rule.forbid.friction-hazards`)
      then('the refusal renders as snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  given('[case2] a reach that is no exid at all', () => {
    when('[t0] keyrack.get is called with a blank reach', () => {
      const result = useBeforeAll(async () =>
        runSdkCall({
          slug: 'keyrack-sdk-reach-blank',
          call: `await keyrack.get({ for: { key: 'API_KEY' }, env: 'test', reach: '   ' })`,
        }),
      );

      // .note = the exit code is asserted EXACTLY, not merely as non-zero. `not.toEqual(0)`
      //         would pass on a crash (exit 1) as readily as on the refusal, so it could
      //         not tell an intact guard from a broken one. exit 2 is the caller-fixable
      //         code ConstraintError carries (rule.require.exit-code-semantics)
      then('it is refused as a caller-fixable fault, with exit 2', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('ConstraintError');
      });

      // .note = the message is matched on the SENTENCE, not the word 'reach' — which the
      //         call itself echoes, so it would match a stack trace too
      then('the refusal names the empty exid as the cause', () => {
        expect(result.stdout).toContain('a reach exid may not be empty');
      });

      then('it fails at the sdk boundary, before any lookup', () => {
        expect(result.stdout).not.toContain('unexpected success:');
        expect(result.stdout + result.stderr).not.toMatch(/os\.envvar|daemon/);
      });

      then('the refusal renders as snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * .what = e6 / e18, proven end to end on the BUILT contract: a reach no key was cut for
   *         is an ABSENT KEY, reported as such, and never answered with a peer's value
   * .why = this temp repo has no daemon and no vault, so a keyed reach-ask finds no source
   *        that can answer it. `os.envvar` is the last one tried, and it structurally
   *        cannot hold a reach-key — a variable name carries no reach. so the ask must
   *        come back ABSENT, never with the reachless variable's value, which is precisely
   *        e18's wrong-reach failure
   *
   * .note = an earlier draft of this case asserted that `os.envvar` THREW here, and framed
   *         the path as ci-specific. both were wrong, and the second hid the first:
   *         - the guard is unconditional, not ci-specific — it fires wherever a reach-ask
   *           reaches that vault, which includes `fill`'s "is this already granted?" probe.
   *           a throw there killed the whole `fill` run for a `require` reach — the very
   *           scenario the feature exists for
   *         - a multi-source probe owes its caller a STATUS, not an exception, when a key
   *           is simply not present. absence is the answer, not a fault
   *         so the vault keeps its refusal for a DIRECT ask (its own unit test clamps it),
   *         and the probe treats it as an absent source. e18's guarantee is unchanged and
   *         in fact stricter: the reachless variable is never even read
   */
  given('[case3] a keyed reach-ask that no source can answer', () => {
    when('[t0] keyrack.get is called with a key and a reach', () => {
      const result = useBeforeAll(async () =>
        runSdkCall({
          slug: 'keyrack-sdk-reach-keyed',
          call: `await keyrack.get({ for: { key: 'API_KEY' }, env: 'test', reach: 'beav@ehmpathy.com' })`,
        }),
      );

      then('the pair itself is accepted — a reach rides a key selector', () => {
        // the q2 guard did NOT fire; the call got past it and reached the sources
        expect(result.stdout).not.toContain('--reach requires a key');
      });

      // .note = asserted EXACTLY, and it is the load-bearing half of this case. every
      //         other assertion below reads stdout, and a crash can print text that
      //         satisfies a `toContain` while the process dies — so without this line
      //         the case could go green on a throw. exit 0 is the claim: an absent key
      //         is an ANSWER, not a fault, so the harness takes its success path and
      //         node exits clean (`rule.require.exit-code-semantics`)
      then('absence is reported, so the process exits 0 rather than faults', () => {
        expect(result.status).toEqual(0);
      });

      then('the ask comes back absent, not as a crash (e6)', () => {
        expect(result.stdout).toContain('"status":"absent"');
        // a raw class dump would mean the probe threw where it owed a status
        expect(result.stdout).not.toContain('ConstraintError');
      });

      then('the report names the REACH that has no key', () => {
        expect(result.stdout).toContain('beav@ehmpathy.com');
        expect(result.stdout).toContain('each reach needs its own key');
      });

      then('no value is handed back in its place (e18)', () => {
        // the whole hazard is a live credential for the WRONG reach. an absent
        // report carries no secret at all, so there is none to be wrong
        expect(result.stdout).not.toContain('"secret"');
        expect(result.stdout).not.toContain('"grant"');
      });

      then('the fix carries the reach, so it cuts the RIGHT key', () => {
        // a fix that dropped `--reach` would walk the human into the reachless key
        expect(result.stdout).toContain(
          'keyrack set --key API_KEY --env test --reach beav@ehmpathy.com',
        );
      });

      then('the absent-report renders as snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * [case4] THE success path, and the one grain that can prove the VALUE
   *
   * .what = a key cut at two reaches; ask for ONE by exid and assert the secret
   *         handed back is that reach's, never its peer's
   * .why = q11 requires `get` to take a reach and return the right credential. every
   *        other case in this file — and `[case5]` at the cli — proves keyrack can say
   *        NO. this is the only one that proves it says YES, and says it with the right
   *        secret
   *
   * .note = the SDK is the only surface that can make this claim. the cli's `keyrack get`
   *         renders a status tree and never prints a secret, and `keyrack source` takes no
   *         `--reach` at all — so at the cli the strongest available claim is "the address
   *         resolves" (clamped at `keyrack.session.acceptance [case6][t1]`). here a grant
   *         is a value in hand, so the assertion can name WHICH reach answered
   * .note = the two fixture secrets are deliberately distinct strings. `not.toContain` on
   *         the peer is the half that clamps e18 — a wrong-reach credential is a LIVE
   *         secret, so only the peer's absence proves the address was honored
   * .note = fully hermetic — the fixture stores both reaches in plaintext `os.direct`,
   *         so no age identity, no network, no credential
   *
   * .note = ⚠️ WHICH seam this clamps, and it is not the obvious one. `with: { unlock: true }`
   *         makes `getKeyrackKeyGrants` take TWO reads: a first pass that finds the key
   *         locked, then — after the unlock — a RE-GET. the value handed back comes from
   *         the re-get, so this case clamps `getKeyrackKeyGrants.ts`'s re-get call, NOT its
   *         first-pass call. dogfooded both ways: to drop `reach` from the first pass leaves
   *         this case fully GREEN; to drop it from the re-get turns all three assertions red.
   *         the first pass is clamped by the cli twin at `keyrack.session [case6][t1]`, which
   *         unlocks and gets in two separate commands so its `get` never takes the unlock
   *         path. two cases, two seams — neither one covers the other
   */
  given('[case4] a key cut at two reaches, asked for at one', () => {
    const result = useBeforeAll(async () =>
      runSdkCallInFixture({
        fixture: 'with-keyrack-reach-source',
        call: `await keyrack.get({ for: { key: 'API_KEY' }, env: 'test', reach: 'beav@ehmpathy.com', with: { unlock: true } })`,
      }),
    );

    when('[t0] the reach names a reach a key WAS cut for', () => {
      // .note = stderr is asserted FIRST, and it earned its place. when this case was
      //         first written the unlock died on `daemon did not become reachable within
      //         5000ms` — a throw that left stdout empty, so every `toContain` below read
      //         as a plain mismatch and named no cause. the assertion is scoped to a
      //         thrown class rather than to emptiness, because the daemon legitimately
      //         announces its own spawn on stderr (`[keyrack-daemon] spawned ...`)
      then('it exits 0 and reports granted, not absent', () => {
        expect(result.stderr).not.toContain('Error');
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('"status":"granted"');
        expect(result.stdout).not.toContain('"status":"absent"');
      });

      // THE clamp. a reach-blind read would find the key by name and hand back the
      // reachless secret — a live credential for a reach nobody asked for (e18)
      then('the secret is THAT reach\u2019s, never its peer\u2019s', () => {
        expect(result.stdout).toContain('sk-beav-bbb222');
        expect(result.stdout).not.toContain('sk-reachless-aaa111');
      });

      then('the grant carries the exid it was asked for', () => {
        expect(result.stdout).toContain('beav@ehmpathy.com');
      });

      /**
       * .note = the assertions above clamp the FACTS; this clamps the SHAPE they arrive in.
       *         every OTHER case in this file snaps its output — only this one, the single
       *         success path, did not. so a rename, a reorder, or a dropped field in the
       *         grant the sdk hands a consumer could ship with every `toContain` still green
       * .note = this is the ONE snapshot in the file that carries a grant rather than a
       *         refusal, which is exactly why it is the one worth the most: the refusal
       *         shapes are prose, while this is the consumer-faced data contract
       * .note = the shape it captures is the axis itself: `org: "testorg"` (provenance, the
       *         manifest that declared it) sits beside `reach: { exid: … }` (destination,
       *         the reach it opens), in one payload. a consumer reads both senses off
       *         the grant, and the snapshot is what keeps them both there
       * .note = only stdout is snapped. stderr on this path carries the daemon's own spawn
       *         announcement, which is machine state rather than contract — it is already
       *         clamped above by a scoped `not.toContain('Error')`
       * .note = ⚠️ the `expiresAt` redaction is DEFENSIVE, not load-bearing: this grant is
       *         `PERMANENT_VIA_REPLICA`, so it carries no expiry at all today. it is kept
       *         because a mech that reported one would otherwise flake this snapshot on its
       *         first run, and `asSnapshotSafe`'s own timestamp strip would MISS it —
       *         that pattern requires `.000Z` millis, while `asIsoTimeStamp` emits `:00Z`.
       *         said to be defensive here rather than left to read as a live need
       */
      then('the granted shape renders as snapped', () => {
        const redacted = result.stdout.replace(
          /"expiresAt":"[^"]*"/g,
          '"expiresAt":"__EXPIRES_AT__"',
        );
        expect(asSnapshotSafe(redacted)).toMatchSnapshot('stdout');
        // ⚠️ this was the ONE `then` in this file that snapped a single stream, while the
        //    three above it snap both — the SUCCESS path, and the easiest to leave half
        //    covered precisely because a green case invites less scrutiny than a refusal
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });
});
