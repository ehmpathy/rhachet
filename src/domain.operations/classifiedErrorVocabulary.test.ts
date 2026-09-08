import { given, then, when } from 'test-fns';

import { asCloneSocketBindFaultError } from './clone/asCloneSocketBindFaultError';
import { asCloneSocketOmissionReasonError } from './clone/asCloneSocketOmissionReasonError';
import { asPtyDeviceRefusedError } from './clone/asPtyDeviceRefusedError';
import { asNpmInstallFailureError } from './upgrade/asNpmInstallFailureError';

/**
 * .what = the VOCABULARY clamp across every classified-error factory this round added
 *
 * .why  = each factory owns its own decision shape, and that is correct — a shared composer
 *   would be "a switch on which axis you meant". but they must still speak ONE language, and
 *   today no test holds them to it: a rename or a reworded prefix in one reddens no peer.
 *
 * 🚨 it clamps the CONTRACT they share, never the decisions they do not:
 *   - every report renders the UNABRIDGED `<emoji> <ClassName>: ` prefix
 *   - every report carries a non-empty `hint` that names a move
 *   - every SOCKET report opens with one sentence stem, so a human greps one phrase
 *   - every socket report carries `hostTuple` at the `platform-arch` grain
 *
 * ⚠️ `asNpmInstallFailureError` is in the set for the `hint` row ONLY. it reports an install,
 *   not a socket, so it shares neither the stem nor `hostTuple` — and to force it to would be
 *   the false uniformity this clamp exists to avoid.
 * ⚠️ this asserts the SHAPE, never the exact words of any one hint. a hint's text is its own
 *   file's business; that it exists, is non-empty, and reaches the reader is the set's.
 */

/**
 * .what = the unabridged prefix every classified report renders ahead of its sentence
 *
 * .why  = `rule.require.unabridged-error-prefix` — the glyph alone is NOT the prefix. a human
 *   greps `ConstraintError`; a glyph is ungreppable, and the class name is the one datum that
 *   says whether the CALLER or the SERVER must act.
 *
 * 🚨 this row exists because the per-factory SNAPSHOTS cannot hold it. the rule names its own
 *   failure mode: a redaction gets blessed into a snapshot, every resnap re-blesses it, and a
 *   reviewer who diffs sees no change. an assertion cannot be resnapped.
 */
const UNABRIDGED_PREFIX = /^(💥 MalfunctionError|✋ ConstraintError): /;

/**
 * .what = the one sentence stem every socket-unavailable report opens with, AFTER its prefix
 * .why  = a human who has read it once greps this phrase to find every peer. one owner for
 *   the string, so a reword in a factory reddens here rather than fragments the set
 */
const SOCKET_REPORT_STEM = 'the reach socket is unavailable — ';

/**
 * .what = the SENTENCE half of a rendered report — line one, with its prefix stripped
 *
 * .why  = `.message` is deliberately `<prefix><sentence>\n\n<metadata json>`, because the
 *   metadata rides the human frame rather than a side channel
 *   (`rule.require.unredacted-error-metadata`). so a read of the WHOLE message silently
 *   folds the metadata into whatever it compares.
 *
 * 🚨 measured 2026-09-05, by mutation: without this split the distinctness row below stayed
 *   GREEN while two factories carried the identical sentence — their metadata differed, so
 *   their tails differed, so the row read as a clamp and guarded naught. the exact
 *   teeth-less shape `rule.require.clamp-edge-cases` exists to catch.
 */
const asReportSentence = (error: Error): string =>
  (error.message.split('\n')[0] ?? '').replace(UNABRIDGED_PREFIX, '');

/**
 * .what = the three socket-report factories, each already invoked, paired with its name
 * .why  = a table, so a fourth socket factory is one row rather than a fourth copy of every
 *   assertion below
 */
const asSocketReports = () => [
  {
    name: 'asCloneSocketOmissionReasonError (pty-absent, supported)',
    error: asCloneSocketOmissionReasonError({
      socketOmissionReason: 'pty-absent',
      ptyPlatformSupport: 'supported',
      hostTuple: 'linux-x64',
      rhachetRealpath: '/opt/pnpm/global/node_modules/rhachet/dist/index.js',
    }),
  },
  {
    name: 'asCloneSocketOmissionReasonError (pty-absent, unsupported)',
    error: asCloneSocketOmissionReasonError({
      socketOmissionReason: 'pty-absent',
      ptyPlatformSupport: 'unsupported',
      hostTuple: 'freebsd-x64',
      rhachetRealpath: null,
    }),
  },
  {
    name: 'asCloneSocketOmissionReasonError (pty-absent, unknown)',
    error: asCloneSocketOmissionReasonError({
      socketOmissionReason: 'pty-absent',
      ptyPlatformSupport: 'unknown',
      hostTuple: 'linux-x64',
      rhachetRealpath: null,
    }),
  },
  {
    name: 'asCloneSocketOmissionReasonError (host-incapable)',
    error: asCloneSocketOmissionReasonError({
      socketOmissionReason: 'host-incapable',
      ptyPlatformSupport: 'unsupported',
      hostTuple: 'win32-x64',
      rhachetRealpath: null,
    }),
  },
  {
    name: 'asPtyDeviceRefusedError',
    error: asPtyDeviceRefusedError({
      error: new Error('posix_spawn failed: Resource temporarily unavailable'),
      hostTuple: 'linux-x64',
    }),
  },
  {
    name: 'asCloneSocketBindFaultError',
    error: asCloneSocketBindFaultError({
      error: Object.assign(new Error('bind EACCES'), {
        code: 'EACCES',
        syscall: 'bind',
      }),
      hostTuple: 'linux-x64',
    }),
  },
];

