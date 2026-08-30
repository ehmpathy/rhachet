import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = a MACHINE-WIDE (`--org @all`) key cut at a reach, driven through the real
 *         cli → socket → daemon wire
 * .why = `@all` + `--reach` was a legal pair that no fixture in this repo had ever
 *        exercised, and the whole class was WRITE-ONLY: `set` filed the key, `list` showed
 *        it, `get` found it and said `locked` — and `unlock` reported it absent, forever.
 *        the cause was one read: `getAllMachineWideSlugsForEnv` took `Object.keys(hosts)`
 *        — which are ADDRESSES — and compared them by EXACT EQUALITY against a reachless
 *        slug. an address-keyed entry can never match, so the expansion returned []
 *
 * .note = ⚠️ the unit clamp beside this one (`getAllMachineWideSlugsForEnv.test.ts [case4]`)
 *         proves the expander returns the right slugs. it CANNOT prove the credential is
 *         readable end to end, and a whole credential class left write-only is precisely
 *         the defect a unit test missed for a full release. this file is the clamp that
 *         could not have missed it
 * .note = fully hermetic. `os.direct` is a plaintext store on disk, so a machine-wide key
 *         can be held at two reaches with no vault, no network, and no credential
 * .note = the fixture holds NO reachless `@all.prep.BRAINS_AUTH` twin, deliberately. were
 *         one present, a reach-blind repair could fall back to it and every assertion here
 *         would still pass — the absence is what makes a wrong answer impossible to hide
 */
