import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = the OMISSION half of a reach-held key, driven through the real cli → render wire:
 *         the `tip:` line a human actually copy-pastes when an unlock could not hand a
 *         reach-held credential back
 * .why = the tip transformer (`asKeyrackOmittedKeyTip`) is unit-clamped, and its unit clamp
 *        pins the STRING it returns. it cannot pin what a human READS, because the string is
 *        composed downstream — wrapped in ansi dim codes, prefixed with `tip: `, and hung
 *        under a status row by the tree renderer. a regression in that composition (a prefix
 *        that swallows the `#`, a wrap that splits the line, a row that drops the leaf) breaks
 *        the human's paste while every unit case stays green
 *
 * .note = ⚠️ this file exists because a peer review found the gap by search: NO acceptance
 *         snapshot in this repo held `also cut at`, and NO acceptance case exercised a `lost`
 *         omission on a reach-held key AT ALL. the two tip repairs that answer those cases
 *         were proven only at transformer grain — which is the same "a unit test alone would
 *         not have caught it" shape the wish itself complains about
 * .note = fully hermetic. `os.direct` is a plaintext store on disk, so a key can be HELD in
 *         the host manifest while the vault genuinely does not hold its value — which is
 *         precisely the `lost` state, produced with no vault, no network, no credential
 * .note = the fixture is its OWN, never an extension of `with-keyrack-reach-machine-wide`.
 *         that peer's rack unlocks cleanly by design, and to add omission entries to it would
 *         rewrite every snapshot it owns — the omission story deserves a rack that is about it
 */
