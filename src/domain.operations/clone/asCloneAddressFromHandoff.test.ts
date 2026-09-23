import { getError, given, then, when } from 'test-fns';

import { asCloneAddressFromHandoff } from './asCloneAddressFromHandoff';

/**
 * .what = unit coverage for the detached-enroll handoff parse
 * .why = a detached caller never spawns the clone itself, so this line is the ONLY
 *   account it has of what was stood up. every way the line can lie or go absent must
 *   produce a stated cause rather than a partial address
 */
describe('asCloneAddressFromHandoff', () => {
  given('[case1] a well-formed handoff', () => {
    const handoff = JSON.stringify({
      outcome: 'baked',
      serial: '0b7d14ca-1111-2222-3333-444455556666',
      slug: 'detachbake',
      socketEligible: true,
    });

    when('[t0] it is read', () => {
      then('the address trio and the outcome are returned', () => {
        expect(asCloneAddressFromHandoff({ handoff })).toEqual({
          serial: '0b7d14ca-1111-2222-3333-444455556666',
          slug: 'detachbake',
          socketEligible: true,
          outcome: 'baked',
        });
      });
    });
  });

  given('[case8] a handoff for a REUSED live slug', () => {
    // 🔴 the row a human watches this command for: a reuse spawned no billed brain, so
    //   the caller must render a reuse rather than an enroll. the detach branch fires
    //   before the live-slug check, so this field is the caller's ONLY account of it
    const handoff = JSON.stringify({
      outcome: 'reused',
      serial: 'c'.repeat(36),
      slug: 'driver',
      socketEligible: true,
    });

    when('[t0] it is read', () => {
      then('the outcome reads REUSED', () => {
        expect(asCloneAddressFromHandoff({ handoff }).outcome).toEqual(
          'reused',
        );
      });
    });
  });

  given('[case9] a handoff whose outcome this build does not know', () => {
    // an older or newer host may name an outcome outside the closed set. the render
    // branches on `=== 'reused'`, so an unknown value must fall to the GENERIC
    // breadcrumb — never be guessed into the reuse line, which would claim no brain
    // was spawned when one may have been
    const handoff = JSON.stringify({
      outcome: 'resurrected',
      serial: 'd'.repeat(36),
      socketEligible: true,
    });

    when('[t0] it is read', () => {
      then('the outcome reads null, never a guess', () => {
        expect(asCloneAddressFromHandoff({ handoff }).outcome).toEqual(null);
      });
    });
  });

  given('[case10] a handoff that carries no outcome at all', () => {
    const handoff = JSON.stringify({
      serial: 'e'.repeat(36),
      socketEligible: true,
    });

    when('[t0] it is read', () => {
      then('the outcome reads null', () => {
        expect(asCloneAddressFromHandoff({ handoff }).outcome).toEqual(null);
      });
    });
  });

  given('[case2] a handoff for an unslugged clone', () => {
    const handoff = JSON.stringify({
      serial: '2ad45a54-1111-2222-3333-444455556666',
      socketEligible: true,
    });

    when('[t0] it is read', () => {
      then('the absent slug reads as null, never as a fabricated name', () => {
        expect(asCloneAddressFromHandoff({ handoff }).slug).toEqual(null);
      });
    });
  });

  given('[case3] a handoff whose socketEligible flag is absent', () => {
    const handoff = JSON.stringify({ serial: 'a'.repeat(36) });

    when('[t0] it is read', () => {
      // 🔴 the one lie this render must never tell is "reachable" on a field the host
      //   never sent — a caller would then `say` into a clone that has no socket
      then('reach reads FALSE, never a permissive default', () => {
        expect(asCloneAddressFromHandoff({ handoff }).socketEligible).toEqual(
          false,
        );
      });
    });
  });

  given(
    '[case4] a handoff whose socketEligible is a truthy non-boolean',
    () => {
      const handoff = JSON.stringify({
        serial: 'a'.repeat(36),
        socketEligible: 'yes',
      });

      when('[t0] it is read', () => {
        // the check is `=== true`, so a string that a loose read would accept is refused —
        // a host on an older shape must not be read as a promise of reach
        then(
          'reach reads FALSE — only a real boolean true promises reach',
          () => {
            expect(
              asCloneAddressFromHandoff({ handoff }).socketEligible,
            ).toEqual(false);
          },
        );
      });
    },
  );

  given('[case5] a line that is not json at all', () => {
    // the host's stdout carries its own boot noise; a line picked up by mistake lands here
    const handoff = 'ready serial=abc';

    when('[t0] it is read', () => {
      then('it fails LOUD and names the cause', () => {
        const error = getError(() => asCloneAddressFromHandoff({ handoff }));
        expect(error.message).toContain('not a json handoff');
      });
    });
  });

  given('[case6] valid json that is not an object', () => {
    const handoff = '"just a string"';

    when('[t0] it is read', () => {
      then('it fails LOUD and names the cause', () => {
        const error = getError(() => asCloneAddressFromHandoff({ handoff }));
        expect(error.message).toContain('not a json object');
      });
    });
  });

  given('[case7] a json object with no serial', () => {
    const handoff = JSON.stringify({ outcome: 'baked', socketEligible: true });

    when('[t0] it is read', () => {
      // a serial is the clone's primary ref — an address with no serial addresses no one,
      // so a partial return would hand the caller an unusable handle
      then('it fails LOUD rather than return a partial address', () => {
        const error = getError(() => asCloneAddressFromHandoff({ handoff }));
        expect(error.message).toContain('carries no serial');
      });
    });
  });
});
