import { MalfunctionError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = clamp for rule.require.thinnest-import-path: a cli call loads only its own command's graph
 * .why = every `rhx` call is a fresh node process, and each module it loads is a disk read. an eager
 *   import of all sixteen command registrars once made `rhx init` load ~4150 modules (the aws sdk,
 *   clone, act, keyrack) for a command that needs ~1300. the witness is the BUILT dist under real
 *   node, so the probe runs the built invoke with a Module._load recorder
 */
const INVOKE_DIST_PATH = resolve(__dirname, '../../dist/contract/cli/invoke.js');
const PROBE_PATH = resolve(__dirname, '../.test/infra/probe.thinImportPath.cjs');

/**
 * .what = run the built cli under the probe
 */
const runProbe = (input: { args: string[] }) =>
  spawnSync(process.execPath, [PROBE_PATH, INVOKE_DIST_PATH, ...input.args], {
    encoding: 'utf8',
    timeout: 60_000,
    killSignal: 'SIGKILL',
  });

/**
 * .what = the human-faced body of a probe run's stdout, with the probe's own report cut out
 * .why = 🔴 the probe appends its instrumentation to the SAME stream the cli writes help to,
 *   glued onto the last help line with no separator. so a snapshot of raw `stdout` pins a
 *   kilo-char blob — a load count, every eager-imported dist path, every resolved package —
 *   onto a surface whose whole claim is "the help text a human reads"
 * .note = the blob is the probe's, never the cli's. a human who runs `rhx --help` never sees
 *   it, so to snap it would pin a byte no contract owns
 * .note = it is CUT rather than masked. a mask would leave a token in place of a span that
 *   does not belong to this surface at all; the report is asserted on its own, through
 *   `getLoadReportForArgs`, which is where a change to it should redden a test
 */
const asHelpBodyWithoutProbeReport = (input: { stdout: string }): string =>
  input.stdout.replace(/REPORT_START.*REPORT_END/s, '').trimEnd();

/**
 * .what = run the built cli under the probe and parse its load report
 */
const getLoadReportForArgs = (input: {
  args: string[];
}): { loads: number; distFiles: string[]; packages: string[] } => {
  const result = runProbe(input);
  const match = /REPORT_START(.*)REPORT_END/s.exec(result.stdout ?? '');
  // the probe is ours, so an absent report is a broken instrument rather than a bad
  // input — a MalfunctionError, which carries the status and both streams a reader
  // needs to tell a crash from a silent exit (`rule.require.failloud`)
  if (!match)
    throw new MalfunctionError('the load probe emitted no report', {
      args: input.args,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      hint: 'run `npm run build` — the probe reads `dist/`, so a stale or absent build yields no report',
    });
  return JSON.parse(match[1]!);
};

// the registrars of peer commands, which `init` must never load
const PEER_REGISTRARS = [
  'contract/cli/invokeKeyrack.js',
  'contract/cli/invokeClone.js',
  'contract/cli/invokeAct.js',
  'contract/cli/invokeAsk.js',
  'contract/cli/invokeEnroll.js',
  'contract/cli/invokeRepoIntrospect.js',
  'contract/cli/invokeRepoCompile.js',
];

describe('cli thin import path', () => {
  given('[case1] a known command: `init --help`', () => {
    when('[t0] the built cli runs it', () => {
      const report = useThen('the probe reports its loads', async () =>
        getLoadReportForArgs({ args: ['init', '--help'] }),
      );

      then('it loads the init registrar', () => {
        expect(report.distFiles).toContain('contract/cli/invokeInit.js');
      });

      then('it loads no peer command registrar', () => {
        const peersLoaded = PEER_REGISTRARS.filter((peer) =>
          report.distFiles.includes(peer),
        );
        expect(peersLoaded).toEqual([]);
      });

      then('it loads neither the aws sdk nor the rhachet-artifact-git barrel', () => {
        const heavyLoaded = report.packages.filter(
          (name) =>
            name.startsWith('@aws-sdk/') || name === 'rhachet-artifact-git',
        );
        expect(heavyLoaded).toEqual([]);
      });

      then('its load count stays near the measured healthy 580', () => {
        // 🔴 the bound is set NEAR the healthy count, never merely under the eager one.
        // a clamp at the old 2000 was 3.4x healthy, so a PARTIAL regression — one peer
        // registrar eagerly imported, ~2500-3000 loads — passed it. the rule this case
        // enforces is `thinnest`, not `thinner than the worst it ever was`
        //
        // measured 580 for `init --help` on the built dist. the margin to 800 is ~38%:
        // wide enough that a dep bump or a new module on the init path does not redden
        // the suite, tight enough that any eager subtree (the aws sdk alone is hundreds
        // of files) blows straight through it
        //
        // .note = `rule.require.thinnest-import-path` cites ~1300 for `init`. that is
        //   the FULL command; `--help` short-circuits before the command body runs, so
        //   580 is the thinner `--help` path, not a contradiction of the brief
        expect(report.loads).toBeLessThan(800);
      });
    });
  });

  given('[case2] no command: `--help`', () => {
    when('[t0] the built cli runs it', () => {
      const result = useThen('it prints the top-level help', async () =>
        runProbe({ args: ['--help'] }),
      );

      then('the help still lists every command', () => {
        const commands = [
          'init',
          'repo',
          'roles',
          'list',
          'readme',
          'run',
          'enroll',
          'actor',
          'clone',
          'choose',
          'ask',
          'act',
          'upgrade',
          'update',
          'keyrack',
        ];
        const listed = commands.filter((name) =>
          new RegExp(`^\\s+${name}\\b`, 'm').test(result.stdout),
        );
        expect(listed).toEqual(commands);
      });

      then('the help text a human reads is locked to a snapshot', () => {
        // the assert above proves every command stays DISCOVERABLE; it cannot catch a
        // reworded description, a reordered block, or a lost blank line in the help a
        // human actually reads. `--help` is a user-faced cli surface, so it is snapped
        // (`rule.require.acceptance-journey-coverage` names `--help` as a variant to
        // snap). paired with that assert, never snapshot-only
        // (`rule.forbid.failhide`).
        // .note = the probe's own REPORT_START…REPORT_END blob is CUT, never masked — it
        //   is the probe's instrumentation, not a byte of the help contract, and it is
        //   asserted on its own through `getLoadReportForArgs`. the help body that
        //   remains carries no volatile span — no temp path, no version, no count — so
        //   not one byte of it is masked
        expect(
          asHelpBodyWithoutProbeReport({ stdout: result.stdout }),
        ).toMatchSnapshot();
      });
    });
  });
});