describe('keyrack reach omissions — the tip a human pastes', () => {
  // kill any stale daemon so the rack below is the only one in play
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] a rack whose reach-held keys cannot be handed back', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-omissions' }),
    );

    /**
     * .what = a bulk `unlock --env prep` over a rack that holds:
     *         - `LOST_AT_REACH` at TWO reaches on `os.direct`, with NO value in the store
     *         - `ENVVAR_AT_REACH` at ONE reach on `os.envvar`, a vault that cannot ADDRESS one
     *         - `REPO_KEY`, healthy, so the batch is not wholly broken
     * .why = one invocation renders all three tip shapes at once, so the composition under
     *        test is the real one rather than three isolated probes
     */
    when('[t0] the whole rack is unlocked in bulk', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      // the ansi-stripped transcript, read once. the assertions below are about the TEXT a
      // human reads, and the style bytes are exactly what would make a text probe lie
      const rendered = () => asSnapshotSafe(result.stdout);

      then('the healthy key still unlocks — the batch is not wholly broken', () => {
        expect(rendered()).toContain('testorg.prep.REPO_KEY');
      });

      // ⚠️ THE EXIT CODE, clamped at journey grain — and it is a SURPRISE worth a clamp.
      //    `lost` and `absent` are BENIGN omissions, so this batch exits 0 even though two
      //    credentials did not come back (`asKeyrackUnlockExitCode`: only `errored` drives a
      //    non-zero code). the grove chains `unlock && start-app`, so this choice decides
      //    whether an app starts credential-less — and it was proven only at unit grain
      // .note = found by peer review: this file drove the whole render and never once read
      //         `result.status`, so the exit half of the contract was unclamped here
      then('a benign omission batch still exits 0', () => {
        expect(result.status).toEqual(0);
      });

      // ⛔ GAP ONE, CLOSED. the peer-reach disclosure had no acceptance coverage anywhere in
      //    the repo — a search for `also cut at` across every snapshot returned zero hits. the
      //    rack holds this slug at TWO reaches and a command may name only ONE, so to name one
      //    in silence reads as "this key has one reach" — an unambiguous claim, and a false one
      //    (`rule.forbid.ambiguous-labels`)
      then('the peer reach the command could not name is disclosed', () => {
        expect(rendered()).toContain('also cut at:');
      });

      // ⛔ THE PASTE CLAMP, at journey grain. the unit clamp proves the TRANSFORMER returns a
      //    line whose command half stays runnable. it cannot prove the RENDERER kept it that
      //    way — and a tip is the one line a human copy-pastes, so prose that survives the
      //    paste as stray positional args makes the tool's own hint fail the moment it is
      //    used, the "actively harmful help" class `rule.forbid.friction-hazards` grades worst
      then('every rendered tip stays runnable when pasted', () => {
        const tipLines = rendered()
          .split('\n')
          .filter((line) => line.includes('tip:'));
        expect(tipLines.length).toBeGreaterThan(0);
        for (const line of tipLines) {
          const command = line.slice(line.indexOf('tip:') + 'tip:'.length);
          const beforeComment = command.split('#')[0]!.trim();
          // a runnable line, and the whole of it: `rhx keyrack …`, with no prose after it
          expect(beforeComment).toMatch(/^rhx keyrack [a-z]+( --[a-z-]+ \S+)+$/);
        }
      });

      // ⛔ GAP TWO, CLOSED. a `lost` omission on a reach-held key had NO acceptance coverage,
      //    so the `--reach` on the `set` fallback was proven only at transformer grain. on an
      //    ADDRESSED vault a bare `set` files a new REACHLESS entry under a slug already cut at
      //    reaches — it does not restore the lost credential, so the unlock still fails
      //    afterwards and a twin now exists
      then('a reach-held `lost` key is tipped to re-cut AT the reach', () => {
        expect(rendered()).toContain(
          'rhx keyrack set --key LOST_AT_REACH --env prep --org @all --reach casey@ahbode.com',
        );
      });

      // ⛔ THE DEFECT THIS FILE FOUND ON ITS FIRST RUN, and the reason a transformer clamp
      //    could not have found it. one slug files TWO rows here (one per reach), and the
      //    transformer is handed a slug — so absent the row's own reach it named the sorted
      //    first on BOTH, and the row that read `reach: casey@ahction.com` was tipped to
      //    re-cut `casey@ahbode.com`. every unit case stayed green: each was true of the
      //    string in isolation, and the contradiction lives BETWEEN a row's leaf and its tip,
      //    which only a rendered tree holds. a human who obeyed it re-cut the wrong account
      //    while the failed one stayed lost (`rule.forbid.friction-hazards`)
      then('each row is tipped at the reach ITS OWN leaf names', () => {
        const lines = rendered().split('\n');
        const reachOfRowAt = (exid: string) =>
          lines.findIndex((line) => line.includes(`reach: ${exid}`));

        // the tip sits two leaves under its row's `reach:` leaf (status, then tip)
        for (const exid of ['casey@ahction.com', 'casey@ahbode.com']) {
          const leafAt = reachOfRowAt(exid);
          expect(leafAt).toBeGreaterThan(-1);
          const tipOfRow = lines
            .slice(leafAt)
            .find((line) => line.includes('tip:'));
          expect(tipOfRow).toContain(`--reach ${exid}`);
        }
      });

      // ⚠️ and the named reach never discloses ITSELF. a line that read
      //    `--reach A  # also cut at: A` would tell a human to pick between one account and
      //    the same account — an unambiguous claim, and an absurd one
      then('a disclosed peer is never the reach the command already names', () => {
        for (const line of rendered().split('\n')) {
          if (!line.includes('also cut at:')) continue;
          const [command, disclosure] = line.split('#') as [string, string];
          const reachNamed = command.match(/--reach (\S+)/)?.[1];
          expect(reachNamed).toBeDefined();
          expect(disclosure).not.toContain(reachNamed!);
        }
      });

      // ⚠️ the GROVE-grain flag rides along, and it is not decoration. without `--org @all` a
      //    `set` infers grain from the repo manifest — and this fixture's manifest names
      //    `testorg` — so the tip would file a TREE-grain `testorg.prep.LOST_AT_REACH` when the
      //    failed unlock needed the GROVE-grain `@all.` key
      //    (`rule.require.org-scope-grain-hardcut`). the fixture is orged deliberately so this
      //    assertion can distinguish the two
      then('the machine-wide grain is never inferred from the repo', () => {
        expect(rendered()).not.toContain(
          'rhx keyrack set --key LOST_AT_REACH --env prep --reach',
        );
      });

      // ⚠️ THE VAULT-ADDRESSABILITY CLAMP, at journey grain. an `os.envvar` entry stores ONE
      //    value per bare name, so an `unlock --reach` against it is refused outright by
      //    `assertKeyrackReachAddressable`. to tip that reach would hand the human a command
      //    guaranteed to fail — a SECOND error, of a wholly different cause, on a credential
      //    the tip just called reachable
      then('a vault that cannot address a reach is never tipped one', () => {
        expect(rendered()).toContain(
          'rhx keyrack set --key ENVVAR_AT_REACH --env prep --org @all',
        );
        expect(rendered()).not.toContain(
          '--key ENVVAR_AT_REACH --env prep --org @all --reach',
        );
      });

      // ⚠️ THE PIN OF A KNOWN-IMPERFECT LABEL, recorded as an EXPLICIT contract rather than
      //    left as an implicit gap. an `os.envvar` key cut at a reach is reported `absent`,
      //    and that is a MISLABEL — the store demonstrably holds the credential; what it
      //    cannot do is address a reach. the honest word would be a fifth
      //    `KeyrackKeyOmission.reason`, and `reason` is a PUBLISHED contract (an exit-code
      //    input and a render discriminant), so a fifth word is a wisher's call and was never
      //    ratified. it is pinned here so the next reader meets the imperfection as a visible,
      //    dated decision instead of a surprise in production — and so the day it IS ratified,
      //    this assertion is the one that goes red and names the work
      // .note = scoped to the BRANCH rather than to one line. the render is a tree: the slug
      //         heads a branch and its `status:` hangs beneath, so a line-scoped probe for
      //         "a line that holds both" can never match. the branch is read from its slug
      //         head to the next sibling head, which is the unit the human actually reads
      then('the `os.envvar` mislabel is pinned, never silently tolerated', () => {
        const lines = rendered().split('\n');
        const headAt = lines.findIndex((line) =>
          line.includes('@all.prep.ENVVAR_AT_REACH'),
        );
        expect(headAt).toBeGreaterThan(-1);

        // every line under the head, up to the next slug head. a head is the one line shape
        // that carries a dotted `.prep.` slug — a `tip:` leaf spells the env as `--env prep`
        const branch: string[] = [];
        for (const line of lines.slice(headAt + 1)) {
          if (line.includes('.prep.')) break;
          branch.push(line);
        }
        expect(branch.some((line) => line.includes('status: absent'))).toEqual(
          true,
        );
      });

      // ⚠️ the whole transcript, so a reviewer can SEE the ux rather than infer it from text
      //    probes. this is the render that carries all three tip shapes at once — the
      //    disclosure, the reach-aware re-cut, and the reachless fallback — and it is the
      //    artifact that would show a composition regression at a glance
      //    (`rule.forbid.friction-hazards`)
      then('the whole render is snapped', () => {
        expect(rendered()).toMatchSnapshot('stdout');
      });
    });

    /**
     * .what = the SAME bulk unlock, asked in ROBOT mode (`--json`) — the `omitted` half
     * .why = every clamp above reads the human tree. the `omitted` array is a SEPARATE,
     *        published contract with zero reach coverage anywhere in the repo, and it is the
     *        surface the grove reads. a robot that cannot tell WHICH account failed is the
     *        same ambiguity `[t0]` proves the human is spared
     *
     * .note = ⛔ this closes the robot twin of THE DEFECT THIS FILE FOUND. `[t0]` caught a
     *         row tipped at the sorted-first reach rather than its own, because the
     *         transformer was handed a slug and one slug files TWO rows. the payload has the
     *         identical exposure — two `omitted` rows of one slug, distinguishable ONLY by
     *         their own `reach` field — and not one test read it
     * .note = ⚠️ PROJECTED, never raw. an unlock payload carries `key.secret` on its granted
     *         rows (`keyrack.extends.acceptance.test.ts.snap`), so a raw snapshot of this
     *         reply would commit a credential to the repo
     * .note = its own temp repo, so the payload never depends on which cases ran before it
     */
    when('[t1] the same bulk unlock, asked in robot mode (--json)', () => {
      const repoRobot = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-reach-omissions' }),
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
        return JSON.parse(unlockJson.stdout) as {
          unlocked: { slug: string }[];
          omitted: {
            slug: string;
            reason: string;
            reach?: { exid: string };
          }[];
        };
      });

      then('it exits 0 and emits parseable json', () => {
        expect(unlockJson.status).toEqual(0);
        expect(Array.isArray(payload.omitted)).toEqual(true);
      });

      // ⛔ THE ROBOT TWIN of the render defect. two rows of ONE slug, and each must carry
      //    its OWN reach — absent that a consumer sees two identical rows and cannot tell
      //    two accounts failed from one row rendered twice (`rule.forbid.ambiguous-labels`)
      then('two omitted rows of one slug carry their OWN distinct reaches', () => {
        const rowsLost = payload.omitted.filter(
          (row) => row.slug === '@all.prep.LOST_AT_REACH',
        );
        expect(rowsLost.length).toEqual(2);
        expect(rowsLost.map((row) => row.reach?.exid).sort()).toEqual([
          'casey@ahbode.com',
          'casey@ahction.com',
        ]);
      });

      // ⚠️ e16 on the OMISSION side. `reach` is OPTIONAL, never nullable —
      //    `JSON.stringify` DROPS an absent field but EMITS a null one, so a `null` here
      //    would move every extant payload. only `in` tells absent from present-and-undefined
      then('a reachless omission carries NO reach key at all', () => {
        const rowEnvvar = payload.omitted.find(
          (row) => row.slug === '@all.prep.ENVVAR_AT_REACH',
        );
        expect(rowEnvvar).toBeDefined();
        expect('reach' in rowEnvvar!).toEqual(false);
      });

      then('the four-way reason discriminant reaches the wire', () => {
        const reasons = payload.omitted.map((row) => row.reason);
        expect(reasons).toContain('lost');
        expect(reasons).toContain('absent');
      });

      then('the projected omitted payload is snapped', () => {
        expect(
          payload.omitted.map((row) => ({
            slug: row.slug,
            reason: row.reason,
            ...(row.reach ? { reach: row.reach } : {}),
          })),
        ).toMatchSnapshot('omitted.projected');
      });
    });

    /**
     * .what = a SINGLE-key unlock aimed at ONE reach of the lost key
     * .why = every case above is a bulk sweep. a human who reads a `lost` tip retries the one
     *        key at the one reach, and that targeted shape renders through a different branch
     *        — a keyed ask, not an enumeration — with no coverage of its own
     */
    when('[t2] one lost key is unlocked at one named reach', () => {
      const repoKeyed = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-reach-omissions' }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'LOST_AT_REACH',
            '--reach',
            'casey@ahbode.com',
          ],
          cwd: repoKeyed.path,
          env: envIsolated(repoKeyed.path),
          logOnError: false,
        }),
      );

      const rendered = () =>
        asSnapshotSafe(`${result.stdout}${result.stderr}`);

      // ⚠️ the reach the human NAMED is the reach reported on. a keyed ask that answered
      //    about the peer would send them to re-cut the wrong account — the same
      //    wrong-row-wrong-reach class `[t0]` caught in the bulk render
      then('the reply reports on the reach that was asked for', () => {
        expect(rendered()).toContain('casey@ahbode.com');
      });

      then('no credential of any reach is handed back', () => {
        expect(rendered()).not.toContain('ghp-');
      });

      then('the targeted render is snapped', () => {
        expect(rendered()).toMatchSnapshot('rendered');
      });
    });
  });

  /**
   * .what = the two omission reasons `[case1]` cannot express — `errored` and `remote` — driven
   *         through the same real cli → render → exit-code wire
   * .why = ⛔ found by peer review: `KeyrackKeyOmission['reason']` is a PUBLISHED four-way union
   *        and only TWO of its members (`lost`, `absent`) had any acceptance coverage anywhere in
   *        this repo. the two uncovered ones are the consequential half:
   *        - `errored` is the ONLY reason that moves the process exit code off 0
   *          (`asKeyrackUnlockExitCode`), and the grove chains `unlock && start-app` on that code
   *        - `remote` is the only reason with NO local remedy, so its render must not tip one
   *        both were proven at unit grain alone — the same "a unit test would not have caught it"
   *        shape the wish itself complains about
   *
   * .note = ⚠️ these need their OWN racks rather than rows added to `[case1]`'s. an `errored` row
   *         drags the whole batch's exit code off 0, which would destroy `[case1][t0]`'s
   *         "a benign omission batch still exits 0" clamp — itself added to close a prior
   *         reviewer's gap. and the exit code is a SINGLE value per run, so the two causes must
   *         run in separate racks or one masks the other
   * .note = fully hermetic, and deliberately so — every fault below is provoked by fixture DATA,
   *         with no vault, no network, and no credential:
   *         - `errored`/caller-fixable — an `os.direct` entry whose stored blob names a mech the
   *           host manifest disagrees with, which `vaultAdapterOsDirect.get` refuses as a
   *           `ConstraintError`
   *         - `errored`/server-fault — an `os.direct` entry whose host mech has no adapter on
   *           that vault, which raises a `MalfunctionError`
   *         - `remote` — a `github.secrets` entry, whose `get` is `null` by construction. the
   *           row is filed BEFORE any adapter method runs, so not one `gh` call is made
   */
  given('[case2] a rack whose reach-held key faults on a caller-fixable cause', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-omission-faults' }),
    );

    /**
     * .what = a bulk `unlock --env prep` over a rack that holds:
     *         - `ERRORED_AT_REACH` at ONE reach on `os.direct`, whose stored blob disagrees with
     *           the host manifest's mech → a `ConstraintError` the loop isolates as `errored`
     *         - `REMOTE_KEY`, reachless, on `github.secrets` — a write-only vault → `remote`
     *         - `REPO_KEY`, healthy, so the batch is not wholly broken
     * .why = one invocation proves the per-key fault ISOLATION (a live fault on one key never
     *        aborts a co-batched healthy credential), both uncovered reasons, and the exit code
     *        the grove branches on
     */
    when('[t0] the whole rack is unlocked in bulk', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      const rendered = () => asSnapshotSafe(`${result.stdout}${result.stderr}`);

      // ⛔ THE FAULT-ISOLATION CLAMP, at journey grain. the loop's whole reason for a try/catch
      //    is that "one flaky key never crashes the rest" — and that promise had no journey
      //    proof. a regression that let the fault escape would abort before this row rendered
      then('a live fault on one key never takes down a healthy peer', () => {
        expect(rendered()).toContain('testorg.prep.REPO_KEY');
      });

      then('the faulted key renders as its own errored row', () => {
        expect(rendered()).toContain('@all.prep.ERRORED_AT_REACH');
        expect(rendered()).toContain('status: errored');
      });

      // ⚠️ the row names WHICH account faulted. a vault-level fault hits every reach of a slug
      //    at once, so a row with no reach leaf leaves a human unable to tell which account
      //    failed — the same ambiguity `[case1][t0]` proves the `lost` rows are spared
      then('the errored row names the reach it faulted at', () => {
        expect(rendered()).toContain('reach: casey@ahction.com');
      });

      // ⛔ THE EXIT CODE, and the reason this case exists. `errored` is the ONE reason that
      //    moves the code off 0, and the SPECIFIC code follows the cause class: every cause
      //    here is caller-fixable (a `ConstraintError` — a manifest to correct), so a retry
      //    loop is told to fix config rather than retry blind (`rule.require.exit-code-semantics`)
      then('a caller-fixable fault exits 2, never 0 and never 1', () => {
        expect(result.status).toEqual(2);
      });

      // ⚠️ `remote` is the one omission with NO read-side remedy: the vault's `get` is null by
      //    construction, so the value can never be fetched from this host. it must therefore
      //    never be tipped to retry the unlock — a command guaranteed to fail forever — and it
      //    is tipped to `set` instead, which is the one operation a write-only vault DOES
      //    support (`rule.require.errors-name-the-fix`)
      then('the write-only vault renders as remote', () => {
        expect(rendered()).toContain('@all.prep.REMOTE_KEY');
        expect(rendered()).toContain('status: remote');
      });

      then('a remote key is never tipped to retry the unlock', () => {
        const lines = rendered().split('\n');
        const headAt = lines.findIndex((line) =>
          line.includes('@all.prep.REMOTE_KEY'),
        );
        const tipOfRow = lines
          .slice(headAt)
          .find((line) => line.includes('tip:'));
        expect(tipOfRow).toBeDefined();
        expect(tipOfRow).not.toContain('keyrack unlock');
      });

      // ⛔ THE HUMAN TWIN of the exit-code split, and it had no coverage either. one `errored`
      //    STATUS renders two different remedies, chosen by the same cause class the exit code
      //    reads: a caller-fixable `ConstraintError` says `fix:` (a correction exists), a
      //    server fault says `retry:` (none does). `[case3]` clamps the other side, so the pair
      //    pins the inversion rather than either half alone
      then('a caller-fixable fault is tipped to FIX, never to retry', () => {
        expect(rendered()).toContain(
          'tip: mech mismatch: host manifest and blob disagree — fix:',
        );
      });

      // ⚠️ and it is reachless BY CONSTRUCTION, not by fixture accident. `github.secrets` is
      //    `UNADDRESSABLE`, so a reach-held entry on it is either skipped (an enumerated reach
      //    under a bulk ask) or refused loudly (a reach the caller named) — never rendered as
      //    `remote`. this pins that `remote` is only ever reachable on a reachless entry
      then('a remote row carries no reach leaf', () => {
        const lines = rendered().split('\n');
        const headAt = lines.findIndex((line) =>
          line.includes('@all.prep.REMOTE_KEY'),
        );
        expect(headAt).toBeGreaterThan(-1);
        const branch: string[] = [];
        for (const line of lines.slice(headAt + 1)) {
          if (line.includes('.prep.')) break;
          branch.push(line);
        }
        expect(branch.some((line) => line.includes('reach:'))).toEqual(false);
      });

      then('no credential of any key leaks into the fault render', () => {
        expect(rendered()).not.toContain('sk-repo-scoped-hhh888');
      });

      // ⚠️ the whole transcript, so a reviewer SEES the two uncovered statuses rather than
      //    infers them from text probes. this is the render a human meets when a batch half
      //    faults, and it is the artifact a composition regression would show at a glance
      then('the whole render is snapped', () => {
        expect(rendered()).toMatchSnapshot('rendered');
      });
    });

    /**
     * .what = the SAME bulk unlock, asked in ROBOT mode (`--json`)
     * .why = the exit code and the `omitted` payload are the two halves the grove reads, and
     *        neither had coverage for these reasons. a robot that cannot tell `errored` from
     *        `lost` cannot tell "fix your config" from "this key was never filled"
     */
    when('[t1] the same bulk unlock, asked in robot mode (--json)', () => {
      const repoRobot = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-reach-omission-faults' }),
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
        return JSON.parse(unlockJson.stdout) as {
          unlocked: { slug: string }[];
          omitted: {
            slug: string;
            reason: string;
            reach?: { exid: string };
          }[];
        };
      });

      // ⚠️ a NON-ZERO exit still emits parseable json. a robot reads the payload to learn WHICH
      //    key faulted, so an exit-2 run that truncated or prose-wrapped its stdout would leave
      //    the consumer with a code and no diagnosis (`rule.require.errors-name-the-fix`)
      then('it exits 2 and still emits parseable json', () => {
        expect(unlockJson.status).toEqual(2);
        expect(Array.isArray(payload.omitted)).toEqual(true);
      });

      then('the errored row reaches the wire with its own reach', () => {
        const rowErrored = payload.omitted.find(
          (row) => row.slug === '@all.prep.ERRORED_AT_REACH',
        );
        expect(rowErrored?.reason).toEqual('errored');
        expect(rowErrored?.reach?.exid).toEqual('casey@ahction.com');
      });

      // ⚠️ e16 on the `remote` row: `reach` is OPTIONAL, never nullable — `JSON.stringify`
      //    DROPS an absent field but EMITS a null one, so only `in` tells the two apart
      then('the remote row reaches the wire with NO reach key at all', () => {
        const rowRemote = payload.omitted.find(
          (row) => row.slug === '@all.prep.REMOTE_KEY',
        );
        expect(rowRemote?.reason).toEqual('remote');
        expect('reach' in rowRemote!).toEqual(false);
      });

      then('the healthy key is still granted alongside the faults', () => {
        expect(payload.unlocked.map((row) => row.slug)).toContain(
          'testorg.prep.REPO_KEY',
        );
      });

      // ⚠️ PROJECTED, never raw — an unlock payload carries `key.secret` on its granted rows
      then('the projected omitted payload is snapped', () => {
        expect(
          payload.omitted.map((row) => ({
            slug: row.slug,
            reason: row.reason,
            ...(row.reach ? { reach: row.reach } : {}),
          })),
        ).toMatchSnapshot('omitted.projected');
      });
    });
  });

  /**
   * .what = the OTHER half of the errored exit-code discriminant — a SERVER-fault cause
   * .why = `asKeyrackUnlockExitCode` splits `errored` two ways: every cause caller-fixable
   *        (a `ConstraintError`) exits 2, and ANY server/transient fault exits 1. `[case2]`
   *        clamps the first branch; absent this one, a regression that collapsed the split to a
   *        single code would pass every test — and a retry loop would fix config in answer to a
   *        throttle, or blind-retry a manifest defect forever
   *
   * .note = its own rack, necessarily. the code is ONE value per run and the split is decided by
   *         `.every()` over the batch, so a caller-fixable row in the same rack would mask this
   */
  given('[case3] a rack whose reach-held key faults on a server cause', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-reach-omission-malfunction' }),
    );

    when('[t0] the whole rack is unlocked in bulk', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: envIsolated(repo.path),
          logOnError: false,
        }),
      );

      const rendered = () => asSnapshotSafe(`${result.stdout}${result.stderr}`);

      then('a live fault on one key never takes down a healthy peer', () => {
        expect(rendered()).toContain('testorg.prep.REPO_KEY');
      });

      then('the faulted key renders as its own errored row', () => {
        expect(rendered()).toContain('@all.prep.FAULTED_AT_REACH');
        expect(rendered()).toContain('status: errored');
        expect(rendered()).toContain('reach: casey@ahbode.com');
      });

      // ⛔ THE OTHER BRANCH of the exit-code split, and the whole reason this case exists
      then('a server fault exits 1, never 2', () => {
        expect(result.status).toEqual(1);
      });

      // ⛔ and the HUMAN twin of that same split. the identical `errored 💥` status renders
      //    `retry:` here and `fix:` in `[case2]`, because a server fault leaves a human no
      //    correction to make. a regression that collapsed the two would tell someone to fix
      //    a throttle, or to blind-retry a manifest defect forever
      then('a server fault is tipped to RETRY, never to fix', () => {
        expect(rendered()).toContain(
          'tip: no adapter for mech: EPHEMERAL_VIA_GITHUB_APP — retry:',
        );
      });

      then('the whole render is snapped', () => {
        expect(rendered()).toMatchSnapshot('rendered');
      });
    });

    /**
     * .what = the SAME server-fault bulk unlock, asked in ROBOT mode (`--json`)
     * .why = `[case1][t1]` and `[case2][t1]` each pin their batch's MACHINE contract; this
     *        branch had only its human render. the exit-1 batch is a distinct variant a caller
     *        meets — the grove chains `unlock && start-app` on the code — so a regression in
     *        how a server-fault row projects (a wrong reason, an absent row, a leaked secret)
     *        would drift with no diff to see (`rule.require.contract-snapshot-exhaustiveness`)
     *
     * .note = the peer's `[t1]` proves the exit-2 payload. the two together are what make the
     *         exit-code split legible to a robot: same `reason: 'errored'` on the wire, two
     *         different codes, and the code is the only discriminant a consumer gets
     */
    when('[t1] the same bulk unlock, asked in robot mode (--json)', () => {
      const repoRobot = useBeforeAll(async () =>
        genTestTempRepo({
          fixture: 'with-keyrack-reach-omission-malfunction',
        }),
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
        return JSON.parse(unlockJson.stdout) as {
          unlocked: { slug: string }[];
          omitted: {
            slug: string;
            reason: string;
            reach?: { exid: string };
          }[];
        };
      });

      // ⛔ THE clamp this case adds. exit 1 — never 2, never 0 — AND still parseable, so a
      //    consumer that reads the code to decide "retry" can read the payload to learn WHICH
      //    key to retry
      then('it exits 1 and still emits parseable json', () => {
        expect(unlockJson.status).toEqual(1);
        expect(Array.isArray(payload.omitted)).toEqual(true);
      });

      then('the server-faulted row reaches the wire with its own reach', () => {
        const rowFaulted = payload.omitted.find(
          (row) => row.slug === '@all.prep.FAULTED_AT_REACH',
        );
        expect(rowFaulted?.reason).toEqual('errored');
        expect(rowFaulted?.reach?.exid).toEqual('casey@ahbode.com');
      });

      // ⚠️ the fault is isolated per key — a healthy peer must still be granted, or one bad
      //    mech takes the whole rack down with it
      then('the healthy key is still granted alongside the fault', () => {
        expect(payload.unlocked.map((row) => row.slug)).toContain(
          'testorg.prep.REPO_KEY',
        );
      });

      // ⚠️ PROJECTED, never raw — an unlock payload carries `key.secret` on its granted rows
      then('the projected omitted payload is snapped', () => {
        expect(
          payload.omitted.map((row) => ({
            slug: row.slug,
            reason: row.reason,
            ...(row.reach ? { reach: row.reach } : {}),
          })),
        ).toMatchSnapshot('omitted.projected');
      });
    });
  });
});
