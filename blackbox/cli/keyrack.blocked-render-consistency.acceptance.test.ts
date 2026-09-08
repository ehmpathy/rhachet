import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the clamp on `ONE rule, ONE render` — every caller-fixable refusal on every keyrack
 *         verb renders the `🔐 keyrack … / └─ ✋ ConstraintError:` tree, never a flush-left
 *         `✋ ConstraintError:` class dump with an `[args]` trailer
 *
 * ⚠️ .note.the-class-is-content = the node names the ERROR CLASS verbatim, and the two rules
 *         that govern it agree on opposite halves: `rule.forbid.helpful-error-parents` demands
 *         the class be a LEAF (`ConstraintError`/`MalfunctionError`, never a parent), and
 *         `rule.require.unabridged-error-prefix` demands that leaf SURVIVE the render. so the
 *         defect this suite forbids is the flush-left DUMP — the class outside the tree, beside
 *         a metadata blob and an `[args]` trailer — never the class itself.
 *         ⇒ `✋ blocked:` at the node is a REGRESSION, not a synonym: `✋` already says
 *         *refused*, so the pair spends two tokens on one fact and drops the one token that
 *         says WHO must fix it (and fixes the exit code: 2 vs 1)
 * .why = with no boundary, the rule is held by discipline at ~16 call sites rather than by a
 *        type or a single chokepoint — and a guard beside one call makes no claim about its
 *        neighbours, so each raw throw closed leaves the class open. `KeyrackCommand` closes the
 *        class at the boundary; this suite is what proves the boundary holds, and what fails CI
 *        on the next raw throw
 *
 * ⚠️ .note = every row here is a FLAG VALIDATION, and each already exits 2 and already names its
 *         own cause — only the RENDER can be wrong, so an exit-code assert stays green over the
 *         defect. that is why each row asserts the tree is PRESENT and the class dump is ABSENT,
 *         and why exit 2 alone would prove no part of the claim
 * .note = the rows deliberately span the whole family — `set` `del` `source` `unlock` `firewall`
 *         `relock` `fill` and the nested `recipient set` — since the defect class is "one verb
 *         differs from its peers", which no single-verb row can catch. that inventory is the
 *         literal contents of `REFUSALS` below; keep the two in step, or a reader hunts a row
 *         that was never written (`rule.require.timeless-comments`)
 * .note = `[case2]` clamps the LIMIT of the rule, and it is the half a reader is likeliest to
 *         drop: a blanket `allowUnknownOption()` would satisfy every row of `[case1]` while it
 *         retired the parse gate for every OTHER flag on those verbs
 * .note = `[case3]` carries the refusals that need a WORLD rather than a flag — they cannot join
 *         `REFUSALS`, whose rows all refuse at parse time under one fixture
 */
