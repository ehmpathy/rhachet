import { given, then, when } from 'test-fns';

import { asLibcFromReport } from './asLibcFromReport';

/**
 * .what = pin that an UNREADABLE report reads as `unreadable`, never as musl
 *
 * .note = node names a runtime glibc version only on glibc, so a naive probe reads that
 *   field's absence as musl
 *
 * .note = the report is an INPUT to the cast, never read from `process` inside it — which
 *   is what makes the `unreadable` row reachable from a host that always emits one
 */

/**
 * .what = the fields of a real node report this cast reads, as observed on a glibc host
 * .why  = a REAL shape, so a drift in the witness field's name reddens here
 */
const REPORT_GLIBC = {
  header: {
    nodejsVersion: 'v22.21.0',
    glibcVersionRuntime: '2.39',
    glibcVersionCompiler: '2.28',
    osName: 'Linux',
    arch: 'x64',
    platform: 'linux',
  },
};

/** the same report as a musl host emits it — populated, minus the two glibc fields */
const REPORT_MUSL = {
  header: {
    nodejsVersion: 'v22.21.0',
    osName: 'Linux',
    arch: 'x64',
    platform: 'linux',
  },
};

describe('asLibcFromReport', () => {
  given('[case1] a populated report from a glibc host', () => {
    when('[t0] it is cast', () => {
      then('it reads glibc', () => {
        expect(asLibcFromReport({ report: REPORT_GLIBC })).toBe('glibc');
      });
    });
  });

  given('[case2] a populated report from a musl host', () => {
    when('[t0] it is cast', () => {
      then(
        'it reads musl — the glibc field is absent from a report we CAN read',
        () => {
          // the witness (`nodejsVersion`) is present, so the absent glibc field is
          // evidence about the host
          expect(asLibcFromReport({ report: REPORT_MUSL })).toBe('musl');
        },
      );
    });
  });

  given(
    '[case3] a report we cannot read — the row that produced the defect',
    () => {
      /**
       * every shape that fails the witness test. each lacks `glibcVersionRuntime` exactly
       * as a musl report does, so each must read `unreadable` rather than musl
       */
      const UNREADABLE = [
        {
          slug: 'absent report (a runtime that ships none)',
          report: undefined,
        },
        {
          slug: 'null report',
          report: null,
        },
        {
          slug: 'report with no header at all',
          report: {},
        },
        {
          slug: 'blanked header (a sandbox that empties it)',
          report: { header: {} },
        },
        {
          slug: 'header present but the witness field renamed',
          report: { header: { nodeVersion: 'v22.21.0', osName: 'Linux' } },
        },
        {
          slug: 'witness present but not a string',
          report: { header: { nodejsVersion: 22, osName: 'Linux' } },
        },
        {
          slug: 'report is not an object at all',
          report: 'not a report',
        },
      ] as const;

      when('[t0] each unreadable shape is cast', () => {
        then('every one reads unreadable — none is mistaken for musl', () => {
          UNREADABLE.forEach((each) => {
            expect({ slug: each.slug, libc: asLibcFromReport(each) }).toEqual({
              slug: each.slug,
              libc: 'unreadable',
            });
          });
        });

        then('and the cast never throws on a drifted shape', () => {
          // a throw would turn an ambient report drift into a hard failure of `rhx enroll`
          UNREADABLE.forEach((each) => {
            expect(() => asLibcFromReport(each)).not.toThrow();
          });
        });
      });
    },
  );

  given('[case4] the glibc marker present but the witness absent', () => {
    when('[t0] it is cast', () => {
      then(
        'it reads unreadable — a report that cannot name node is evidence of naught',
        () => {
          // the glibc field alone earns no verdict: a header that cannot name node is not
          // a header this cast reads
          expect(
            asLibcFromReport({
              report: { header: { glibcVersionRuntime: '2.39' } },
            }),
          ).toBe('unreadable');
        },
      );
    });
  });
});