/**
 * .what = the install-report factory, which shares the `hint` row and no other
 */
const asInstallReports = () => [
  {
    name: 'asNpmInstallFailureError (permission-denied)',
    error: asNpmInstallFailureError({
      kind: 'permission-denied',
      target: 'global',
      packageManager: 'pnpm',
      exitCode: 1,
      output: 'ERR_PNPM_EACCES  EACCES: permission denied',
      packages: ['rhachet'],
      shellPresence: 'absent',
    }),
  },
  {
    name: 'asNpmInstallFailureError (timed-out)',
    error: asNpmInstallFailureError({
      kind: 'timed-out',
      target: 'local',
      packageManager: 'npm',
      exitCode: null,
      output: '',
      packages: ['rhachet'],
      shellPresence: 'absent',
    }),
  },
  {
    name: 'asNpmInstallFailureError (unclassified)',
    error: asNpmInstallFailureError({
      kind: 'unclassified',
      target: 'local',
      packageManager: 'pnpm',
      exitCode: 1,
      output: 'some failure we have never seen before',
      packages: ['rhachet'],
      shellPresence: 'present',
    }),
  },
];

describe('classifiedErrorVocabulary', () => {
  given(
    '[case1] every classified report this round added — socket AND install',
    () => {
      const reports = [...asSocketReports(), ...asInstallReports()];

      when('[t0] each is rendered', () => {
        // 🚨 THE PREFIX ROW — and it is the one row no snapshot can hold for us.
        //   a glyph without its class name is HALF a contract: the glyph is ungreppable and
        //   ambiguous, while the class name is the caller-vs-server signal. the render already
        //   holds the name at the moment it would drop it, so an omission is a REDACTION.
        //
        //   .the mutation that reddens this = render `<emoji> <message>` in any one factory,
        //   dropping the `<ClassName>: ` half
        then('every one renders the unabridged emoji + class prefix', () => {
          for (const report of reports)
            expect(report.error.message).toMatch(UNABRIDGED_PREFIX);
        });

        // ⚠️ the prefix is a PREFIX, never the report — a factory that rendered the prefix and
        //   an empty sentence would satisfy the row above and tell a human naught
        then('every one says a sentence past its prefix', () => {
          for (const report of reports)
            expect(asReportSentence(report.error).length).toBeGreaterThan(0);
        });

        // 🚨 THE ROW THAT BINDS ALL FOUR FACTORIES. a report with no hint states a symptom
        //   and stops (`rule.require.errors-name-the-fix`), and a fifth factory that forgets
        //   the field has, until now, had no peer to redden.
        //
        //   .the mutation that reddens this = drop `hint` from any one factory's metadata
        then('every one carries a non-empty hint', () => {
          for (const report of reports) {
            const meta = report.error as unknown as {
              metadata?: { hint?: unknown };
            };
            expect(typeof meta.metadata?.hint).toEqual('string');
            expect((meta.metadata?.hint as string).length).toBeGreaterThan(0);
          }
        });

        // ⚠️ a hint that merely restates the sentence names no move. the cheapest checkable
        //   proxy for "it names a move" is that it differs from the message it accompanies
        then('no hint merely restates its own message', () => {
          for (const report of reports) {
            const meta = report.error as unknown as {
              metadata?: { hint?: string };
            };
            expect(meta.metadata?.hint).not.toEqual(report.error.message);
          }
        });
      });
    },
  );

  given('[case2] the socket-report factories alone', () => {
    const reports = asSocketReports();

    when('[t0] each is rendered', () => {
      // 🚨 ONE stem for the whole set, so a human who has read one report greps one phrase
      //   to find every peer — and a reword in one factory cannot silently fork the set
      //   into two families.
      //
      //   .the mutation that reddens this = reword any socket factory's message prefix
      then('every message opens with the one shared stem', () => {
        for (const report of reports)
          expect(
            asReportSentence(report.error).startsWith(SOCKET_REPORT_STEM),
          ).toEqual(true);
      });

      // ⚠️ the stem is a PREFIX, never the whole sentence — each report must still say what
      //   is DISTINCT about it, or the set speaks one language and carries no information.
      //
      //   🚨 asserted as DISTINCTNESS rather than as non-emptiness. a length check reads like
      //   a clamp and is satisfied by any two identical tails, so it would pass on the exact
      //   collapse this row exists to catch.
      //
      //   .the mutation that reddens this = give any two socket factories the same sentence
      then('every message says something distinct past the stem', () => {
        const tails = reports.map((report) =>
          asReportSentence(report.error).replace(SOCKET_REPORT_STEM, ''),
        );
        for (const tail of tails) expect(tail.length).toBeGreaterThan(0);
        expect(new Set(tails).size).toEqual(tails.length);
      });

      // 🚨 `hostTuple`, never `platform` — the two are both plain `string` and sit at
      //   DIFFERENT grains (`linux-x64` vs `linux`), so an edit that wired the coarse one in
      //   would compile, pass, and silently degrade the diagnostic. the `-` is what parts them.
      //
      //   .the mutation that reddens this = rename `hostTuple` in any socket factory, or
      //   pass `process.platform` where the tuple belongs
      then('every one carries hostTuple at the platform-arch grain', () => {
        for (const report of reports) {
          const meta = report.error as unknown as {
            metadata?: { hostTuple?: unknown };
          };
          expect(typeof meta.metadata?.hostTuple).toEqual('string');
          expect(meta.metadata?.hostTuple as string).toContain('-');
        }
      });
    });
  });
});
