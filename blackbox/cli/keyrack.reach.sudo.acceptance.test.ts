import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = a SUDO key cut at a reach, driven through the real cli → socket → daemon wire
 * .why = the route repaired the address-vs-slug read at THREE sites. the machine-wide one
 *        earned two acceptance clamps, on the stated ground that a unit test alone had
 *        already let a whole credential class ship write-only for a full release. its
 *        siblings got careful unit tests and NO acceptance-grain clamp — the very blind spot
 *        this route named and closed for one site, left open for the others. this file
 *        closes it for `getAllSudoSlugsForKeyAsk`
 *
 * .note = ⚠️ the sudo path is a DIFFERENT read from the machine-wide one, so a unit clamp on
 *         one proves not one thing about the other. `getAllSudoSlugsForKeyAsk` indexes the map
 *         with a SLUG (`hosts[keyAsk]`) and narrows candidates against the slugs held. both
 *         steps meet an ADDRESS-keyed map, and both were reach-blind before the repair
 * .note = the reach exid here is `github://org=ehmpathy` — the sudo-realistic shape, and a
 *         deliberate stress on the address rule. it holds `//` and `=`, so any repair that
 *         reached for a parse rather than the `slug` FIELD has more ways to go wrong
 *         (`term=address`: an address is construct-only and is never split back)
 * .note = fully hermetic — `os.direct` is a plaintext store on disk, so a sudo key sits at two
 *         reaches with no vault, no network, and no credential
 * .note = the fixture holds NO reachless `@all.sudo.SUDO_AT_REACH` twin, deliberately. were one
 *         present, a reach-blind repair could fall back to it and every assertion below would
 *         still pass — the absence is what makes a wrong answer impossible to hide
 */