const REFUSALS: { row: string; args: string[]; stdin?: string }[] = [
  {
    row: 'set — invalid --vault',
    args: [
      'keyrack',
      'set',
      '--key',
      'FOO',
      '--env',
      'test',
      '--vault',
      'not.a.vault',
      '--mech',
      'PERMANENT_VIA_REPLICA',
    ],
  },
  {
    row: 'set — invalid --mech',
    args: [
      'keyrack',
      'set',
      '--key',
      'FOO',
      '--env',
      'test',
      '--vault',
      'os.direct',
      '--mech',
      'NOT_A_MECH',
    ],
  },
  {
    row: 'source — --strict and --lenient together',
    args: ['keyrack', 'source', '--env', 'test', '--strict', '--lenient'],
  },
  {
    row: 'source — sudo requires --key',
    args: ['keyrack', 'source', '--env', 'sudo'],
  },
  {
    row: 'unlock — invalid --env',
    args: ['keyrack', 'unlock', '--env', 'not-an-env'],
  },
  {
    row: 'unlock — sudo requires --key',
    args: ['keyrack', 'unlock', '--env', 'sudo'],
  },
  {
    row: 'del — invalid --env',
    args: ['keyrack', 'del', '--key', 'FOO', '--env', 'not-an-env'],
    stdin: 'y\n',
  },
  {
    row: 'firewall — invalid --env',
    args: [
      'keyrack',
      'firewall',
      '--env',
      'not-an-env',
      '--from',
      'json(stdin://*)',
      '--into',
      'json',
    ],
    stdin: '{}',
  },
  {
    row: 'firewall — invalid --into',
    args: [
      'keyrack',
      'firewall',
      '--env',
      'test',
      '--from',
      'json(stdin://*)',
      '--into',
      'not-a-target',
    ],
    stdin: '{}',
  },
  // ⚠️ the three rows below are a DISTINCT sub-class: a flag declared only in order to refuse
  //    it. `relock`, `fill`, and `firewall` each decline `--org` by design, and each recorded
  //    that decision in a source comment — so, undeclared, the ask fell to commander's
  //    `unknownOption()`: `error: unknown option '--org'` at exit 1, which named the flag but
  //    never the reason or the fix the comment already held. these rows are what keeps the
  //    decision reachable by a human rather than by a reader of the source
  {
    row: 'relock — --org (declined by design)',
    args: ['keyrack', 'relock', '--org', '@all'],
  },
  {
    row: 'fill — --org (declined by design)',
    args: ['keyrack', 'fill', '--env', 'test', '--org', '@all'],
  },
  {
    row: 'firewall — --org (declined by design)',
    args: [
      'keyrack',
      'firewall',
      '--env',
      'test',
      '--from',
      'json(stdin://*)',
      '--into',
      'json',
      '--org',
      '@all',
    ],
    stdin: '{}',
  },
  {
    // ⚠️ the row that proves the guarantee DESCENDS. `recipient set` is two levels below the
    //    keyrack root, so it exists only because commander's `createCommand` hook carries the
    //    subclass down — a per-site wrapper list would have had to remember this verb, and a
    //    hand-kept inventory of the ~16 call sites does not name it
    row: 'recipient set — invalid --stanza (a NESTED subcommand)',
    args: [
      'keyrack',
      'recipient',
      'set',
      '--pubkey',
      'age1notarealkey',
      '--label',
      'test',
      '--stanza',
      'not-ssh',
    ],
  },
];

