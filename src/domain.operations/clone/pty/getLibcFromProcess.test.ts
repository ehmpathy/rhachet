import { given, then, when } from 'test-fns';

import { getLibcFromProcess } from './getLibcFromProcess';

/**
 * .what = clamps the ALLOWLIST half of `getLibcFromProcess` — which throws earn an
 *   `unreadable`, and which are rethrown in full
 *
 * 🚨 .why the allowlist is owed at all = this read runs INLINE while
 *   `asCloneSocketOmissionReasonError` composes a classified report, so a bare
 *   `catch { return undefined }` would report OUR OWN DEFECT to the human as a fact
 *   about their host's libc — a diagnosis fabricated out of a bug
 *   (`rule.forbid.failhide`). raised by the r002 `mech-failhides` lane at i076.
 *
 * ⚠️ every row drives the INJECTED reader, because `getReport()` cannot be made to fault
 *   on demand. the ambient path is clamped by
 *   `getPtyPlatformSupport.integration.test.ts`, which runs the real probe.
 */
describe('getLibcFromProcess', () => {
  given('[case1] a probe that THROWS', () => {
    when('[t0] the throw is a node-raised report fault', () => {
      then('it degrades to `unreadable` — the report must survive', () => {
        /**
         * 🚨 the caller is mid-render of the one message a human on a broken install
         *   reads. a throw that escaped here would replace that message with a raw
         *   stack, so the probe would have deleted what it exists to enrich.
         */
        const read = (): unknown => {
          throw Object.assign(new Error('report synthesis failed'), {
            code: 'ERR_SYNTHETIC',
          });
        };
        expect(getLibcFromProcess({ read })).toEqual('unreadable');
      });

      then('a code no enumeration anticipated degrades too', () => {
        // the guard is a SHAPE, never a list of known codes — a second `ERR_*` the
        // author never saw must land on the same side
        const read = (): unknown => {
          throw Object.assign(new Error('out of memory'), {
            code: 'ERR_WORKER_OUT_OF_MEMORY',
          });
        };
        expect(getLibcFromProcess({ read })).toEqual('unreadable');
      });
    });

    when('[t1] the throw is a DEFECT', () => {
      then('an UNCODED error is rethrown, never nulled', () => {
        /**
         * 🚨 the row with teeth, and the one the bare catch failed. a `TypeError` from
         *   a broken code path of ours is not evidence about the host's libc — to
         *   answer it with `unreadable` is to invent a diagnosis. the mutation that
         *   reddens this: the catch back to a bare `catch { return undefined }`.
         */
        const read = (): unknown => {
          throw new TypeError('getReport is not a function');
        };
        expect(() => getLibcFromProcess({ read })).toThrow(TypeError);
      });

      then('a NON-`ERR_` string code is rethrown too', () => {
        /**
         * ⚠️ the predicate's own boundary. its peer `getRhachetRealpathFromProcess`
         *   records that node stamps a bare string `code` on families far outside the
         *   one a guard means to catch, so `typeof code === 'string'` alone would
         *   swallow a library's own defect. the prefix is what parts them.
         */
        const read = (): unknown => {
          throw Object.assign(new Error('probe misconfigured'), {
            code: 'EPROBE',
          });
        };
        expect(() => getLibcFromProcess({ read })).toThrow(
          'probe misconfigured',
        );
      });

      then('a thrown NON-error is rethrown rather than read for a code', () => {
        // the predicate must not fault on a value with no property bag at all
        const read = (): unknown => {
          throw 'a bare string';
        };
        expect(() => getLibcFromProcess({ read })).toThrow('a bare string');
      });
    });
  });

  given('[case2] a probe that RETURNS', () => {
    when('[t0] the report is legible', () => {
      then('a glibc report reads glibc — the guard eats no happy path', () => {
        const read = (): unknown => ({
          header: { nodejsVersion: 'v22.21.0', glibcVersionRuntime: '2.39' },
        });
        expect(getLibcFromProcess({ read })).toEqual('glibc');
      });

      then('a populated report with no glibc marker reads musl', () => {
        const read = (): unknown => ({
          header: { nodejsVersion: 'v22.21.0' },
        });
        expect(getLibcFromProcess({ read })).toEqual('musl');
      });
    });

    when('[t1] the runtime ships no report at all', () => {
      then('an `undefined` return reads `unreadable`, with no throw', () => {
        // the optional-chain path, which predates the allowlist and must survive it
        expect(getLibcFromProcess({ read: () => undefined })).toEqual(
          'unreadable',
        );
      });
    });
  });
});