describe('keyrack reach on a machine-wide @all key', () => {
  // kill any stale daemon so the store below is the only one in play
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] an @all key cut at two reaches, and no reachless twin', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
    );

    /**
     * .what = acceptance 1 at the wire — the headline defect
     * .why = this exact invocation returned `✋ blocked: key not found in manifest` before
     *        the repair, even though `list` proved the record was filed
     */
    when('[t0] the key is unlocked at a reach it was cut for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@ahction.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — the machine-wide reach key unlocks', () => {
        expect(result.status).toEqual(0);
      });

      // .note = the SLUG, never the address. a repair that leaked the address as the slug
      //         would still exit 0 and still print a tree — it would simply print the wrong
      //         identifier, and file the grant under it (the quiet half, [t3])
      then('the tree names the bare slug and echoes the reach', () => {
        expect(result.stdout).toContain('@all.prep.BRAINS_AUTH');
        expect(result.stdout).toContain('casey@ahction.com');
      });

      then('the reply is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = acceptance 4 — the round trip that proves the credential is READABLE
     * .why = the wish's own words: "a unit test alone would not have caught that a whole
     *        credential class is write-only". `--value` is what makes this a claim about
     *        the SECRET rather than about a render
     */
    when('[t1] the unlocked reach is read back', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            // .note = `--org @all` is REQUIRED on `get`, and is not an artifact of this fixture.
            //         `get` builds its slug from the repo manifest's org unless `@all` is named
            //         (`getOneKeyrackGrantByKey`), so from a repo whose manifest says `testorg`
            //         a bare ask resolves `testorg.prep.BRAINS_AUTH` and misses. `unlock` needs
            //         no such flag — it expands machine-wide slugs itself. the extant
            //         machine-wide journey (`keyrack.osSecure.orgScope`) names the flag the same
            //         way, so this follows the established contract rather than works around it
            '--org',
            '@all',
            '--reach',
            'casey@ahction.com',
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

      // ⚠️ THE clamp. the two secrets differ by one word, so a reach dropped anywhere on
      //    the path swaps them in silence. both directions are asserted: the right one
      //    arrived AND the other account's did not
      then('the secret is the ahction reach, never the ahbode one', () => {
        expect(result.stdout).toContain('sk-ant-machine-wide-at-ahction-fff666');
        expect(result.stdout).not.toContain('sk-ant-machine-wide-at-ahbode-ggg777');
      });
    });

    /**
     * .what = acceptance 3 — the security-grade claim, and the one that matters most
     * .why = the obvious wrong repair (fall back to the reachless slug) would satisfy every
     *        other case in this file and break only this one. without this case, the
     *        cheapest wrong fix passes
     * .note = `casey@nowhere.com` was never cut. a reach is NEVER derived — a key must be
     *         cut at the reach you ask for (`unlockKeyrackKeys` e6)
     */
    when('[t2] an uncut reach is asked for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@nowhere.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it does not exit 0 — an uncut reach is never granted', () => {
        expect(result.status).not.toEqual(0);
      });

      // .note = the exit code alone would not settle it. a refusal that still leaked a
      //         secret to stdout would be a caller's `$(...)` capture away from the exact
      //         failure the refusal exists to prevent
      then('neither cut reach\u2019s secret is handed back', () => {
        expect(result.stdout).not.toContain('sk-ant-machine-wide-at-ahction-fff666');
        expect(result.stdout).not.toContain('sk-ant-machine-wide-at-ahbode-ggg777');
      });

      then('the refusal names the reach that was asked for', () => {
        expect(result.stderr).toContain('casey@nowhere.com');
      });

      // ⚠️ the LABEL is asserted, never left to the snapshot alone. `@all` MEANS machine-wide —
      //    the opposite of repo-scoped — so a `repo:` leaf here contradicts its own value and
      //    points a human who hunts a reach miss at a repo with no part in it
      //    (`rule.forbid.ambiguous-labels`). this journey is the first place a refusal is
      //    captured for an `@all` key, so a bare snapshot would have FOSSILIZED the mislabel and
      //    a later `--resnap` would re-bless it in silence
      then('a machine-wide key is never labelled `repo:`', () => {
        expect(result.stderr).toContain('machine: @all.prep.BRAINS_AUTH');
        expect(result.stderr).not.toContain('repo: @all.');
      });

      // ⛔ THE CROSS-GRAIN CLAMP, and it is the one a human actually pastes. `keyrack set --org`
      //    defaults to `@this`, which resolves to the REPO manifest's org — and this fixture's
      //    manifest names `testorg`. so a hint with no `--org @all` would cut a TREE-grain
      //    `testorg.prep.BRAINS_AUTH@casey@nowhere.com` twin while the GROVE-grain key the human
      //    asked for stays uncut: the unlock fails again, and now a duplicate exists with no
      //    signal (`rule.require.org-scope-grain-hardcut`)
      // .note = found by TWO reviewers independently. the identical hazard was fixed earlier in
      //         this same route for the peer render (`asKeyrackOmittedKeyTip`), and the fix was
      //         never carried to this twin — so the clamp belongs here, not only there
      then('the refusal hint names the machine-wide grain explicitly', () => {
        expect(result.stderr).toContain(
          'rhx keyrack set --key BRAINS_AUTH --env prep --org @all --reach casey@nowhere.com',
        );
      });

      then('the refusal is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });

      // ⛔ THE SIBLING STREAM, and it is the half that was blind. a refusal that ALSO wrote to
      //    stdout — a stray warning, a debug line, a leaked secret — would leave this whole
      //    journey green, because the stream it wrote to was never snapped. that is the exact
      //    hazard `keyrack.del.acceptance.test.ts` names in its own comment:
      //    *"a stdout-only snap is blind to content that APPEARS on the unsnapped stream"* —
      //    and it cuts the same way for a stderr-only snap
      // .note = the empty snapshot IS the assertion. the `not.toContain` pair above proves two
      //         SPECIFIC secrets are absent; this proves stdout is EMPTY of every byte, which
      //         is what a caller's `$(rhx keyrack unlock …)` capture actually depends on
      then('the refusal leaves stdout empty — the sibling stream, snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = acceptance 5 — the QUIET half (added by wisher decision, 2026-08-13)
     * .why = a bulk `unlock --env prep` (no `--key`) exits 0 and looks healthy. before the
     *        repair it fed an ADDRESS forward as the slug, so the grant was filed at
     *        `asKeyrackKeySlugAtReach({ slug: <address>, reach })` — the reach appended a
     *        SECOND time — and no `get` would ever probe that doubled address. the
     *        credential was decrypted, cached, and unreachable, while every visible signal
     *        said success. the wisher's words: "a doubled-address half left unclamped would
     *        let the wish close while the credential stays unreadable"
     *
     * ⚠️ .note = ⭐ THE WISHER RATIFIED OPTION (B), so the outcome clamped below is a GRANT AT
     *            EVERY REACH — never a refusal. an earlier draft of this route argued the honest
     *            answer was to REFUSE, on the grounds that a bulk ask names no reach and so asks
     *            for the REACHLESS key, which this fixture does not hold. the wisher chose
     *            otherwise, and the choice is better: a reachless ask ENUMERATES one target per
     *            reach the rack actually holds, and each is unlocked AT ITS OWN ADDRESS
     * ⚠️ .note = enumeration is NOT derivation, which is what keeps acceptance 3 intact. every
     *            reach unlocked here was READ OFF an entry the rack holds, so no credential is
     *            ever handed back for a reach the key was not cut at — [t4] below still proves
     *            the wrong-reach ask is refused. the two hold together
     * .note = the defect this clamps is unchanged by that choice: the bulk path filed its grant
     *         at a DOUBLED address, so no `get` could ever probe it
     * .note = a fresh temp repo, so this bulk path is what populates the daemon — a grant
     *         left over from [t0] would mask exactly the defect under test
     */
    when('[t3] the rack is unlocked in BULK (no --key, so no reach)', () => {
      const repoBulk = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
      );

      const unlockBulk = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repoBulk.path,
          env: envIsolated(repoBulk.path),
          logOnError: false,
        }),
      );

      // a read AT each reach the bulk unlock enumerated, plus one that names NO reach.
      // .why = acceptance 5 in its ratified form asks the first pair to SUCCEED; acceptance 3
      //        asks the third to be REFUSED. the two together are the whole safety claim:
      //        every reach the rack holds becomes readable, and none becomes derivable
      const getAtReach = (exid: string | null) =>
        useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'keyrack',
              'get',
              '--env',
              'prep',
              '--key',
              'BRAINS_AUTH',
              // .note = same as [t1] — `get` needs `--org @all` to name a machine-wide slug
              '--org',
              '@all',
              ...(exid ? ['--reach', exid] : []),
              '--value',
            ],
            cwd: repoBulk.path,
            env: envIsolated(repoBulk.path),
            logOnError: false,
          }),
        );

      const getAtAhction = getAtReach('casey@ahction.com');
      const getAtAhbode = getAtReach('casey@ahbode.com');
      const getAfterBulk = getAtReach(null);

      then('the repo-scoped key still unlocks', () => {
        expect(unlockBulk.stdout).toContain('testorg.prep.REPO_KEY');
      });

      // ⭐ THE acceptance-5 clamp, in the form the wisher ratified (2026-08-15, option B):
      //    a bulk unlock ENUMERATES every reach the rack holds, so the machine-wide key is
      //    GRANTED — never reported `absent` while the rack plainly holds it, twice over
      // ⚠️ both reaches are named, because "one of them" is the regression that matters: an
      //    enumeration that stopped at the first would file one grant and silently evict its
      //    peer — the exact eviction the reach identity axis exists to remove
      then('the machine-wide key is GRANTED at every reach it was cut at', () => {
        expect(unlockBulk.stdout).toContain('@all.prep.BRAINS_AUTH');
        expect(unlockBulk.stdout).toContain('casey@ahction.com');
        expect(unlockBulk.stdout).toContain('casey@ahbode.com');
      });

      // ⚠️ the key must NOT be reported absent — the pre-(B) signal. without this negative a
      //    render that emitted BOTH a grant and a stale `absent` row would satisfy the
      //    positive above while it told a human one key is held and unheld at once
      //
      // .note = scoped to THIS KEY'S OWN ROWS rather than a raw `not.toContain('absent')` over
      //         the whole tree. the unscoped form passes today only because this fixture happens
      //         to hold no other absent row — so a later fixture that legitimately rendered one
      //         for an unrelated key would fail it spuriously, while a regression that reported
      //         THIS key absent under some other label would slip straight past. the negative was
      //         doing a row-scoped job without being row-scoped
      // .note = ⚠️ ONE row reader, used by every negative below. each of them asks the same
      //         question — "does THIS key's own render carry X" — and each was written as a
      //         raw `not.toContain` over the whole tree, which asks a different and weaker
      //         question. the reader is defined once so the three cannot drift apart again
      const rowsForKey = () =>
        unlockBulk.stdout.split('\n').filter((line) => line.includes('BRAINS_AUTH'));

      then('it is never reported absent for a key held at reaches', () => {
        expect(rowsForKey().length).toBeGreaterThan(0);
        for (const row of rowsForKey()) expect(row).not.toContain('absent');
      });

      // ⚠️ THE acceptance-5 clamp, half one. an address in this tree is the visible tell of
      //    the doubled-address defect, one step before it reaches the daemon. before the
      //    repair the tree named BOTH addresses here, verbatim
      then('no address is ever named as a slug', () => {
        expect(rowsForKey().length).toBeGreaterThan(0);
        for (const row of rowsForKey()) {
          expect(row).not.toContain('@all.prep.BRAINS_AUTH@casey@ahction.com');
          expect(row).not.toContain('@all.prep.BRAINS_AUTH@casey@ahbode.com');
        }
      });

      // ⛔ THE REPAIR, clamped at journey grain. the tip used to read
      //    `rhx keyrack set --key BRAINS_AUTH --env prep` — no `--reach` — for a key that is
      //    not absent at all: it is held at two reaches. a human who obeyed it literally cut a
      //    THIRD, REACHLESS twin under the same slug (the reachless-twin trap this file's own
      //    fixture header names), the unlock still failed, and no signal said a duplicate now
      //    existed. from a repo whose manifest names an org it was worse still — a bare `set`
      //    files that twin at TREE grain when the ask needed the GROVE-grain `@all.` key
      //    (`rule.require.org-scope-grain-hardcut`)
      //
      // .note = the tip NAMES THE FIX rather than merely disappears. to drop it would trade one
      //         `rule.require.errors-name-the-fix` breach for another — a bare `absent` with no
      //         way forward, on a key that is genuinely held and genuinely readable
      // ⚠️ NO tip at all is the right render now, and that is worth a pin rather than an
      //    assumption. under option (B) a reach-held key is GRANTED by the bulk pass, so it
      //    files no omission — and a tip beside a granted key would be pure noise. the
      //    harmful reachless-`set` form must stay gone either way
      // .note = `asKeyrackOmittedKeyTip` is NOT dead: it still names the fix for a reach-held
      //         key omitted as `remote` (a write-only vault) or `errored` (a live vault
      //         fault), which (B) does not and should not prune. its unit cases cover those
      // .note = ⚠️ ROW-SCOPED, and strictly STRONGER than the two named-text negatives it
      //         replaces. those forbade `tip: rhx keyrack set --key BRAINS_AUTH --env prep` and
      //         `tip: rhx keyrack unlock` across the WHOLE tree, which asks the wrong question
      //         in both directions: this file's own header note says the tip transformer is NOT
      //         dead — it still fires for a `remote` or `errored` reach-held key — so a later
      //         fixture that legitimately rendered one for an UNRELATED key would fail this
      //         spuriously, while a regression that tipped THIS key in any third shape would
      //         slip straight past. to ask "does any line that names this key carry a tip"
      //         catches EVERY tip shape, and only this key's own
      // .note = the line scope is sound because every tip carries `--key <name>`, so a tip for
      //         this key cannot render without it (`asKeyrackOmittedKeyTip`)
      then('it emits no tip at all, in any shape', () => {
        expect(rowsForKey().length).toBeGreaterThan(0);
        for (const row of rowsForKey()) expect(row).not.toContain('tip:');
      });

      then('the bulk reply is snapped', () => {
        expect(asSnapshotSafe(unlockBulk.stdout)).toMatchSnapshot('stdout');
      });

      // ⭐⭐ THE ratified acceptance 5, word for word: `set --org @all --reach` → BULK
      //     `unlock --env E` (no --key, no --reach) → `get --key K --reach R --value`, and
      //     THE VALUE MUST COME BACK. this is the assertion the whole (B) ruling turns on
      then('acceptance 5 — a read at reach 1 hands back reach 1 secret', () => {
        expect(getAtAhction.status).toEqual(0);
        expect(getAtAhction.stdout).toContain(
          'sk-ant-machine-wide-at-ahction-fff666',
        );
      });

      // ⚠️ the SECOND reach, read independently. this is what proves the enumeration filed
      //    each grant at its OWN address rather than let one overwrite its peer — and it is
      //    the assertion that would catch a regression to a single-reach enumeration
      then('acceptance 5 — a read at reach 2 hands back reach 2 secret', () => {
        expect(getAtAhbode.status).toEqual(0);
        expect(getAtAhbode.stdout).toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
      });

      // ⚠️ each reach hands back ITS OWN secret and never its peer's. the pair above would
      //    both pass if one address served both reads, so the crossover is what pins that
      //    the two grants stayed distinct all the way to the wire
      then('no reach is ever answered by its peer secret', () => {
        expect(getAtAhction.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
        expect(getAtAhbode.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahction-fff666',
        );
      });

      // ⚠️ ACCEPTANCE 3, KEPT WHOLE UNDER (B) — the assertion that makes the enumeration safe.
      //    a bulk unlock now grants both reaches, so a REACHLESS read is the one ask with no
      //    credential cut for it. it must still be REFUSED: to answer it from either grant
      //    would DERIVE a reach, which is the wrong-account leak the wish forbids outright
      // ⚠️ the refusal is asserted POSITIVELY first — the `not.toContain` pair is vacuous on
      //    its own (a crashed daemon or an empty stdout satisfies both), so the case would go
      //    green while it proved no part of the claim (`rule.forbid.failhide`)
      then('a reachless read is still REFUSED, never silently empty', () => {
        expect(getAfterBulk.status).not.toEqual(0);
      });

      then('a reachless read hands back neither account secret', () => {
        expect(getAfterBulk.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahction-fff666',
        );
        expect(getAfterBulk.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
      });
    });

    /**
     * .what = `get` WITHOUT `--org @all`, on the very key [t0] unlocked
     * .why = the asymmetry the `[t1]` note only DESCRIBES, now pinned. `unlock --key … --reach`
     *        needs no org flag; its mirror `get --key … --reach` silently resolves
     *        `testorg.prep.…` and misses. every committed `get` in this file names
     *        `--org @all`, so a later edit that "simplifies" the invocation by a dropped flag
     *        would pass the whole suite while it shipped a silent miss to a human
     *
     * ⚠️ .note = this pins the EXTANT contract, never a wish for a new one. the miss is the
     *            documented behavior (`getOneKeyrackGrantByKey` builds the slug from the repo
     *            manifest's org), and the extant machine-wide journey names the flag the same
     *            way (`keyrack.osSecure.orgScope.acceptance.test.ts:105-106`). what is clamped
     *            here is that the miss stays SILENT-FREE of the other account's secret — the
     *            security property — never that the miss is loud, which the product does not
     *            promise. the ergonomics of the asymmetry are flagged for the council
     */
    when('[t4] the same read, but `--org @all` is forgotten', () => {
      const getBareOrg = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@ahction.com',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it does not hand back the machine-wide secret', () => {
        expect(getBareOrg.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahction-fff666',
        );
        expect(getBareOrg.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
      });

      then('the miss is reported, never silently empty', () => {
        expect(getBareOrg.status).not.toEqual(0);
      });
    });

    /**
     * .what = the ROBOT contract — the same bulk unlock as [t3], asked with `--json`
     * .why = `--json` is a published contract of its own, and it is the one the GROVE reads
     *        (`invokeKeyrack.ts:1654-1656` says so in terms: "the grove, which is exactly who
     *        chains on the code, is exactly who passes --json"). [t3] proves the HUMAN tree
     *        names each reach; a robot never sees that tree. so the reach's presence in the
     *        payload was an unverified claim — an automated consumer could not tell two
     *        accounts apart, which is [t3]'s defect in machine-readable form
     *
     * ⚠️ .note = this gap was found at the r7 self-review, not at execution. the vibes render
     *            gained a `reach:` leaf and its json mirror gained a `reach` FIELD, but only
     *            the former was clamped. 18 extant files snap `unlock --json`; not one of them
     *            holds a reach-cut key, so the field had no contract-grain coverage at all
     *
     * .note = the payload is PROJECTED before it is snapped, never snapped raw, and the reason
     *         is not neatness. a raw grant carries `expiresAt` (a live stamp) and `key.secret`
     *         (the credential itself). the projection keeps the fields under test and lets no
     *         secret into a committed artifact
     * .note = a fresh repo, as [t3] uses, so this bulk path populates its own daemon — a grant
     *         left over from a peer case would mask the very enumeration under test
     */
    when('[t5] the same bulk unlock, asked in robot mode (--json)', () => {
      const repoRobot = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
      );

      const unlockJson = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep', '--json'],
          cwd: repoRobot.path,
          env: envIsolated(repoRobot.path),
          logOnError: false,
        }),
      );

      const payload = useBeforeAll(async () => {
        const parsed = JSON.parse(unlockJson.stdout) as {
          unlocked: {
            slug: string;
            env: string;
            org: string;
            reach?: { exid: string };
          }[];
          omitted: unknown[];
        };
        return parsed;
      });

      then('it exits 0 and emits parseable json', () => {
        expect(unlockJson.status).toEqual(0);
        expect(Array.isArray(payload.unlocked)).toEqual(true);
      });

      // ⭐ THE robot-contract clamp. the machine-wide key is granted ONCE PER REACH, and each
      //    grant names its own — so an automated consumer can tell the two accounts apart
      then('each machine-wide grant carries its own reach exid', () => {
        const reachesGranted = payload.unlocked
          .filter((grant) => grant.slug === '@all.prep.BRAINS_AUTH')
          .map((grant) => grant.reach?.exid);
        expect(reachesGranted.sort()).toEqual([
          'casey@ahbode.com',
          'casey@ahction.com',
        ]);
      });

      // ⚠️ acceptance 2 on the ROBOT surface. `reach` is OPTIONAL, never nullable, precisely
      //    so `JSON.stringify` DROPS it for a reachless key rather than emit `"reach": null` —
      //    a null would have moved every extant unlock payload (e.g.
      //    `keyrack.extends.acceptance.test.ts.snap:200-217`, which holds no `reach` key and
      //    did not move). `in` is the probe, never `=== undefined`: only `in` can tell an
      //    ABSENT key from one present-and-undefined, which is the whole property here
      then('a reachless grant carries NO reach key at all', () => {
        const grantRepoScoped = payload.unlocked.find(
          (grant) => grant.slug === 'testorg.prep.REPO_KEY',
        );
        expect(grantRepoScoped).toBeDefined();
        expect('reach' in grantRepoScoped!).toEqual(false);
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
     * .what = the NEGATIVE path in ROBOT mode — `--json` at a reach that was never cut
     * .why = ⛔ found by peer review: `[t2]` proves the refusal a HUMAN reads and `[t5]` proves
     *        the payload a ROBOT reads on SUCCESS — but the robot's view of a REFUSAL was
     *        never captured. that is a distinct caller-faced variant of the same command, and
     *        an automated consumer meets it on every misconfigured reach
     *
     * .note = ⚠️ the outcome here is itself the finding, and it is pinned rather than assumed:
     *         a blocked unlock emits the human tree on stderr and NO json at all. so a robot
     *         must branch on the EXIT CODE, never on a parse of stdout — and `[t2]` above
     *         proves that code is non-zero. the two snapshots below are what make that
     *         contract visible instead of implicit (`rule.require.errors-name-the-fix`)
     */
    when('[t6] an uncut reach is asked for in robot mode (--json)', () => {
      const repoRobotRefused = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@nowhere.com',
            '--json',
          ],
          cwd: repoRobotRefused.path,
          env: envIsolated(repoRobotRefused.path),
          logOnError: false,
        }),
      );

      // ⛔ the load-carrying clamp: a robot must be able to TELL it was refused. absent a
      //    non-zero code, a consumer that parses stdout would read an empty string as an
      //    empty rack and proceed credential-less (`rule.forbid.failhide`)
      then('a refused robot ask does not exit 0', () => {
        expect(result.status).not.toEqual(0);
      });

      // ⚠️ and it emits NO json — asserted POSITIVELY, so the claim is pinned rather than
      //    inferred from an absent match. a future change that DID emit an error payload
      //    would go red here, which is the signal a consumer would need
      then('a refused robot ask emits no json payload at all', () => {
        expect(result.stdout.trim()).toEqual('');
      });

      then('neither cut reach\u2019s secret reaches either stream', () => {
        const rendered = `${result.stdout}${result.stderr}`;
        expect(rendered).not.toContain('sk-ant-machine-wide-at-ahction-fff666');
        expect(rendered).not.toContain('sk-ant-machine-wide-at-ahbode-ggg777');
      });

      // both streams, the empty one too — the same discipline `[t2]` and the `del` case use
      then('the refused robot stdout is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('the refused robot stderr is snapped', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  /**
   * .what = the BOOTSTRAP-TO-CLONE path — a machine-wide key cut at a reach, unlocked from a
   *         cwd that holds NO repo manifest at all
   * .why = this is the reason `getAllMachineWideSlugsForEnv` exists. its own `.why` says an
   *        `@all` key "must be unlockable with NO repo manifest at all — the bootstrap-to-clone
   *        credential path… so it can be fetched from anywhere, even outside any repo, before
   *        any repo is cloned". that path enters through a DIFFERENT branch of the caller
   *        (`unlockKeyrackKeys.ts:146`, the no-manifest branch) than [case1] does (`:182`)
   *
   * .note = ⚠️ [case1] cannot cover this. every case above runs inside a repo whose
   *         `.agent/keyrack.yml` exists, so all of them enter at `:182`. the branch that the
   *         function was BUILT for had no reach coverage at all — the vision asserted this
   *         usecase (u4) held "by the same repair" and never instrumented it
   * .note = the manifest is deleted the same way the extant machine-wide peer does it
   *         (`keyrack.osSecure.orgScope.acceptance.test.ts [case1]`)
   *
   * ⚠️ .note = the BOUND of this case, stated so the quote above is not read as more than it
   *            is. this deletes `.agent/keyrack.yml` from a worktree that is otherwise intact,
   *            and still runs with `cwd: repo.path` — so it clamps the no-MANIFEST branch, and
   *            ONLY that branch. a cwd with no `.git` at all — the literal "outside any repo"
   *            of the quoted `.why` — is NOT exercised here, so
   *            `rule.require.cli-tolerates-non-repo-cwd` stays unclamped for this reach path.
   *            named rather than implied, because the earlier wording read as though the
   *            repo-less boot were covered
   */
  given('[case2] the same key, but from a cwd with NO repo manifest', () => {
    const repo = useBeforeAll(async () => {
      const repoFound = await genTestTempRepo({
        fixture: 'with-keyrack-reach-machine-wide',
      });
      // DELETE the repo manifest — a machine-wide @all key must unlock with no .agent/keyrack.yml
      rmSync(join(repoFound.path, '.agent', 'keyrack.yml'), { force: true });
      return repoFound;
    });

    when('[t0] the key is unlocked at a reach it was cut for', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@ahction.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — no repo manifest is needed for a machine-wide key', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree names the bare slug and echoes the reach', () => {
        expect(result.stdout).toContain('@all.prep.BRAINS_AUTH');
        expect(result.stdout).toContain('casey@ahction.com');
      });

      // ⚠️ this branch earns a snapshot of its OWN, for the same reason the `.what` above
      //    gives for the case at all: the no-manifest boot enters at
      //    `unlockKeyrackKeys.ts:146`, a DIFFERENT branch than [case1]'s `:182`. two
      //    `toContain` probes cannot show whether the tree a bare-clone operator meets has
      //    the same shape as the in-repo one — and this is the render a human sees at the
      //    very first credential fetch on a fresh box, so drift here is the most expensive
      //    kind (`rule.forbid.friction-hazards`: a reviewer must be able to SEE the ux)
      then('the bootstrap reply is snapped', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });
    });

    // ⚠️ the same READ clamp as [case1][t1], on the branch that serves a bare clone. a repair
    //    that fixed only the with-manifest branch would pass every case above and fail here
    when('[t1] the unlocked reach is read back', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--org',
            '@all',
            '--reach',
            'casey@ahction.com',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('the secret is the ahction reach, never the ahbode one', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('sk-ant-machine-wide-at-ahction-fff666');
        expect(result.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
      });
    });

    /**
     * .what = the bootstrap branch, asked in ROBOT mode (`--json`)
     * .why = ⛔ found by peer review: `[case1]` proves the robot contract on BOTH the success
     *        (`[t5]`) and refusal (`[t6]`) paths, but this case — the no-manifest branch, which
     *        enters at `unlockKeyrackKeys.ts:146` rather than `:182` — had no `--json` coverage
     *        at all. and this is precisely usecase **u4**'s caller: an automated boot on a
     *        fresh box, which is the LEAST likely caller to be a human at a terminal
     *
     * .note = the branch difference is the whole point. "the same repair covers it" is the exact
     *         reasoning that left `u4` uncovered until `[case2]` was added at all — so the robot
     *         contract is instrumented on this branch rather than inferred from `[case1]`'s
     */
    when('[t2] the bootstrap unlock is asked in robot mode (--json)', () => {
      const repoRobot = useBeforeAll(async () => {
        const repoFound = await genTestTempRepo({
          fixture: 'with-keyrack-reach-machine-wide',
        });
        rmSync(join(repoFound.path, '.agent', 'keyrack.yml'), { force: true });
        return repoFound;
      });

      const unlockJson = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@ahction.com',
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

      then('it exits 0 and emits parseable json with no repo manifest', () => {
        expect(unlockJson.status).toEqual(0);
        expect(Array.isArray(payload.unlocked)).toEqual(true);
      });

      // ⚠️ the SLUG, never the address — the quiet half of this defect class, on the branch an
      //    automated boot actually walks. a robot that filed by a leaked address would file the
      //    grant under a doubled one and never find it again
      then('the payload names the bare slug and carries its reach', () => {
        const grant = payload.unlocked.find(
          (one) => one.slug === '@all.prep.BRAINS_AUTH',
        );
        expect(grant).toBeDefined();
        expect(grant?.reach?.exid).toEqual('casey@ahction.com');
        expect(grant?.org).toEqual('@all');
      });

      then('the bootstrap projected payload is snapped', () => {
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
     * .what = the NEGATIVE half of the bootstrap robot contract — an uncut reach, `--json`,
     *         from a cwd with no repo manifest
     * .why = `[case1]` pins both robot halves (`[t5]` success, `[t6]` refusal); the bootstrap
     *        journey pinned only its success. u4 is the path an automated boot walks with no
     *        repo cloned, so its REFUSAL is the shape a consumer meets on a bad day, and it was
     *        the one variant left unproven (`rule.require.contract-snapshot-exhaustiveness`)
     *
     * .note = the contract it pins is the same one `[t6]` pins with a manifest present: a
     *         blocked `unlock --json` emits NO json at all. absence of a manifest must not
     *         change that — a consumer that read empty stdout as an empty rack would boot
     *         credential-less either way
     */
    when(
      '[t3] an uncut reach is asked in robot mode, still with no manifest',
      () => {
        const repoRobot = useBeforeAll(async () => {
          const repoFound = await genTestTempRepo({
            fixture: 'with-keyrack-reach-machine-wide',
          });
          rmSync(join(repoFound.path, '.agent', 'keyrack.yml'), {
            force: true,
          });
          return repoFound;
        });

        const refused = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'keyrack',
              'unlock',
              '--env',
              'prep',
              '--key',
              'BRAINS_AUTH',
              '--reach',
              'casey@nowhere.com',
              '--json',
            ],
            cwd: repoRobot.path,
            env: envIsolated(repoRobot.path),
            logOnError: false,
          }),
        );

        then('it refuses with a non-zero exit', () => {
          expect(refused.status).not.toEqual(0);
        });

        // ⛔ THE clamp. asserted POSITIVELY, so the day an error payload IS emitted this line
        //    goes red and names the work, rather than quietly absorb a new shape
        then('it emits NO json at all — a robot must branch on the exit code', () => {
          expect(refused.stdout.trim()).toEqual('');
        });

        then('no secret reaches either stream', () => {
          const rendered = `${refused.stdout}${refused.stderr}`;
          expect(rendered).not.toContain('sk-ant');
        });

        then('the refused robot streams are snapped', () => {
          expect(asSnapshotSafe(refused.stdout)).toMatchSnapshot('stdout');
          expect(asSnapshotSafe(refused.stderr)).toMatchSnapshot('stderr');
        });
      },
    );
  });

  /**
   * .what = `get --unlock` in ONE command, against a COLD daemon
   * .why = the wish names this the trap that made the defect hard to isolate: `get --reach
   *        --unlock` fails too, "because `--unlock` delegates into the same path", so a first
   *        read of the evidence indicts `get` as well. the vision's before/after table carries
   *        it as its own row — and no case above exercised it
   *
   * .note = ⚠️ it is NOT covered by transitivity from [case1]. `--unlock` enters through
   *         `getKeyrackKeyGrants.ts:202-210`, which first resolves the slug (org included),
   *         then DECOMPOSES it back into `env` + `key` via `asKeyrackKeyEnv`/`asKeyrackKeyName`
   *         before it delegates, then re-gets each key BY ADDRESS. that is three steps
   *         [case1] never walks — and "the same repair covers it" is the exact logic that left
   *         `u4` uncovered until [case2] was added
   * .note = a FRESH temp repo is what makes this a real clamp. `envIsolated` points `HOME` at
   *         the repo, and the daemon lives under `$HOME`, so each `given` holds its own daemon.
   *         were this folded into a case above, the grant would already be warm and the
   *         assertion could never fail
   */
  given('[case3] the same key, read with `get --unlock` on a cold daemon', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
    );

    when('[t0] get is asked to unlock the reach itself', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--org',
            '@all',
            '--reach',
            'casey@ahction.com',
            '--unlock',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — one command escalates the lock and reads through', () => {
        expect(result.status).toEqual(0);
      });

      // .note = the value proves the delegation carried the REACH intact. a path that dropped
      //         it would unlock the reachless key — which this fixture deliberately does not
      //         hold — and a path that mixed reaches would hand back the ahbode secret
      //
      // ⚠️ .note = and this case is deliberately NOT snapped, unlike [case1][t0] and
      //            [case2][t0] which both gained one. `--value` prints the BARE secret and no
      //            tree, so a snapshot here would capture a credential-shaped line and show a
      //            reviewer no render at all — no ux to see, a secret to store. the whole repo
      //            holds to this: not one peer snapshot captures a `--value` output. the two
      //            assertions below already pin both directions, which is the real clamp
      then('the value is the ahction reach, never the ahbode one', () => {
        expect(result.stdout).toContain('sk-ant-machine-wide-at-ahction-fff666');
        expect(result.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
      });
    });
  });

  /**
   * .what = acceptance 4 in FULL — `set --org @all --reach` → `unlock --reach` → `get --reach`,
   *         every leg driven live at the wire, with no pre-built fixture entry
   * .why = every case above starts from a manifest the fixture already holds, so the WRITE half
   *        of the pair was never exercised. the vision delegated exactly this: assumption `a7`
   *        ("set --org @all --reach genuinely succeeds today") was INHERITED from the wish's
   *        probe and never re-run, and `q10` named this journey as the instrument that settles
   *        it — "were it to fail, the wish is misdiagnosed and the defect sits at `set`"
   *
   * .note = the key name is deliberately one the fixture does NOT hold, so the entry under test
   *         can only come from the live `set` on the line above it
   * .note = still hermetic. `os.direct` is a plaintext store, so a live write needs no vault,
   *         no network, and no credential
   */
  given('[case4] the full round trip, every leg live', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
    );

    when('[t0] a machine-wide key is cut at a reach, live', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'LIVE_CUT_KEY',
            '--vault',
            'os.direct',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            // .note = NO `--owner`. the fixture files its vault under `owner=default`, so a named
            //         owner would address an empty rack — `✋ host manifest not found`. every
            //         other case here defaults the same way
            '--env',
            'prep',
            '--org',
            '@all',
            '--reach',
            'casey@ahction.com',
            '--json',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          stdin: 'sk-ant-live-cut-at-ahction-iii999\n',
          logOnError: false,
        }),
      );

      then('the set is accepted', () => {
        expect(result.status).toEqual(0);
      });

      // ⚠️ `--json` must yield JSON, and that is asserted as its own case BEFORE any parse of
      //    it. a bare `JSON.parse` on a command that exits 0 while it emits a notice, a log
      //    line, or a render quirk dies with `SyntaxError: Unexpected token` — a failure that
      //    names neither the command nor the contract it broke (`rule.forbid.failhide`: fail
      //    with the cause, never with a symptom of it)
      // .note = it does NOT lean on `then` order for its safety. the status check above runs
      //         first today, but order is not a contract — and this case is the WRITE half of
      //         acceptance 4, the leg the wish's whole diagnosis rests on
      then('the `--json` reply is JSON, not prose', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      // ⚠️ the write-side invariant the whole defect turns on: `slug` and `reach` are filed as
      //    SEPARATE fields, and the slug stays BARE. were `set` to bake the reach into the slug,
      //    no repair downstream could make the read path match it
      // .note = the parse is TYPED, exactly as `[case1][t5]` types the unlock reply. an
      //         untyped read makes `host` an `any`, so a RENAME of either probed field would
      //         silently yield `undefined` and this case would report a value mismatch
      //         rather than the rename that caused it
      //         (`rule.require.sweep-untyped-reads-on-field-rename`)
      then('the entry files a BARE slug with the reach beside it', () => {
        const host = JSON.parse(result.stdout) as {
          slug: string;
          reach: { exid: string };
        };
        expect(host.slug).toEqual('@all.prep.LIVE_CUT_KEY');
        expect(host.reach.exid).toEqual('casey@ahction.com');
      });
    });

    when('[t1] that live-cut key is unlocked at its reach', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'LIVE_CUT_KEY',
            '--reach',
            'casey@ahction.com',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — the leg that was broken before the repair', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t2] the live-cut value is read back', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'prep',
            '--key',
            'LIVE_CUT_KEY',
            '--org',
            '@all',
            '--reach',
            'casey@ahction.com',
            '--value',
          ],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // .note = THE acceptance-4 clamp: a value written live comes back live. the whole class
      //         was write-only before the repair, so this round trip could not close at all
      then('the value written at t0 comes back', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('sk-ant-live-cut-at-ahction-iii999');
      });
    });
  });

  /**
   * .what = usecase `u4` read LITERALLY — a cwd with no `.git` at all, not merely a repo whose
   *         manifest was deleted
   * .why = `[case2]` clamps the no-MANIFEST branch, but it still runs inside a git worktree, so
   *        the vision's own words for `u4` — "fetched from anywhere, even **outside any repo**,
   *        before any repo is cloned" — stayed uninstrumented, and I had recorded that gap
   *        rather than closed it. this closes it: the bootstrap-to-clone story is a human on a
   *        FRESH BOX who holds credentials and no code yet, and that is the state built here
   *
   * .note = the rack still lives under `$HOME` — `envIsolated` points HOME at the fixture repo,
   *         which is exactly the real shape: the keyrack is a property of the MACHINE, and the
   *         cwd is merely where the human happens to stand. only the cwd moves
   * .note = `genTempDir` per `rule.forbid.adhoc-gentempdir-reimpl`, never a raw `os.tmpdir`
   */
  given('[case5] the same key, from a cwd that is not a repo AT ALL', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-machine-wide' }),
    );
    // .note = called DIRECTLY, never wrapped in `useBeforeAll` — the peers do the same
    //         (`rhx.acceptance.test.ts:306`). wrapped, it yields a lazy proxy rather than a
    //         path string, and `spawnSync` refuses it with "options.cwd must be of type string"
    const cwdBare = genTempDir({ slug: 'keyrack-reach-machine-wide-no-repo' });

    when('[t0] the key is unlocked with no repo underfoot', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--reach',
            'casey@ahction.com',
          ],
          // ⚠️ THE difference from [case2]: the cwd holds no `.git`, so the cli cannot walk up
          //    to a repo root at all — `rule.require.cli-tolerates-non-repo-cwd` at full stretch
          cwd: cwdBare,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('it exits 0 — a machine-wide key needs no repo underfoot', () => {
        expect(result.status).toEqual(0);
      });

      then('the tree names the bare slug and echoes the reach', () => {
        expect(result.stdout).toContain('@all.prep.BRAINS_AUTH');
        expect(result.stdout).toContain('casey@ahction.com');
      });
    });

    when('[t1] the unlocked reach is read back, still with no repo', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--env',
            'prep',
            '--key',
            'BRAINS_AUTH',
            '--org',
            '@all',
            '--reach',
            'casey@ahction.com',
            '--value',
          ],
          cwd: cwdBare,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      then('the ahction secret comes back, never the ahbode one', () => {
        expect(result.stdout).toContain('sk-ant-machine-wide-at-ahction-fff666');
        expect(result.stdout).not.toContain(
          'sk-ant-machine-wide-at-ahbode-ggg777',
        );
      });
    });
  });
});
