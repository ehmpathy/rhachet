import { given, then, when } from 'test-fns';

import { asCloneAddressHuman } from './asCloneAddressHuman';

describe('asCloneAddressHuman', () => {
  given('[case1] a NAMED clone', () => {
    when('[t0] the address is composed', () => {
      then('the slug wins, under the `@:` clone sigil', () => {
        expect(
          asCloneAddressHuman({
            slug: 'super',
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          }),
        ).toEqual('@:super');
      });

      then('the serial appears in NEITHER form, long or short', () => {
        /**
         * 🚨 asserted as an absence of BOTH forms. a clamp on the 36-char serial alone
         *   would pass even if the value leaked the 8-hex prefix, since the prefix is a
         *   different string — so a slug/serial precedence slip would go uncaught in the
         *   one direction that matters.
         */
        const address = asCloneAddressHuman({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
        });
        expect(address).not.toContain('7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b');
        expect(address).not.toContain('7f3a1b2c');
      });
    });
  });

  given('[case2] an UNNAMED clone', () => {
    when('[t0] the address is composed', () => {
      then('the SHORT serial is rendered — the typable form', () => {
        /**
         * 🚨 the address a human is handed must be the address a human can type. a full
         *   36-char uuid is longer to read, longer to type, and NO more reachable —
         *   `getOneCloneByRef` resolves any hex body of 4+ chars back to the clone
         *   (`rule.require.short-serial-for-unslugged-clones`).
         */
        expect(
          asCloneAddressHuman({
            slug: null,
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          }),
        ).toEqual('@:7f3a1b2c');
      });

      then('the FULL uuid never reaches the screen', () => {
        // the paired negative — the tail segments are the part a human would have had
        // to copy, and they are what the abbreviation exists to spare them
        expect(
          asCloneAddressHuman({
            slug: null,
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          }),
        ).not.toContain('4d5e-6f70-8a9b-0c1d2e3f4a5b');
      });
    });
  });

  given(
    '[case3] the sigil, which the value owns rather than its callers',
    () => {
      when('[t0] either branch is composed', () => {
        then('BOTH branches carry `@:`, the clone-grain marker', () => {
          /**
           * 🚨 .why the sigil is inside = `@:` marks the CLONE grain, as against `@` for an
           *   actor (`define.address-sigils`). were it left to the caller, six call sites
           *   would each re-add it and the one that forgot would emit an address of the
           *   WRONG GRAIN — the exact confusion `enroll-to-reach.journey` [t2] catches at
           *   the acceptance tier, reached here for a fraction of the cost.
           */
          const named = asCloneAddressHuman({
            slug: 'super',
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          });
          const unnamed = asCloneAddressHuman({
            slug: null,
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          });
          expect(named.startsWith('@:')).toEqual(true);
          expect(unnamed.startsWith('@:')).toEqual(true);
        });

        then(
          'the sigil appears exactly ONCE — never doubled by a caller',
          () => {
            /**
             * ⚠️ the migration hazard this row guards: every call site that adopts this
             *   transformer previously wrote its own `@:` prefix. one that keeps the prefix
             *   AND calls this would emit `@:@:super`, which no snapshot of a happy path
             *   would necessarily catch on a slug the reader skims past.
             */
            const address = asCloneAddressHuman({
              slug: 'super',
              serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
            });
            /**
             * ⚠️ the DOUBLED form is asserted absent, never an occurrence count. a
             *   `split('@:').length - 1` states the same property as an arithmetic a
             *   reader must simulate (`rule.forbid.inline-decode-friction`), and it is
             *   no stronger: this value composes `'@:' + body`, so a caller that keeps
             *   its own prefix yields two ADJACENT sigils, and no other doubled shape is
             *   reachable. the row's failure now names the defect rather than a number.
             */
            expect(address).not.toContain('@:@:');
          },
        );
      });
    },
  );
});