describe('keyrack reach on a sudo key', () => {
  // kill any stale daemon so the fixture store is the only one in play
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] a sudo key cut at two reaches, and no reachless twin', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-sudo-reach' }),
    );

    /**
     * .what = the sudo mirror of the headline defect
     * .why = before the repair `getAllSudoSlugsForKeyAsk` could not name a slug held only at
     *        reaches, so this invocation reported the key absent while the manifest held it
     */
    when('[t0] the sudo key is unlocked at a reach it was cut for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ehmpathy',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — the sudo reach key unlocks', () => {
        expect(result.status).toEqual(0);
      });

      // .note = the SLUG, never the address. a repair that leaked the address as the slug would
      //         still exit 0 and still print a tree — it would print the wrong identifier and
      //         file the grant under it, which is the doubled-address half of this defect class
      then('the tree names the bare slug, never the address', () => {
        expect(result.stdout).toContain('@all.sudo.SUDO_AT_REACH');
        expect(result.stdout).not.toContain(
          '@all.sudo.SUDO_AT_REACH@github://org=ehmpathy',
        );
      });

      then('the tree echoes WHICH reach answered', () => {
        expect(result.stdout).toContain('reach: github://org=ehmpathy');
      });

      // ⚠️ the PRIMARY reach's render is snapped, not only the peer's. `[t3]` snaps the peer
      //    (`github://org=ahbode`) and this case proved its own render by `toContain` alone —
      //    an asymmetry a reviewer caught. the two reaches are the two halves of the same
      //    partition, so a drift in one and not the other is exactly what a snapshot pair
      //    catches (`rule.require.contract-snapshot-exhaustiveness`)
      then('the primary reach render is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = the round trip — the half a unit test cannot reach
     * .why = an expander that returns the right slug still proves no credential is READABLE.
     *        the write-only defect this route exists to fix passed every unit clamp it had
     */
    when('[t1] the value is read back at that same reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          // .note = `--org @all` is REQUIRED on `get`, and is not an artifact of this fixture.
          //         `get` builds its slug from the repo manifest's org unless `@all` is named,
          //         so from a repo whose manifest says `testorg` a bare ask resolves
          //         `testorg.sudo.SUDO_AT_REACH` and misses. `unlock` needs no such flag.
          //         that asymmetry is extant, ratified behavior and is raised to the council
          //         as its own decision — it is NOT introduced by this route
          args: [
            'keyrack',
            'get',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ehmpathy',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it returns the value cut for THAT reach', () => {
        expect(result.stdout).toContain('ghp-sudo-at-ehmpathy-aaa111');
      });

      // ⚠️ the load-carrying half of the round trip. one reach must never answer with another
      //    reach's credential — that is a wrong-account handover, the failure the whole reach
      //    identity axis exists to make impossible
      then('it never leaks the PEER reach value', () => {
        expect(result.stdout).not.toContain('ghp-sudo-at-ahbode-bbb222');
      });
    });

    /**
     * .what = the guard that must survive every repair
     * .why = the tempting repair shape — fall back to the reachless slug — would hand back a
     *        live credential for an account the key was never cut for
     */
    when('[t2] the sudo key is asked at a reach it was NOT cut for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=nowhere',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it does NOT exit 0 — an uncut reach is refused', () => {
        expect(result.status).not.toEqual(0);
      });

      then('no credential of any reach is handed back', () => {
        const rendered = `${result.stdout}${result.stderr}`;
        expect(rendered).not.toContain('ghp-sudo-at-ehmpathy-aaa111');
        expect(rendered).not.toContain('ghp-sudo-at-ahbode-bbb222');
      });

      then('the refusal names the reach it was asked for', () => {
        const rendered = `${result.stdout}${result.stderr}`;
        expect(rendered).toContain('github://org=nowhere');
      });

      // ⚠️ the NEGATIVE path is a human-faced surface too, so it is SNAPPED as well as
      //    asserted. the three probes above pin the properties; only a snapshot lets a
      //    reviewer SEE the refusal — its phrasing, its tree shape, and the `hint:` a human
      //    would paste (`rule.require.contract-snapshot-exhaustiveness`)
      // .note = found by peer review as an inconsistency between two files this route wrote
      //         itself: the machine-wide journey snaps its `[t2]` refusal and this one did
      //         not, so the sudo refusal could drift with no visible diff
      // ⛔ THE CROSS-GRAIN CLAMP — the sudo twin of the machine-wide one. `keyrack set --org`
      //    defaults to `@this`, so a hint with no `--org @all` pastes into a TREE-grain cut
      //    while the GROVE-grain `@all.sudo.` key stays uncut
      // .note = a sudo key is machine-wide by nature (`@all.sudo.`), so this render carries the
      //         flag on every refusal it can produce — there is no reachable variant without it
      then('the refusal hint names the machine-wide grain explicitly', () => {
        expect(result.stderr).toContain(
          'rhx keyrack set --key SUDO_AT_REACH --env sudo --org @all --reach github://org=nowhere',
        );
      });

      then('the refusal render is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });

      // ⛔ THE SIBLING STREAM. the same both-streams discipline `[case2][t0]` applies to the
      //    destructive `del` path, applied here to the refusal: a stderr-only snap is blind to
      //    whatever APPEARS on stdout, so a refusal that leaked a byte there would drift with
      //    no visible diff. the empty snapshot is what makes stdout's silence provable
      then('the refusal leaves stdout empty — the sibling stream, snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = the PEER reach, unlocked and read on its own
     * .why = one reach that works proves only that one address resolves. the property the reach
     *        axis actually promises is that EACH reach of a slug is independently reachable and
     *        answers with its own credential — so the peer is driven end to end too
     *
     * .note = ⚠️ there is deliberately NO bulk (`--key`-less) case here, unlike the machine-wide
     *         journey. `unlock --env sudo` without `--key` is REFUSED by design — sudo asks are
     *         always keyed (`keyrack.sudo.acceptance.test.ts [case2][t0]`). a bulk sudo case
     *         would assert a shape the product does not offer, which is a surprise pinned rather
     *         than a behavior clamped
     */
    when('[t3] the PEER reach is unlocked and read on its own', () => {
      const unlocked = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ahbode',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      const read = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ahbode',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('the peer reach unlocks too', () => {
        expect(unlocked.status).toEqual(0);
        expect(unlocked.stdout).toContain('reach: github://org=ahbode');
      });

      then('it answers with ITS OWN credential', () => {
        expect(read.stdout).toContain('ghp-sudo-at-ahbode-bbb222');
      });

      // ⚠️ the isolation property, and the reason two reaches are in the fixture at all. the
      //    first reach was unlocked at [t0] and is live in the same daemon, so a lookup that
      //    resolved by SLUG rather than by ADDRESS would answer here with the peer's value
      then('the first reach never bleeds into the second', () => {
        expect(read.stdout).not.toContain('ghp-sudo-at-ehmpathy-aaa111');
      });

      then('the render is stable', () => {
        expect(asSnapshotSafe(unlocked.stdout)).toMatchSnapshot();
      });
    });

    /**
     * .what = the sudo reach unlock, asked in ROBOT mode (`--json`)
     * .why = the human tree is clamped four ways above; its `--json` mirror is a SEPARATE
     *        contract and had no sudo coverage at all. `--json` is the surface the grove
     *        reads, so a robot that could not tell two sudo reaches apart is the same
     *        write-only failure this route exists to fix, in machine-readable form
     *
     * .note = ⚠️ this is NOT a duplicate of the machine-wide `[t5]` json case. that one
     *         proves the payload for slugs found by `getAllMachineWideSlugsForEnv`; this one
     *         runs the SUDO expander (`getAllSudoSlugsForKeyAsk`), a different read that was
     *         separately reach-blind. and the exid here is `github://org=ehmpathy` — a shape
     *         holding `//` and `=`, so a payload that round-trips it proves the reach
     *         survives serialization unparsed (`term=address`)
     * .note = its own temp repo, so the payload does not depend on which cases ran before it
     */
    when('[t4] the same sudo unlock, asked in robot mode (--json)', () => {
      const repoRobot = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-sudo-reach' }),
      );

      const unlockJson = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ehmpathy',
            '--json',
          ],
          cwd: repoRobot.path,
          env: envIsolated(repoRobot.path),
          logOnError: false,
        }),
      );

      const payload = useBeforeAll(async () => {
        return JSON.parse(unlockJson.stdout) as {
          unlocked: {
            slug: string;
            env: string;
            org: string;
            reach?: { exid: string };
          }[];
        };
      });

      then('it exits 0 and emits parseable json', () => {
        expect(unlockJson.status).toEqual(0);
        expect(Array.isArray(payload.unlocked)).toEqual(true);
      });

      // ⚠️ the SLUG, never the address. a robot that filed by the payload's `slug` would
      //    file under a doubled address if this leaked — the quiet half of this defect class
      then('the payload names the bare slug, never the address', () => {
        const grant = payload.unlocked.find((one) =>
          one.slug.includes('SUDO_AT_REACH'),
        );
        expect(grant?.slug).toEqual('@all.sudo.SUDO_AT_REACH');
      });

      then('the reach exid survives the wire unparsed', () => {
        const grant = payload.unlocked.find(
          (one) => one.slug === '@all.sudo.SUDO_AT_REACH',
        );
        expect(grant?.reach?.exid).toEqual('github://org=ehmpathy');
      });

      then('the projected payload is snapped', () => {
        expect(
          payload.unlocked.map((grant) => ({
            slug: grant.slug,
            env: grant.env,
            org: grant.org,
            ...(grant.reach ? { reach: grant.reach } : {}),
          })),
        ).toMatchSnapshot('unlocked.projected');
      });
    });

    /**
     * .what = the NEGATIVE path in ROBOT mode — a sudo `--json` ask at an uncut reach
     * .why = ⛔ found by peer review, the sudo twin of the machine-wide gap: `[t2]` proves the
     *        refusal a HUMAN reads and `[t4]` proves the payload a ROBOT reads on SUCCESS, but
     *        the robot's view of a REFUSAL had no clamp on either journey
     *
     * .note = the sudo path is worth its own case rather than trusted to the machine-wide one:
     *         it enters through a DIFFERENT expander (`getAllSudoSlugsForKeyAsk`), and its exid
     *         (`github://org=…`) carries `//` and `=`, which is where a stray parse would show
     */
    when('[t5] an uncut reach is asked for in robot mode (--json)', () => {
      const repoRobotRefused = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-sudo-reach' }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=nowhere',
            '--json',
          ],
          cwd: repoRobotRefused.path,
          env: envIsolated(repoRobotRefused.path),
          logOnError: false,
        }),
      );

      then('a refused robot ask does not exit 0', () => {
        expect(result.status).not.toEqual(0);
      });

      then('a refused robot ask emits no json payload at all', () => {
        expect(result.stdout.trim()).toEqual('');
      });

      then('no credential of any reach reaches either stream', () => {
        const rendered = `${result.stdout}${result.stderr}`;
        expect(rendered).not.toContain('ghp-sudo-at-ehmpathy-aaa111');
        expect(rendered).not.toContain('ghp-sudo-at-ahbode-bbb222');
      });

      then('the refused robot stdout is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('the refused robot stderr is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * .what = `del` on a reach-cut sudo key, from a cwd with NO repo manifest and NO `--org`
   * .why = this is the FOURTH site of the address-vs-slug class, and the only one that lives in
   *        a command the wish fenced off (`do not touch set/get/del`). the fence was lifted by
   *        the wisher's later decision to repair the class in-repo, so the repair is sanctioned
   *        — but it shipped with NO clamp of its own, which is the very gap this route exists to
   *        close. found at the 5.3 verification gate and closed here
   *
   * .note = ⚠️ the org is DERIVED here, and that is the whole point. absent a repo manifest and
   *         absent `--org`, `del --env sudo` finds the org by a name match over the slugs the
   *         rack holds (`findSlugByEnvAndKeyName`). fed the map's ADDRESS keys, the match sees a
   *         key name of `SUDO_AT_REACH@github://org=ehmpathy` and can never equal
   *         `SUDO_AT_REACH` — so a reach-cut sudo key was undeletable by name
   * .note = `findSlugByEnvAndKeyName` has no unit test of its own, so this journey is the only
   *         clamp on that read. said plainly so a later author does not mistake its absence for
   *         safety
   * .note = the peer reach is asserted to SURVIVE — a `del` that removed both would satisfy any
   *         "it is gone" assertion while it destroyed a credential nobody asked it to touch
   */
  given('[case2] a reach-cut sudo key, deleted from a repo with no manifest', () => {
    const repo = useBeforeAll(async () => {
      const repoFound = await genTestTempRepo({
        fixture: 'with-keyrack-sudo-reach',
      });
      // DELETE the repo manifest — this is what forces `del` down the org-DERIVATION branch
      rmSync(join(repoFound.path, '.agent', 'keyrack.yml'), { force: true });
      return repoFound;
    });

    when('[t0] the key is deleted at one reach, with the org left to derive', () => {
      const deleted = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          // .note = deliberately NO `--org` — to name it would skip the derivation branch
          //         entirely and prove not one thing about the read under test
          args: [
            'keyrack',
            'del',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ehmpathy',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // ⛔ THE clamp. before the repair this exited 2 with
      //    `key 'SUDO_AT_REACH' not found in host manifest for env 'sudo'` — on a rack that
      //    plainly holds it, twice over
      then('it exits 0 — the org was derived from the slug, never the address', () => {
        expect(deleted.status).toEqual(0);
      });

      then('the refusal message is absent — the key was found', () => {
        const rendered = `${deleted.stdout}${deleted.stderr}`;
        expect(rendered).not.toContain('not found in host manifest');
      });

      // ⛔ THE HOLE A PEER REVIEW FOUND IN THIS VERY CLAMP, CLOSED. every assertion above is
      //    NEGATIVE — exit 0, and an error phrase absent. a `del` that FOUND the key and then
      //    silently failed to remove it would satisfy all of them, and the peer-survives case
      //    below would pass too. so the clamp proved the key was FOUND and never that it DIED
      // .note = `list --json` is keyed by ADDRESS, which makes it the exact instrument this
      //         case wants: it proves the addressed entry is gone WITHOUT a parse of the
      //         address, and in the same read it proves the peer address is still filed
      //         (`keyrack.del.acceptance.test.ts` uses this same probe at four cases)
      then('the target address is truly gone, and ONLY it', async () => {
        const listed = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        });
        const rack = JSON.parse(listed.stdout) as Record<string, unknown>;

        // the address that was named is gone
        expect(
          rack['@all.sudo.SUDO_AT_REACH@github://org=ehmpathy'],
        ).toBeUndefined();

        // ⚠️ and the peer address is STILL FILED. a `del` that swept by slug would have
        //    taken both, and every other assertion in this case would have stayed green
        expect(
          rack['@all.sudo.SUDO_AT_REACH@github://org=ahbode'],
        ).toBeDefined();
      });

      // ⚠️ `del` is a DESTRUCTIVE path with its own renderer (`asKeyrackDelReport`), so the
      //    human must be able to read WHICH key died at a glance. BOTH streams are snapped,
      //    the empty one too — a stdout-only snap is blind to content that appears on the
      //    unsnapped stream, and the empty stderr snap is what proves it stays empty
      //    (the shape `keyrack.del.acceptance.test.ts` sets for every destructive case)
      then('the destruction renders as snapped', () => {
        expect(asSnapshotSafe(deleted.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(deleted.stderr)).toMatchSnapshot('stderr');
      });

      // ⚠️ the peer reach must SURVIVE. a del that swept both addresses would pass every
      //    assertion above while it destroyed a credential the human never named
      // .note = the spawn sits in `useBeforeAll`, as every peer invocation in these three files
      //         does, rather than inside the `then` body. it reads the rack AFTER `deleted`
      //         (declaration order fixes that), so the sequence is pinned by the scene rather
      //         than by which `then` jest happens to run first
      const unlockedPeer = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_AT_REACH',
            '--reach',
            'github://org=ahbode',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('the PEER reach is untouched and still unlocks', () => {
        expect(unlockedPeer.status).toEqual(0);
        expect(unlockedPeer.stdout).toContain('reach: github://org=ahbode');
      });
    });
  });
});