describe('keyrack blocked-render consistency', () => {
  given('[case1] a repo, and every flag-validation refusal in the verb family', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] each refusal is triggered', () => {
      // .note = keyed by row, never an array — `useThen` hands back a proxy that defers
      //         PROPERTY access, so an array method on it is not a function. `REFUSALS` is a
      //         plain module const, so it stays the iteration source and the proxy is only
      //         ever indexed
      const results = useThen('each run completes', async () =>
        Object.fromEntries(
          REFUSALS.map((refusal) => [
            refusal.row,
            invokeRhachetCliBinary({
              args: refusal.args,
              cwd: repo.path,
              env: { HOME: repo.path },
              stdin: refusal.stdin,
              logOnError: false,
            }),
          ]),
        ),
      );

      /** .what = the two streams a human reads, joined, for one row */
      const asOutput = (row: string): string =>
        results[row]!.stdout + results[row]!.stderr;

      then('each refuses as a CONSTRAINT (exit 2), never as a crash (exit 1)', () => {
        expect(
          REFUSALS.map((refusal) => `${refusal.row} = ${results[refusal.row]!.status}`),
        ).toEqual(REFUSALS.map((refusal) => `${refusal.row} = 2`));
      });

      then('each renders the blocked tree, names its class, and dumps none', () => {
        // ⚠️ .why = the assert with teeth. exit 2 above passes with OR without the boundary,
        //        because the generic top-level handler already exits 2 for a `ConstraintError`.
        //        only the render distinguishes the two, so only this row can go red on the defect
        const offenders = REFUSALS.map((refusal) => {
          const output = asOutput(refusal.row);
          return {
            row: refusal.row,
            // ⚠️ the node must carry the CLASS, never the term `blocked`
            //    (`rule.require.unabridged-error-prefix`). a `✋ blocked:` node reads as
            //    strictly less informative than `✋ ConstraintError:` for zero saved width
            rendersTree:
              output.includes('🔐 keyrack') &&
              /└─ ✋ ConstraintError: /.test(output),
            // ⚠️ the regex is ANCHORED FLUSH-LEFT (`^` under `/m`) on purpose. the class name
            //    is REQUIRED at the tree node (indented, matched above); what is forbidden is
            //    the raw exception DUMP, which lands at column 0 outside the tree it
            //    interrupted, beside an `[args]` trailer
            //    (`rule.forbid.helpful-error-parents`)
            dumpsClass:
              /^✋ ConstraintError:/m.test(output) || output.includes('[args]'),
          };
        }).filter((read) => !read.rendersTree || read.dumpsClass);
        expect(offenders).toEqual([]);
      });

      then('each names the verb a human typed, never a bare subcommand', () => {
        // .why = the path is read off commander's own parent chain rather than hand-written per
        //        site, so a renamed verb cannot drift from the label on its own refusal
        expect(
          REFUSALS.filter(
            (refusal) => !asOutput(refusal.row).includes(`🔐 keyrack ${refusal.args[1]}`),
          ).map((refusal) => refusal.row),
        ).toEqual([]);
      });

      then('the render each human sees is snapped', () => {
        expect(
          Object.fromEntries(
            REFUSALS.map((refusal) => [refusal.row, asOutput(refusal.row)]),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  /**
   * ⚠️ .what = the clamp on the LIMIT of the rule above — a flag the family never teaches keeps
   *         commander's own refusal, and does NOT get the keyrack tree
   * .why = `--org` earns a branded refusal on the three verbs that decline it because eight
   *        peer verbs TEACH it: a human who tries it there applies a rule the cli itself
   *        taught, rather than mistypes. `--bogus` has no such story, so it stays commander's
   *        (`rule.prefer.wet-over-dry` — three declared refusals, not a blanket handler)
   * .why the clamp = the cheap way to serve the three rows above is `allowUnknownOption()` plus
   *        one check, and that shape would leave `[case1]` fully GREEN while it silently
   *        retired the typo guard on every other flag of those verbs. this case is the one
   *        assert that goes red on it
   */
  given('[case2] a flag the family never teaches, on a verb that declines --org', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] an undeclared flag is handed to relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--bogus', 'x'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('commander still refuses it, and still names the flag', () => {
        expect(result.status).not.toEqual(0);
        expect(`${result.stdout}${result.stderr}`).toContain('--bogus');
      });

      then('it is NOT dressed as a keyrack refusal — the parse gate is intact', () => {
        // ⚠️ this is the assert that goes red under `allowUnknownOption()`. were the parse gate
        //    retired, `--bogus` would sail past commander and land in the action, where the
        //    `--org` check does not know it — so a typo would run the verb rather than halt it
        expect(`${result.stdout}${result.stderr}`).not.toContain('🔐 keyrack');
      });

      // ⚠️ .why = this case is the LIMIT of the rule, so the render it preserves is as much a
      //    contract as the three it excludes. the two asserts above bracket the render from
      //    either side (it names the flag; it is not the keyrack tree) and leave the whole
      //    middle unheld: how commander words it, its usage line, its exit path
      // .note = both streams are joined, then trimmed — no mask. commander's refusal names
      //    the flag and no path, so the render is byte-stable across hosts as it stands
      then('the render commander keeps is snapped', () => {
        expect(`${result.stdout}${result.stderr}`.trim()).toMatchSnapshot();
      });
    });
  });

  /**
   * ⚠️ .what = the two renders NO row above can reach — each refuses on the STATE of the world
   *         rather than on a flag, so each needs its own fixture
   * .why = `REFUSALS` is one fixture and one pass, which is what makes it cheap and what bounds
   *        it: a refusal that needs an absent file, or a repo with no manifest, cannot live
   *        there. both renders below refuse through `KeyrackCommand` rather than through a raw
   *        `console.log` + `process.exit(2)` (or a raw throw), and a render with no row is a
   *        render no human has ever been shown (`rule.forbid.friction-hazards`)
   *
   * ⚠️ .note.teeth = each row asserts its OWN message, never the tree alone. every keyrack verb
   *         renders the tree for SOME refusal, so a tree-only assert stays green while the run
   *         refuses for a completely different reason — a host manifest it could not find, a
   *         flag it could not parse. the message is what says the intended branch was reached
   *         (`rule.forbid.failhide`)
   */
  given('[case3] refusals that turn on the STATE of the world', () => {
    when('[t0] set --at names a path that does not exist', () => {
      // .why.fixture = `with-keyrack-manifest` holds BOTH a repo `.agent/keyrack.yml` and a
      //        host `.rhachet/keyrack.manifest.json`, which is what lets the run reach the `--at`
      //        load at all — the host-manifest refusal fires above it, and would otherwise be
      //        the branch this row silently exercised
      // .why.flags = no `--org @all`: a machine-wide ask that also carries `--at` is refused as
      //        a contradiction beside the flag validations, well above this branch
      const repo = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
      );

      const result = useThen('the set is attempted', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'FOO',
            '--env',
            'test',
            '--vault',
            'os.direct',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--at',
            '.agent/keyrack.absent.yml',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'secret\n',
          logOnError: false,
        }),
      );

      then('it refuses on the ABSENT PATH, and names it', () => {
        const output = result.stdout + result.stderr;
        // ⚠️ .why.one-line = the path is asserted ON THE SAME LINE as the message, never as a
        //        bare `toContain`. the blocked tree echoes the invocation (`ran: … --at
        //        .agent/keyrack.absent.yml`), so a bare `toContain('.agent/keyrack.absent.yml')`
        //        matches the ECHO and passes even when the run refused for a wholly different
        //        cause (`rule.require.refusals-carry-context`)
        expect(output).toMatch(
          /keyrack not found at:.*\.agent\/keyrack\.absent\.yml/,
        );
      });

      then('it renders the blocked tree, names its class, and dumps none', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('🔐 keyrack set');
        // the class at the NODE is required; the class FLUSH-LEFT is the dump, and forbidden
        expect(output).toContain('└─ ✋ ConstraintError: ');
        expect(/^✋ ConstraintError:/m.test(output)).toEqual(false);
      });

      then('it refuses as a CONSTRAINT (exit 2), never as a crash', () => {
        expect(result.status).toEqual(2);
      });

      then('the render a human sees is snapped', () => {
        expect(result.stdout + result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] firewall runs in a repo that holds no keyrack.yml', () => {
      // .why.fixture = `minimal` is a REAL git repo with no `.agent/` at all, which is the one
      //        state this render needs: a gitroot present (so the repo-scope refusal above it
      //        stands down) and a manifest absent. every other firewall row in the suite either
      //        holds a manifest or runs from a non-repo cwd, where the earlier refusal fires
      const repo = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'minimal' }),
      );

      const result = useThen('the firewall is attempted', async () =>
        invokeRhachetCliBinary({
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
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: '{}',
          logOnError: false,
        }),
      );

      then('it refuses on the ABSENT MANIFEST, and names the fix', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack.yml not found');
        expect(output).toContain('keyrack init');
      });

      then('it renders the blocked tree, names its class, and dumps none', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('🔐 keyrack firewall');
        // the class at the NODE is required; the class FLUSH-LEFT is the dump, and forbidden
        expect(output).toContain('└─ ✋ ConstraintError: ');
        expect(/^✋ ConstraintError:/m.test(output)).toEqual(false);
      });

      then('it refuses as a CONSTRAINT (exit 2), never as a crash', () => {
        expect(result.status).toEqual(2);
      });

      then('the render a human sees is snapped', () => {
        expect(result.stdout + result.stderr).toMatchSnapshot();
      });
    });
  });
});
